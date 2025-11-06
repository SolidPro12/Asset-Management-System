import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X } from 'lucide-react';

interface Profile {
  id?: string;
  full_name: string;
  email: string;
  department: string | null;
  phone: string | null;
}

const getRoleDisplayName = (role: string) => {
  const roleMap: { [key: string]: string } = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    financer: 'Finance Admin',
    hr: 'HR',
    user: 'User',
  };
  return roleMap[role] || role;
};

const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
  if (role === 'super_admin') return 'destructive';
  if (role === 'admin') return 'default';
  return 'secondary';
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);

  // edit state
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserRole();
    } else {
      setProfile(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setNameInput(data.full_name ?? '');
      }
    } catch (err) {
      console.error('fetchProfile error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserRole(data.role);
      }
    } catch (err) {
      console.error('fetchUserRole error', err);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      alert('Full name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', profile.id || user?.id)
        .select()
        .single();

      if (error) {
        console.error('update profile error', error);
        alert(error.message || 'Failed to save changes');
      } else {
        setProfile(prev => prev ? { ...prev, full_name: trimmed } : prev);
        setIsEditing(false);
        try { await supabase.auth.updateUser({ data: { full_name: trimmed } }); } catch {}
        try { window.dispatchEvent(new CustomEvent('profile-updated', { detail: { full_name: trimmed } })); } catch {}
        alert('Profile updated');
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNameInput(profile?.full_name ?? '');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {profile.full_name}
              </h1>
              <p className="text-sm text-muted-foreground mb-3">
                {profile.email}
              </p>
              <div className="flex gap-2">
                <Badge variant={getRoleBadgeVariant(userRole)}>
                  {getRoleDisplayName(userRole)}
                </Badge>
                {profile.department && (
                  <Badge variant="outline" className="bg-muted">
                    {profile.department}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">Profile Information</CardTitle>
            </div>

            {!isEditing ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setIsEditing(true); setNameInput(profile.full_name); }}>
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="gap-2" onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                readOnly={!isEditing}
                className={!isEditing ? 'bg-muted/50' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                value={profile.email}
                readOnly
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">
                Department
              </Label>
              <Input
                id="department"
                value={profile.department || 'Not assigned'}
                readOnly
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                Role
              </Label>
              <Input
                id="role"
                value={getRoleDisplayName(userRole)}
                readOnly
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Role cannot be changed. Contact your administrator if you need different permissions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;