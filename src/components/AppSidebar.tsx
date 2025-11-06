import { Home, Package, FileText, History, Users, UserCheck, ChevronDown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: Home, requiredRole: null },
  { title: 'Assets', url: '/assets', icon: Package, requiredRole: null },
  { title: 'Asset Allocations', url: '/allocations', icon: UserCheck, requiredRole: null },
  { title: 'Asset Requests', url: '/requests', icon: FileText, requiredRole: null },
  { 
    title: 'History', 
    icon: History, 
    requiredRole: null,
    subItems: [
      { title: 'Asset History', url: '/history?tab=asset-history' },
      { title: 'Service History', url: '/history?tab=service-history' },
    ]
  },
  { title: 'Users', url: '/users', icon: Users, requiredRole: 'super_admin' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const currentPath = location.pathname;

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setUserRole(data?.role || null);
  };

  const isActive = (path: string) => currentPath === path;

  const visibleMenuItems = menuItems.filter((item) => {
    // HR role can only see Dashboard and Asset Requests
    if (userRole === 'hr') {
      return item.title === 'Dashboard' || item.title === 'Asset Requests';
    }
    // For other roles, apply the existing requiredRole logic
    return !item.requiredRole || item.requiredRole === userRole;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sidebar-primary rounded-lg -ml-1">
            <Package className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {state === 'expanded' && (
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-sidebar-foreground">Solidpro</h2>
              <p className="text-xs text-sidebar-foreground/60">Asset Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                if (item.subItems) {
                  return (
                    <Collapsible key={item.title} defaultOpen={currentPath === '/history'} asChild>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={currentPath === '/history'}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={currentPath + location.search === subItem.url}>
                                  <NavLink to={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url!)}>
                      <NavLink to={item.url!}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
