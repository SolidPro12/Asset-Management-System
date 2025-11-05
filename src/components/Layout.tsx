import { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Bell, User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/assets') return 'Assets';
    if (path === '/allocations') return 'Asset Allocations';
    if (path === '/requests') return 'Asset Requests';
    if (path === '/history') return 'Asset History & Maintenance';
    if (path === '/service') return 'Service Records';
    if (path === '/users') return 'Users';
    if (path === '/profile') return 'Profile';
    return '';
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .eq('id', user.id)
      .single();
    
    setProfile(data);
  };

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'financer':
        return 'Finance Admin';
      case 'hr':
        return 'HR';
      default:
        return 'User';
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const roleLabel = getRoleDisplayName(profile?.user_roles?.[0]?.role);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  {location.pathname !== '/' && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            
            <div className="flex items-center gap-2">
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

                      {/* Always show role directly under email */}
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>{roleLabel}</span>
                      </p>

                      {/* If you still want the separate block only when roles exist, keep the conditional too.
                          The line above ensures role always appears under the email. */}
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