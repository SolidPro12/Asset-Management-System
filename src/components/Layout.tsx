import React, { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { RecentActions } from '@/components/RecentActions';
import { Bell, User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const breadcrumbs: Array<{ label: string; path?: string }> = [];

    // Always start with Dashboard
    breadcrumbs.push({ label: 'Dashboard', path: '/' });

    // Handle different routes
    if (path === '/') {
      // Dashboard - only show Dashboard
      return breadcrumbs.slice(0, 1);
    } else if (path === '/assets') {
      breadcrumbs.push({ label: 'Assets' });
    } else if (path === '/my-assets') {
      breadcrumbs.push({ label: 'My Assets' });
    } else if (path === '/allocations') {
      breadcrumbs.push({ label: 'Asset Allocations' });
    } else if (path === '/requests') {
      breadcrumbs.push({ label: 'Asset Requests' });
    } else if (path === '/my-tickets') {
      breadcrumbs.push({ label: 'Service Desk' });
      breadcrumbs.push({ label: 'My Tickets' });
    } else if (path === '/ticket-queue') {
      breadcrumbs.push({ label: 'Service Desk' });
      breadcrumbs.push({ label: 'Ticket Queue' });
    } else if (path === '/history') {
      breadcrumbs.push({ label: 'History' });
      breadcrumbs.push({ label: 'Asset History' });
    } else if (path === '/service-history') {
      breadcrumbs.push({ label: 'History' });
      breadcrumbs.push({ label: 'Service History' });
    } else if (path === '/users') {
      breadcrumbs.push({ label: 'Users' });
    } else if (path === '/profile') {
      breadcrumbs.push({ label: 'Profile' });
    } else if (path === '/settings') {
      breadcrumbs.push({ label: 'Settings' });
    } else {
      // Unknown route - just show Dashboard and the path
      const pathParts = path.split('/').filter(Boolean);
      pathParts.forEach((part, index) => {
        const fullPath = '/' + pathParts.slice(0, index + 1).join('/');
        const label = part
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        if (index === pathParts.length - 1) {
          breadcrumbs.push({ label });
        } else {
          breadcrumbs.push({ label, path: fullPath });
        }
      });
    }

    return breadcrumbs;
  };

  useEffect(() => {
    if (user) {
      // fetch role first (authoritative), then profile
      fetchUserRole();
      fetchProfile();
    } else {
      setProfile(null);
      setUserRole(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;
    try {
      // Query user_roles table directly for reliable result
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (error) {
        // if no role row, keep null (will fallback later)
        console.debug('fetchUserRole error', error.message ?? error);
        setUserRole(null);
      } else {
        setUserRole((data as any)?.role ?? null);
      }
    } catch (err) {
      console.error('fetchUserRole unexpected', err);
      setUserRole(null);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_roles(role)')
        .eq('id', user.id)
        .single();

      if (error) {
        console.debug('fetchProfile error', error.message ?? error);
        setProfile(null);
      } else {
        setProfile(data);
        // if role wasn't found earlier, try to use joined relation
        if (!userRole) {
          const joinedRole = (data as any)?.user_roles?.[0]?.role;
          if (joinedRole) setUserRole(joinedRole);
        }
      }
    } catch (err) {
      console.error('fetchProfile unexpected', err);
      setProfile(null);
    }
  };

  // Subscribe to realtime profile updates so header reflects changes immediately
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`realtime:profiles:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          setProfile((prev: any) => ({ ...(prev || {}), ...(payload.new as any) }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fallback: update profile from custom event dispatched by Profile page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setProfile((prev: any) => ({ ...(prev || {}), ...detail }));
      fetchProfile();
    };
    window.addEventListener('profile-updated', handler as EventListener);
    return () => window.removeEventListener('profile-updated', handler as EventListener);
  }, []);

  const getRoleDisplayName = (role?: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'financer':
        return 'Finance Admin';
      case 'hr':
        return 'HR';
      case 'department_head':
      case 'department head':
        return 'Department Head';
      default:
        return 'User';
    }
  };

  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    (user?.email ? user.email.split('@')[0] : 'User');

  const roleLabel = getRoleDisplayName(userRole ?? (profile as any)?.user_roles?.[0]?.role ?? null);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <SidebarTrigger />
              <Breadcrumb>
                <BreadcrumbList>
                  {(() => {
                    const breadcrumbs = getBreadcrumbs();
                    return breadcrumbs.map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 1;
                      return (
                        <React.Fragment key={index}>
                          {index > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {isLast || !crumb.path ? (
                              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link to={crumb.path}>{crumb.label}</Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </React.Fragment>
                      );
                    });
                  })()}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-2">
              <RecentActions />
              
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
              </Button>

              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-auto py-2">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {roleLabel}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">
                        {displayName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.email || user?.email}
                      </p>

                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>{roleLabel}</span>
                      </p>
                    </div>

                    <div className="border-t pt-3 space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm h-9"
                        onClick={() => {
                          setIsPopoverOpen(false);
                          navigate('/profile');
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                      {(userRole === 'super_admin' || userRole === 'admin') && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm h-9"
                          onClick={() => {
                            setIsPopoverOpen(false);
                            navigate('/settings');
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          setIsPopoverOpen(false);
                          await signOut();
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log out
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}