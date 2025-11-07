import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, CheckCircle, AlertCircle, Wrench, FileText, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface DashboardStats {
  totalAssets: number;
  availableAssets: number;
  assignedAssets: number;
  maintenanceAssets: number;
  pendingRequests: number;
  approvedRequests: number;
  inProgressRequests: number;
  myRequests: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    availableAssets: 0,
    assignedAssets: 0,
    maintenanceAssets: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    inProgressRequests: 0,
    myRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [approvedAssets, setApprovedAssets] = useState<any[]>([]);
  const [approvedRequestsList, setApprovedRequestsList] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (userRole) {
      if (userRole === 'hr') {
        fetchHRDashboardData();
      } else {
        fetchDashboardStats();
      }
    }
  }, [userRole]);

  const checkUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setUserRole(data?.role || null);
  };

  const fetchHRDashboardData = async () => {
    try {
      if (!user) return;

      // Fetch my requests
      const { data: myRequestsData } = await supabase
        .from('asset_requests')
        .select('*, profiles:requester_id(full_name, department)')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (myRequestsData) {
        setMyRequests(myRequestsData);
      }

      // Organization-wide request status counts for HR dashboard cards
      const { data: allRequests } = await supabase
        .from('asset_requests')
        .select('status');

      if (allRequests) {
        const pendingApprovalAll = allRequests.filter(r => r.status === 'pending').length;
        const approvedAll = allRequests.filter(r => r.status === 'approved').length;
        const inProgressAll = allRequests.filter(r => r.status === 'in_progress').length;

        setStats(prev => ({
          ...prev,
          totalAssets: allRequests.length,
          pendingRequests: pendingApprovalAll,
          approvedRequests: approvedAll,
          inProgressRequests: inProgressAll,
        }));
      }

      // Fetch approved assets allocated to user
      const { data: allocationsData } = await supabase
        .from('asset_allocations')
        .select('*, assets:asset_id(asset_name, category)')
        .eq('status', 'active')
        .order('allocated_date', { ascending: false });

      if (allocationsData) {
        setApprovedAssets(allocationsData);
      }

      // Fetch all approved asset requests for table display
      const { data: approvedReqsData } = await supabase
        .from('asset_requests')
        .select('*, profiles:requester_id(full_name, department)')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      if (approvedReqsData) {
        setApprovedRequestsList(approvedReqsData);
      }
    } catch (error) {
      console.error('Error fetching HR dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch asset statistics
      const { data: assets } = await supabase
        .from('assets')
        .select('status');

      // Fetch request statistics
      const { data: requests } = await supabase
        .from('asset_requests')
        .select('status, requester_id');

      if (assets) {
        const totalAssets = assets.length;
        const availableAssets = assets.filter(a => a.status === 'available').length;
        const assignedAssets = assets.filter(a => a.status === 'assigned').length;
        const maintenanceAssets = assets.filter(a => a.status === 'under_maintenance').length;

        setStats(prev => ({
          ...prev,
          totalAssets,
          availableAssets,
          assignedAssets,
          maintenanceAssets,
        }));
      }

      if (requests) {
        const pendingRequests = requests.filter(r => r.status === 'pending').length;
        const approvedRequests = requests.filter(r => r.status === 'approved').length;
        const inProgressRequests = requests.filter(r => r.status === 'in_progress').length;
        const myRequests = user ? requests.filter(r => r.requester_id === user.id).length : 0;

        setStats(prev => ({
          ...prev,
          pendingRequests,
          approvedRequests,
          inProgressRequests,
          myRequests,
        }));
      }
    } catch (error: any) {
      // Generic error message - details not exposed to user
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Assets',
      value: stats.totalAssets,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'My Requests',
      value: stats.myRequests,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Available',
      value: stats.availableAssets,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Assigned',
      value: stats.assignedAssets,
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Under Maintenance',
      value: stats.maintenanceAssets,
      icon: Wrench,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Pending Requests',
      value: stats.pendingRequests,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Approved Requests',
      value: stats.approvedRequests,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'In Progress',
      value: stats.inProgressRequests,
      icon: FileText,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your asset management system</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-4 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // HR Dashboard
  if (userRole === 'hr') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">HR Dashboard</h2>
          <p className="text-muted-foreground">Manage asset requests and track allocations for new joiners</p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Requests
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
              <p className="text-xs text-muted-foreground mt-1">Total requests submitted</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approval
              </CardTitle>
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Waiting for approval</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvedRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for allocation</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgressRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Being processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Approved Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Assets ({approvedAssets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedAssets.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No approved assets allocated yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Asset Category</th>
                      <th className="text-left py-2 px-4 font-medium">Assigned Employee</th>
                      <th className="text-left py-2 px-4 font-medium">Approved Date</th>
                      <th className="text-left py-2 px-4 font-medium">Assigned Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedAssets.map((asset) => (
                      <tr key={asset.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{asset.assets?.asset_name || 'N/A'}</td>
                        <td className="py-3 px-4">{asset.employee_name}</td>
                        <td className="py-3 px-4">{format(new Date(asset.created_at), 'dd-MM-yyyy')}</td>
                        <td className="py-3 px-4">{format(new Date(asset.allocated_date), 'dd-MM-yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Asset Requests Status Table */}
        <Card>
          <CardHeader>
            <CardTitle>My Asset Requests Status</CardTitle>
          </CardHeader>
          <CardContent>
            {myRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No requests found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Category</th>
                      <th className="text-left py-2 px-4 font-medium">Type</th>
                      <th className="text-left py-2 px-4 font-medium">Department</th>
                      <th className="text-left py-2 px-4 font-medium">Request Date</th>
                      <th className="text-left py-2 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 capitalize">{request.category}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${request.request_type === 'express' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {request.request_type === 'express' ? 'Express' : 'Regular'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{request.department || 'N/A'}</td>
                        <td className="py-3 px-4">{format(new Date(request.created_at), 'dd-MM-yyyy')}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            request.status === 'approved' ? 'bg-green-100 text-green-700' :
                            request.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            request.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your asset management system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="transition-all hover:shadow-md hover:scale-105 duration-200"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Navigate to different sections using the sidebar menu to manage assets, view requests, and more.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <p className="text-sm text-muted-foreground">All systems operational</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
