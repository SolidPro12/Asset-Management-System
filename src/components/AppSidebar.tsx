import { Home, Package, FileText, History, Users, UserCheck, ChevronDown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import React from 'react';
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
  SidebarSeparator,
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
  { title: 'My Asset', url: '/my-assets', icon: Package, requiredRole: null },
  { title: 'Assets', url: '/assets', icon: Package, requiredRole: null },
  { title: 'Asset Allocations', url: '/allocations', icon: UserCheck, requiredRole: null },
  { title: 'Asset Requests', url: '/requests', icon: FileText, requiredRole: null },
  { 
    title: 'Service Desk', 
    icon: FileText, 
    requiredRole: null,
    subItems: [
      { title: 'My Tickets', url: '/my-tickets', requiredRole: null },
      { title: 'Ticket Queue', url: '/ticket-queue', requiredRole: 'admin' },
    ]
  },
  { 
    title: 'History', 
    icon: History, 
    requiredRole: null,
    subItems: [
      { title: 'Asset History', url: '/history' },
      { title: 'Service History', url: '/service-history' },
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

  const visibleMenuItems = (() => {
    if (userRole === 'hr') {
      // Only show these for HR (order: Dashboard, My Asset, Asset Requests, then Service Desk with My Tickets)
      return [
        menuItems.find((item) => item.title === 'Dashboard'),
        menuItems.find((item) => item.title === 'My Asset'),
        menuItems.find((item) => item.title === 'Asset Requests'),
        {
          title: 'Service Desk',
          icon: FileText,
          requiredRole: null,
          subItems: [
            { title: 'My Tickets', url: '/my-tickets', requiredRole: null },
          ],
        },
      ].filter(Boolean);
    }
    if (userRole === 'financer') {
      return menuItems.filter(item => item.title === 'Dashboard' || item.title === 'Assets');
    }
    if (userRole === 'user') {
      // Only show Dashboard, My Asset, and Service Desk - My Tickets for user role
      return [
        menuItems.find((item) => item.title === 'Dashboard'),
        menuItems.find((item) => item.title === 'My Asset'),
        {
          title: 'Service Desk',
          icon: FileText,
          requiredRole: null,
          subItems: [
            { title: 'My Tickets', url: '/my-tickets', requiredRole: null },
          ],
        },
      ].filter(Boolean);
    }
    // Other roles: original logic
    return menuItems.filter((item) => !item.requiredRole || item.requiredRole === userRole).map((item) => {
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter((subItem) => {
          if (!subItem.requiredRole) return true;
          if (subItem.requiredRole === 'admin') {
            return userRole === 'super_admin' || userRole === 'admin';
          }
          return subItem.requiredRole === userRole;
        });
        return { ...item, subItems: filteredSubItems };
      }
      return item;
    });
  })();

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
              {visibleMenuItems.map((item, index) => {
                const isServiceDesk = item.title === 'Service Desk';
                const showSeparator = isServiceDesk && index > 0;
                
                return (
                  <React.Fragment key={item.title || index}>
                    {showSeparator && <SidebarSeparator className="my-2" />}
                    {item.subItems ? (
                      (() => {
                        const isGroupActive = item.subItems.some((subItem: any) => currentPath === subItem.url);
                        return (
                          <Collapsible key={item.title} defaultOpen={isGroupActive} asChild>
                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton isActive={isGroupActive}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {item.subItems.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SidebarMenuSubButton asChild isActive={currentPath === subItem.url}>
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
                      })()
                    ) : (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive(item.url!)}>
                          <NavLink to={item.url!}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </React.Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
