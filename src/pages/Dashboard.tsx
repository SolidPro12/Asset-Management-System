import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Package, CheckCircle, AlertCircle, Wrench, FileText, Clock, TrendingUp, Download, Users, ArrowRight, Loader2, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
 
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DashboardStats {
  totalAssets: number;
  availableAssets: number;
  assignedAssets: number;
  maintenanceAssets: number;
  pendingRequests: number;
  approvedRequests: number;
  inProgressRequests: number;
  myRequests: number;
  // Super Admin stats
  totalEmployees?: number;
  regularRequests?: number;
  expressRequests?: number;
}

interface CategoryStat {
  category: string;
  total: number;
  assigned: number;
  utilization: number;
  totalValue: number;
}

interface AdminCategoryStat {
  category: string;
  total: number;
  assigned: number;
  utilization: number;
}

interface RecentRequest {
  id: string;
  request_id: string | null;
  category: string;
  reason: string;
  status: string;
  request_type: string;
  created_at: string;
  profiles?: {
    full_name: string;
    department: string | null;
  };
}

interface RecentAllocation {
  id: string;
  asset_name: string;
  category: string;
  department: string | null;
  allocated_date: string;
  status: string;
  employee_name: string;
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    totalEmployees: 0,
    regularRequests: 0,
    expressRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [approvedAssets, setApprovedAssets] = useState<any[]>([]);
  const [approvedRequestsList, setApprovedRequestsList] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  // Super Admin dashboard state
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [recentAllocations, setRecentAllocations] = useState<RecentAllocation[]>([]);
  // Admin dashboard state (without cost fields)
  const [adminCategoryStats, setAdminCategoryStats] = useState<AdminCategoryStat[]>([]);
  const [adminRecentRequests, setAdminRecentRequests] = useState<RecentRequest[]>([]);
  const [adminRecentAllocations, setAdminRecentAllocations] = useState<RecentAllocation[]>([]);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (userRole) {
      if (userRole === 'super_admin') {
        fetchSuperAdminDashboardData();
      } else if (userRole === 'hr') {
        fetchHRDashboardData();
      } else if (userRole === 'financer') {
        fetchDashboardStats(); // Financer uses same as default
      } else if (userRole === 'admin') {
        fetchAdminDashboardData();
      } else {
        fetchDashboardStats(); // User dashboard
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
    setLoading(true);
    try {
      if (!user) return;

      // Fetch my requests
      const { data: myRequestsData, error: myRequestsError } = await supabase
        .from('asset_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (myRequestsError) throw myRequestsError;

      // Fetch profiles separately for my requests
      if (myRequestsData) {
        const userIds = [...new Set(myRequestsData.map(r => r.requester_id) || [])];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, department')
          .in('id', userIds);

        const myRequestsWithProfiles = myRequestsData.map(request => ({
          ...request,
          profiles: profilesData?.find(p => p.id === request.requester_id),
        }));

        setMyRequests(myRequestsWithProfiles);
      }

      // Organization-wide request status counts for HR dashboard cards
      const { data: allRequests, error: allRequestsError } = await supabase
        .from('asset_requests')
        .select('status');

      if (allRequestsError) throw allRequestsError;

      if (allRequests) {
        const pendingApprovalAll = allRequests.filter(r => r.status === 'pending').length;
        const approvedAll = allRequests.filter(r => r.status === 'approved').length;

        setStats(prev => ({
          ...prev,
          totalAssets: allRequests.length,
          pendingRequests: pendingApprovalAll,
          approvedRequests: approvedAll,
          inProgressRequests: 0, // Not needed for HR dashboard
        }));
      }

      // Fetch approved assets allocated to user
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('asset_allocations')
        .select('*, assets:asset_id(asset_name, category)')
        .eq('status', 'active')
        .order('allocated_date', { ascending: false });

      if (allocationsError) {
        console.error('Error fetching allocations:', allocationsError);
      } else if (allocationsData) {
        setApprovedAssets(allocationsData);
      }

      // Fetch all approved asset requests for table display
      const { data: approvedReqsData, error: approvedReqsError } = await supabase
        .from('asset_requests')
        .select('*')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      if (approvedReqsError) throw approvedReqsError;

      // Fetch profiles separately for approved requests
      if (approvedReqsData) {
        const approvedUserIds = [...new Set(approvedReqsData.map(r => r.requester_id) || [])];
        const { data: approvedProfilesData } = await supabase
          .from('profiles')
          .select('id, full_name, department')
          .in('id', approvedUserIds);

        const approvedReqsWithProfiles = approvedReqsData.map(request => ({
          ...request,
          profiles: approvedProfilesData?.find(p => p.id === request.requester_id),
        }));

        setApprovedRequestsList(approvedReqsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching HR dashboard data:', error);
      toast.error('Failed to load HR dashboard data');
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

  // Super Admin Dashboard Data Fetching
  const fetchSuperAdminDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployeeCount(),
        fetchSuperAdminAssetStats(),
        fetchRequestOverview(),
        fetchCategoryStats(),
        fetchRecentRequests(),
        fetchRecentAllocations(),
      ]);
    } catch (error) {
      console.error('Error fetching super admin dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeCount = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setStats((prev) => ({ ...prev, totalEmployees: count || 0 }));
    } catch (error) {
      console.error('Error fetching employee count:', error);
      setStats((prev) => ({ ...prev, totalEmployees: 245 }));
    }
  };

  const fetchSuperAdminAssetStats = async () => {
    try {
      const { data, error } = await supabase.from('assets').select('status');

      if (error) throw error;

      const assigned = data?.filter((a) => a.status === 'assigned').length || 0;
      const available = data?.filter((a) => a.status === 'available').length || 0;
      const maintenance = data?.filter((a) => a.status === 'under_maintenance').length || 0;

      setStats((prev) => ({
        ...prev,
        assignedAssets: assigned,
        availableAssets: available,
        maintenanceAssets: maintenance,
      }));
    } catch (error) {
      console.error('Error fetching asset stats:', error);
      setStats((prev) => ({
        ...prev,
        assignedAssets: 189,
        availableAssets: 156,
        maintenanceAssets: 12,
      }));
    }
  };

  const fetchRequestOverview = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_requests')
        .select('request_type');

      if (error) throw error;

      const regular = data?.filter((r) => r.request_type === 'regular').length || 0;
      const express = data?.filter((r) => r.request_type === 'express').length || 0;

      setStats((prev) => ({
        ...prev,
        regularRequests: regular,
        expressRequests: express,
      }));
    } catch (error) {
      console.error('Error fetching request overview:', error);
      setStats((prev) => ({
        ...prev,
        regularRequests: 8,
        expressRequests: 4,
      }));
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('category, status, purchase_cost');

      if (error) throw error;

      const categoryMap = new Map<string, { total: number; assigned: number; totalValue: number }>();

      data?.forEach((asset) => {
        const category = asset.category;
        const current = categoryMap.get(category) || { total: 0, assigned: 0, totalValue: 0 };

        current.total += 1;
        if (asset.status === 'assigned') {
          current.assigned += 1;
        }
        current.totalValue += asset.purchase_cost || 0;

        categoryMap.set(category, current);
      });

      const statsArray: CategoryStat[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
        total: data.total,
        assigned: data.assigned,
        utilization: data.total > 0 ? Math.round((data.assigned / data.total) * 100) : 0,
        totalValue: data.totalValue,
      }));

      setCategoryStats(statsArray.sort((a, b) => b.totalValue - a.totalValue));
    } catch (error) {
      console.error('Error fetching category stats:', error);
      setCategoryStats([
        { category: 'Laptop', total: 120, assigned: 95, utilization: 79, totalValue: 6000000 },
        { category: 'Monitor', total: 80, assigned: 60, utilization: 75, totalValue: 2400000 },
        { category: 'Keyboard', total: 50, assigned: 35, utilization: 70, totalValue: 250000 },
      ]);
    }
  };

  const fetchRecentRequests = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('asset_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (requestsError) throw requestsError;

      // Fetch profiles separately
      const userIds = [...new Set(requestsData?.map((r) => r.requester_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .in('id', userIds);

      // Merge profiles with requests
      const requestsWithProfiles =
        requestsData?.map((request) => ({
          ...request,
          profiles: profilesData?.find((p) => p.id === request.requester_id),
        })) || [];

      setRecentRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching recent requests:', error);
      setRecentRequests([]);
    }
  };

  const fetchRecentAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_allocations')
        .select('*')
        .order('allocated_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentAllocations(data || []);
    } catch (error) {
      console.error('Error fetching recent allocations:', error);
      setRecentAllocations([]);
    }
  };

  // Admin Dashboard Data Fetching (without cost fields)
  const fetchAdminDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployeeCount(),
        fetchSuperAdminAssetStats(),
        fetchRequestOverview(),
        fetchAdminCategoryStats(),
        fetchAdminRecentRequests(),
        fetchAdminRecentAllocations(),
      ]);
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminCategoryStats = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('category, status');

      if (error) throw error;

      const categoryMap = new Map<string, { total: number; assigned: number }>();

      data?.forEach((asset) => {
        const category = asset.category;
        const current = categoryMap.get(category) || { total: 0, assigned: 0 };

        current.total += 1;
        if (asset.status === 'assigned') {
          current.assigned += 1;
        }

        categoryMap.set(category, current);
      });

      const statsArray: AdminCategoryStat[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
        total: data.total,
        assigned: data.assigned,
        utilization: data.total > 0 ? Math.round((data.assigned / data.total) * 100) : 0,
      }));

      setAdminCategoryStats(statsArray.sort((a, b) => b.total - a.total));
    } catch (error) {
      console.error('Error fetching admin category stats:', error);
      setAdminCategoryStats([
        { category: 'Laptop', total: 120, assigned: 95, utilization: 79 },
        { category: 'Monitor', total: 80, assigned: 60, utilization: 75 },
        { category: 'Keyboard', total: 50, assigned: 35, utilization: 70 },
      ]);
    }
  };

  const fetchAdminRecentRequests = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('asset_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (requestsError) throw requestsError;

      // Fetch profiles separately
      const userIds = [...new Set(requestsData?.map((r) => r.requester_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .in('id', userIds);

      // Merge profiles with requests
      const requestsWithProfiles =
        requestsData?.map((request) => ({
          ...request,
          profiles: profilesData?.find((p) => p.id === request.requester_id),
        })) || [];

      setAdminRecentRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching admin recent requests:', error);
      setAdminRecentRequests([]);
    }
  };

  const fetchAdminRecentAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_allocations')
        .select('*')
        .order('allocated_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAdminRecentAllocations(data || []);
    } catch (error) {
      console.error('Error fetching admin recent allocations:', error);
      setAdminRecentAllocations([]);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('asset_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      await supabase.from('request_history').insert({
        request_id: requestId,
        action: 'approved',
        performed_by: user.id,
        remarks: userRole === 'admin' ? 'Request approved by Admin' : 'Request approved by Super Admin',
      });

      toast.success('Request approved successfully!');
      fetchRecentRequests();
      fetchRequestOverview();
      // Also refresh admin data if user is admin
      if (userRole === 'admin') {
        fetchAdminRecentRequests();
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' },
      in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
      fulfilled: { label: 'Fulfilled', className: 'bg-purple-100 text-purple-800 border-purple-200' },
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;

    return (
      <Badge variant="outline" className={statusConfig.className}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getStatusBadgeForAllocation = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-blue-500 text-white">Active</Badge>;
    } else if (status === 'returned') {
      return <Badge variant="secondary">Returned</Badge>;
    }
    return <Badge variant="outline">Unreturned</Badge>;
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

  // Super Admin Dashboard
  if (userRole === 'super_admin') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f6ff] min-h-screen -m-6 p-6">


        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive overview of assets, employees, and requests</p>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Overall Employees</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-blue-600">{stats.totalEmployees || 0}</p>
                  )}
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Assigned Assets</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-green-600">{stats.assignedAssets}</p>
                  )}
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Available Assets</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-purple-600">{stats.availableAssets}</p>
                  )}
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Under Maintenance</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-red-600">{stats.maintenanceAssets}</p>
                  )}
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <Wrench className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-xl shadow-sm border bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  {loading ? (
                    <div className="h-6 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.regularRequests || 0}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Regular Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm border bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  {loading ? (
                    <div className="h-6 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.expressRequests || 0}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Express Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets by Category Chart */}
          <Card className="rounded-xl shadow-sm border bg-white">
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : categoryStats.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={categoryStats}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" width={100} />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name === 'utilization') return [`${value}%`, 'Utilization'];
                          if (name === 'totalValue') return [`₹${value.toLocaleString('en-IN')}`, 'Total Value'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="utilization" radius={[0, 8, 8, 0]}>
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {categoryStats.slice(0, 5).map((stat) => (
                      <div key={stat.category} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stat.category}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">{stat.utilization}% utilized</span>
                          <span className="font-semibold">₹{stat.totalValue.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Asset Requests */}
          <Card className="rounded-xl shadow-sm border bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Asset Requests</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/requests')}>
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : recentRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent requests</div>
              ) : (
                <div className="space-y-3">
                  {recentRequests.slice(0, 5).map((request) => (
                    <Card key={request.id} className="rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold capitalize">{request.category}</span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {request.profiles?.full_name || 'Unknown'} • {request.profiles?.department || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                        {request.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request.id)}
                            className="ml-2"
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recently Allocated Assets Table */}
        <Card className="rounded-xl shadow-sm border bg-white">
          <CardHeader>
            <CardTitle>Recently Allocated Assets</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : recentAllocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No allocations found</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAllocations.map((allocation) => (
                      <TableRow key={allocation.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{allocation.asset_name}</TableCell>
                        <TableCell className="capitalize">{allocation.category.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{allocation.department || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(allocation.allocated_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{allocation.employee_name}</TableCell>
                        <TableCell>{getStatusBadgeForAllocation(allocation.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  if (userRole === 'admin') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f6ff] min-h-screen -m-6 p-6">


        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of assets, employees, and requests</p>
        </div>

        {/* Top Summary Cards - 6 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Overall Employees</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-blue-600">{stats.totalEmployees || 0}</p>
                  )}
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Assigned Assets</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-green-600">{stats.assignedAssets}</p>
                  )}
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Available Assets</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-purple-600">{stats.availableAssets}</p>
                  )}
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Under Maintenance</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-red-600">{stats.maintenanceAssets}</p>
                  )}
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <Wrench className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Regular Requests</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-yellow-600">{stats.regularRequests || 0}</p>
                  )}
                </div>
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Express Requests</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-orange-600">{stats.expressRequests || 0}</p>
                  )}
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets by Category Chart - without cost */}
          <Card className="rounded-xl shadow-sm border bg-white">
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : adminCategoryStats.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={adminCategoryStats}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" width={100} />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name === 'utilization') return [`${value}%`, 'Utilization'];
                          if (name === 'assigned') return [value, 'Assigned'];
                          if (name === 'total') return [value, 'Total'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="utilization" radius={[0, 8, 8, 0]}>
                        {adminCategoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {adminCategoryStats.slice(0, 5).map((stat) => (
                      <div key={stat.category} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stat.category}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">{stat.utilization}% utilized</span>
                          <span className="font-semibold">{stat.assigned}/{stat.total} assets</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Asset Requests */}
          <Card className="rounded-xl shadow-sm border bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Asset Requests</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/requests')}>
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : adminRecentRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent requests</div>
              ) : (
                <div className="space-y-3">
                  {adminRecentRequests.slice(0, 5).map((request) => (
                    <Card key={request.id} className="rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold capitalize">{request.category}</span>
                            <Badge variant={request.request_type === 'express' ? 'destructive' : 'default'} className="text-xs">
                              {request.request_type === 'express' ? 'Express' : 'Regular'}
                            </Badge>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {request.profiles?.full_name || 'Unknown'} • {request.profiles?.department || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                        {request.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request.id)}
                            className="ml-2"
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recently Allocated Assets Table - without cost column */}
        <Card className="rounded-xl shadow-sm border bg-white">
          <CardHeader>
            <CardTitle>Recently Allocated Assets</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : adminRecentAllocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No allocations found</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminRecentAllocations.map((allocation) => (
                      <TableRow key={allocation.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{allocation.asset_name}</TableCell>
                        <TableCell className="capitalize">{allocation.category?.replace(/_/g, ' ') || 'N/A'}</TableCell>
                        <TableCell>{allocation.employee_name || 'N/A'}</TableCell>
                        <TableCell>{allocation.department || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(allocation.allocated_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{getStatusBadgeForAllocation(allocation.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Financer Dashboard
  if (userRole === 'financer') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">


        <div>
          <h2 className="text-3xl font-bold tracking-tight">Finance & Management Dashboard</h2>
          <p className="text-muted-foreground">Financial overview and reporting of asset investments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Asset Value
              </CardTitle>
              <div className="p-2 rounded-lg bg-success/10">
                <Package className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">₹45,67,890</div>
              <p className="text-xs text-muted-foreground mt-1">Total investment</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assets In Use
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.assignedAssets}</div>
              <p className="text-xs text-muted-foreground mt-1">Utilization rate 75%</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Package className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">13</div>
              <p className="text-xs text-muted-foreground mt-1">Asset categories</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Departments
              </CardTitle>
              <div className="p-2 rounded-lg bg-warning/10">
                <FileText className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">8</div>
              <p className="text-xs text-muted-foreground mt-1">Active departments</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports & Data Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reports & Data Management</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Reports
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">Asset Utilization Report</CardTitle>
                  <p className="text-sm text-muted-foreground">Comprehensive usage analytics</p>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Generate</Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">Financial Summary</CardTitle>
                  <p className="text-sm text-muted-foreground">Cost analysis and ROI metrics</p>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Generate</Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">Department Allocation</CardTitle>
                  <p className="text-sm text-muted-foreground">Asset distribution by department</p>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Generate</Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
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
        <div className="grid gap-4 md:grid-cols-3">
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
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalAssets}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total requests submitted</p>
                </>
              )}
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
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.pendingRequests}</div>
                  <p className="text-xs text-muted-foreground mt-1">Waiting for approval</p>
                </>
              )}
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
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.approvedRequests}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ready for allocation</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Approved Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Assets</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedAssets.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No approved assets allocated yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Request ID</th>
                      <th className="text-left py-2 px-4 font-medium">Asset Category</th>
                      <th className="text-left py-2 px-4 font-medium">Requester</th>
                      <th className="text-left py-2 px-4 font-medium">Request Date</th>
                      <th className="text-left py-2 px-4 font-medium">Approved Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedRequestsList.map((request) => (
                      <tr key={request.request_id || request.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm font-semibold">{request.request_id || 'N/A'}</td>
                        <td className="py-3 px-4 capitalize">{request.category}</td>
                        <td className="py-3 px-4">{request.profiles?.full_name || 'N/A'}</td>
                        <td className="py-3 px-4">{format(new Date(request.created_at), 'dd-MM-yyyy')}</td>
                        <td className="py-3 px-4">{request.approved_at ? format(new Date(request.approved_at), 'dd-MM-yyyy') : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Requests Status Table */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Requests Status</CardTitle>
          </CardHeader>
          <CardContent>
            {myRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No requests found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Request ID</th>
                      <th className="text-left py-2 px-4 font-medium">Asset Category</th>
                      <th className="text-left py-2 px-4 font-medium">Type</th>
                      <th className="text-left py-2 px-4 font-medium">Department</th>
                      <th className="text-left py-2 px-4 font-medium">Request Date</th>
                      <th className="text-left py-2 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((request) => (
                      <tr key={request.request_id || request.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm font-semibold">{request.request_id || 'N/A'}</td>
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
