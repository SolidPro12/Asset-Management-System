import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, LogIn, LogOut, Edit, Eye, Package, FileText, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata: any;
  entity_type: string | null;
  entity_id: string | null;
}

const ActivityLog = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <LogIn className="h-4 w-4 text-green-600" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-orange-600" />;
      case 'profile_updated':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'password_changed':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'asset_viewed':
        return <Eye className="h-4 w-4 text-gray-600" />;
      case 'asset_assigned':
      case 'asset_returned':
        return <Package className="h-4 w-4 text-primary" />;
      case 'ticket_created':
      case 'ticket_updated':
        return <FileText className="h-4 w-4 text-yellow-600" />;
      default:
        return <Settings className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'default';
      case 'logout':
        return 'secondary';
      case 'profile_updated':
      case 'password_changed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatActivityType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/profile">Profile</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Activity Log</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Activity
            </CardTitle>
            <CardDescription>
              View your recent account activity and security events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No activity recorded yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {getActivityIcon(activity.activity_type)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatActivityType(activity.activity_type)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {activity.description}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActivityColor(activity.activity_type) as any}>
                            {formatActivityType(activity.activity_type)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityLog;
