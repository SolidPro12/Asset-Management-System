import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const getInitials = (name = '') =>
  name
    .split(' ')
    .map(n => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

const roleDisplayMap: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  financer: 'Finance Admin',
  hr: 'HR',
  user: 'User',
};

export default function UserMenu() {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const load = async () => {
      try {
        // try to load full name from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!mounted) return;

        setProfileName(profile?.full_name ?? null);
        setRole(userRole?.role ?? null);
      } catch (e) {
        // silently ignore, fallback to user metadata / email
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user]);

  const displayName =
    profileName ||
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'User';

  const roleLabel = role ? roleDisplayMap[role] || role : 'User';

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{loading ? 'Loading...' : displayName}</span>
        <span className="text-xs text-muted-foreground">
          {loading ? '' : roleLabel}
        </span>
      </div>
    </div>
  );
}