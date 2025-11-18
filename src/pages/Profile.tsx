import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Edit, Save, X, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { Link } from 'react-router-dom';

interface Profile {
  id?: string;
  full_name: string;
  email: string;
  department: string | null;
  phone: string | null;
  employee_id?: string | null;
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

  // password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

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
    if (!/^[A-Za-z ]+$/.test(trimmed)) {
      alert('Full name must contain only letters and spaces');
      return;
    }
    if (trimmed.length > 25) {
      alert('Full name must be at most 25 characters');
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const passwordSchema = z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

    const result = passwordSchema.safeParse(newPassword);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setChangingPassword(true);
    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        // Log password change activity
        try {
          await supabase.from("user_activity_log").insert({
            user_id: user?.id,
            activity_type: "profile_updated",
            description: "Password changed",
            metadata: { timestamp: new Date().toISOString(), action: 'password_change' },
          });
        } catch (logError) {
          console.error("Failed to log password change:", logError);
        }

        toast.success('Password updated successfully!');
        setIsChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
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
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Profile</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

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
              <div className="flex gap-2 flex-wrap">
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
            <Link to="/activity-log">
              <Button variant="outline" size="sm" className="gap-2">
                <Shield className="h-4 w-4" />
                Activity Log
              </Button>
            </Link>
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
                onChange={(e) => {
                  const raw = e.target.value || '';
                  const filtered = raw.replace(/[^A-Za-z ]/g, '').slice(0, 25);
                  setNameInput(filtered);
                }}
                readOnly={!isEditing}
                className={isEditing ? 'bg-white' : 'bg-muted/50'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId" className="text-sm font-medium">
                Employee ID
              </Label>
              <Input
                id="employeeId"
                value={profile.employee_id || 'Not assigned'}
                readOnly
                className="bg-muted/50"
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

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              {!isChangingPassword && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Change
                </Button>
              )}
            </div>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isChangingPassword ? (
              <p className="text-sm text-muted-foreground">
                Click "Change" to update your password
              </p>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  <PasswordStrengthMeter password={newPassword} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={changingPassword}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleCancelPasswordChange}
                    disabled={changingPassword}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;