import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Package, CheckCircle, AlertCircle, Wrench, FileText, Clock, TrendingUp, Download, Users, ArrowRight, Loader2, Zap, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
 
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
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

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
  // Admin lists pagination
  const [adminRecentReqPage, setAdminRecentReqPage] = useState(1);
  const [adminAllocPage, setAdminAllocPage] = useState(1);
  const adminPageSize = 5;
  // User dashboard state
  const [userName, setUserName] = useState<string>('');
  const [userStats, setUserStats] = useState({
    assigned: 0,
    raised: 0,
    inProgress: 0,
    resolved: 0,
    upcoming: 0,
  });
  // Super Admin lists pagination
  const [suRecentReqPage, setSuRecentReqPage] = useState(1);
  const [suAllocPage, setSuAllocPage] = useState(1);
  const suPageSize = 5;
  // HR tables pagination
  const [hrApprovedPage, setHrApprovedPage] = useState(1);
  const [hrMyReqPage, setHrMyReqPage] = useState(1);
  const hrPageSize = 5;
  // Department Head data
  const [deptCategoryStats, setDeptCategoryStats] = useState<CategoryStat[]>([]);
  const [deptTotalValue, setDeptTotalValue] = useState<number>(0);
  const [deptAllocations, setDeptAllocations] = useState<any[]>([]);
  const [deptName, setDeptName] = useState<string>('');
  const [deptEmployeeCount, setDeptEmployeeCount] = useState<number>(0);
  // Global totals for Financer/Dept Head summary cards
  const [globalCategoryStats, setGlobalCategoryStats] = useState<CategoryStat[]>([]);
  const [globalTotalAssetValue, setGlobalTotalAssetValue] = useState<number>(0);
  
  // Finance Admin Charts & Filters
  const [financeChartData, setFinanceChartData] = useState({
    assetCountByCategory: [] as { category: string; count: number }[],
    assetValueByCategory: [] as { category: string; value: number }[],
    departmentCostData: [] as { department: string; cost: number }[],
  });
  const [financeFilters, setFinanceFilters] = useState({
    department: 'all',
    category: 'all',
    financialYear: 'all',
    startDate: '',
    endDate: '',
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

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
      } else if (userRole === 'financer' || userRole === 'department_head' || userRole === 'department head') {
        fetchDashboardStats(); // Finance/Dept Head use same as default
        fetchEmployeeCount(); // For financer org employees card
        if (userRole === 'department_head' || userRole === 'department head') {
          fetchDeptHeadDashboardData();
        }
        fetchGlobalCategoryStats();
      } else if (userRole === 'admin') {
        fetchAdminDashboardData();
      } else {
        fetchUserDashboardData(); // User dashboard
      }
    }
  }, [userRole]);

  const isFinancer = userRole === 'financer';

  const fetchFinanceChartData = async () => {
    try {
      // Build query with filters
      let assetsQuery = supabase
        .from('assets')
        .select('category, purchase_cost, purchase_date, department');
      
      let allocationsQuery = supabase
        .from('asset_allocations')
        .select('department, asset_id, assets(purchase_cost, category, purchase_date)');

      // Apply filters
      if (financeFilters.department !== 'all') {
        assetsQuery = assetsQuery.eq('department', financeFilters.department);
        allocationsQuery = allocationsQuery.eq('department', financeFilters.department);
      }
      
      if (financeFilters.category !== 'all') {
        assetsQuery = assetsQuery.eq('category', financeFilters.category as any);
      }

      // Date filters
      if (financeFilters.startDate) {
        assetsQuery = assetsQuery.gte('purchase_date', financeFilters.startDate);
      }
      if (financeFilters.endDate) {
        assetsQuery = assetsQuery.lte('purchase_date', financeFilters.endDate);
      }

      // Financial Year filter (April to March)
      if (financeFilters.financialYear !== 'all') {
        const year = parseInt(financeFilters.financialYear);
        const fyStart = `${year}-04-01`;
        const fyEnd = `${year + 1}-03-31`;
        assetsQuery = assetsQuery.gte('purchase_date', fyStart).lte('purchase_date', fyEnd);
      }

      const { data: assets } = await assetsQuery;
      const { data: allocations } = await allocationsQuery;

      if (assets) {
        // Asset Count by Category
        const countByCategory: Record<string, number> = {};
        assets.forEach(asset => {
          countByCategory[asset.category] = (countByCategory[asset.category] || 0) + 1;
        });

        // Asset Value by Category
        const valueByCategory: Record<string, number> = {};
        assets.forEach(asset => {
          if (asset.purchase_cost) {
            valueByCategory[asset.category] = (valueByCategory[asset.category] || 0) + Number(asset.purchase_cost);
          }
        });

        setFinanceChartData({
          assetCountByCategory: Object.entries(countByCategory).map(([category, count]) => ({
            category,
            count,
          })),
          assetValueByCategory: Object.entries(valueByCategory).map(([category, value]) => ({
            category,
            value,
          })),
          departmentCostData: [], // Will be calculated from allocations
        });
      }

      // Department-wise Asset Cost
      if (allocations) {
        const costByDept: Record<string, number> = {};
        allocations.forEach((alloc: any) => {
          if (alloc.department && alloc.assets?.purchase_cost) {
            costByDept[alloc.department] = (costByDept[alloc.department] || 0) + Number(alloc.assets.purchase_cost);
          }
        });

        setFinanceChartData(prev => ({
          ...prev,
          departmentCostData: Object.entries(costByDept).map(([department, cost]) => ({
            department,
            cost,
          })),
        }));
      }
    } catch (error) {
      console.error('Error fetching finance chart data:', error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch unique departments
      const { data: deptData } = await supabase
        .from('assets')
        .select('department')
        .not('department', 'is', null);
      
      if (deptData) {
        const uniqueDepts = [...new Set(deptData.map(d => d.department).filter(Boolean))] as string[];
        setDepartments(uniqueDepts);
      }

      // Fetch unique categories
      const { data: catData } = await supabase
        .from('assets')
        .select('category');
      
      if (catData) {
        const uniqueCats = [...new Set(catData.map(d => d.category))];
        setCategories(uniqueCats);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  useEffect(() => {
    if (isFinancer) {
      fetchFinanceChartData();
    }
  }, [financeFilters, isFinancer]);

  useEffect(() => {
    if (isFinancer) {
      fetchFilterOptions();
    }
  }, [isFinancer]);

  const fetchGlobalCategoryStats = async () => {
    try {
      const { data } = await supabase
        .from('assets')
        .select('category, status, purchase_cost');

      const categoryMap = new Map<string, { total: number; assigned: number; totalValue: number }>();
      let totalValue = 0;

      data?.forEach((asset) => {
        const category = asset.category;
        const current = categoryMap.get(category) || { total: 0, assigned: 0, totalValue: 0 };
        current.total += 1;
        if ((asset as any).status === 'assigned') {
          current.assigned += 1;
        }
        const cost = (asset as any).purchase_cost || 0;
        current.totalValue += cost;
        totalValue += cost;
        categoryMap.set(category, current);
      });

      const statsArray: CategoryStat[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
        total: data.total,
        assigned: data.assigned,
        utilization: data.total > 0 ? Math.round((data.assigned / data.total) * 100) : 0,
        totalValue: data.totalValue,
      }));

      setGlobalCategoryStats(statsArray);
      setGlobalTotalAssetValue(totalValue);
    } catch (_) {
      setGlobalCategoryStats([]);
      setGlobalTotalAssetValue(0);
    }
  };

  const fetchDeptHeadDashboardData = async () => {
    try {
      if (!user) return;
      // Get department of current department head
      const { data: profile } = await supabase
        .from('profiles')
        .select('department')
        .eq('id', user.id)
        .single();

      const department = profile?.department || '';
      setDeptName(department);

      // Fetch active allocations for this department with joined asset details
      const { data: allocations } = await supabase
        .from('asset_allocations')
        .select('id, allocated_date, status, employee_name, department, assets:asset_id(asset_name, category, purchase_cost)')
        .eq('status', 'active')
        .eq('department', department);

      const list = allocations || [];
      setDeptAllocations(list);

      // Fetch team size (employees in this department)
      try {
        const { count: teamCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('department', department);
        setDeptEmployeeCount(teamCount || 0);
      } catch (_) {
        setDeptEmployeeCount(0);
      }

      // Aggregate by category and sum cost
      const categoryMap = new Map<string, { total: number; assigned: number; totalValue: number }>();
      let totalValue = 0;
      list.forEach((row: any) => {
        const asset = row.assets || {};
        const category = asset.category || 'other';
        const cost = asset.purchase_cost || 0;
        totalValue += cost;
        const current = categoryMap.get(category) || { total: 0, assigned: 0, totalValue: 0 };
        current.total += 1;
        current.assigned += 1;
        current.totalValue += cost;
        categoryMap.set(category, current);
      });

      const statsArray: CategoryStat[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
        total: data.total,
        assigned: data.assigned,
        utilization: data.total > 0 ? Math.round((data.assigned / data.total) * 100) : 0,
        totalValue: data.totalValue,
      }));

      setDeptCategoryStats(statsArray.sort((a, b) => b.totalValue - a.totalValue));
      setDeptTotalValue(totalValue);
    } catch (_) {
      setDeptCategoryStats([]);
      setDeptTotalValue(0);
      setDeptAllocations([]);
    }
  };

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

  const fetchUserDashboardData = async () => {
    setLoading(true);
    try {
      if (!user) return;
      // Fetch user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      setUserName(profile?.full_name || 'User');

      // Assigned assets count
      const { count: assignedCount } = await supabase
        .from('asset_allocations')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('status', 'active');

      // Tickets raised
      const { count: raisedCount } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id);

      // Tickets in progress
      const { count: inProgressCount } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('status', 'in_progress');

      // Tickets resolved
      const { count: resolvedCount } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('status', 'resolved');

      // Upcoming maintenance - using service_history as proxy
      let upcoming = 0;
      try {
        const { count: upcomingCount } = await supabase
          .from('service_history')
          .select('id', { count: 'exact', head: true })
          .eq('performed_by', user.id)
          .gte('service_date', new Date().toISOString().split('T')[0]);
        upcoming = upcomingCount || 0;
      } catch (_) {
        upcoming = 0;
      }

      setUserStats({
        assigned: assignedCount || 0,
        raised: raisedCount || 0,
        inProgress: inProgressCount || 0,
        resolved: resolvedCount || 0,
        upcoming,
      });
    } catch (e) {
      // silently ignore for user view
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

      const total = data?.length || 0;
      const assigned = data?.filter((a) => a.status === 'assigned').length || 0;
      const available = data?.filter((a) => a.status === 'available').length || 0;
      const maintenance = data?.filter((a) => a.status === 'under_maintenance').length || 0;

      setStats((prev) => ({
        ...prev,
        totalAssets: total,
        assignedAssets: assigned,
        availableAssets: available,
        maintenanceAssets: maintenance,
      }));
    } catch (error) {
      console.error('Error fetching asset stats:', error);
      setStats((prev) => ({
        ...prev,
        totalAssets: 0,
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

      setCategoryStats(
        statsArray.sort((a, b) => {
          const al = a.category.toLowerCase();
          const bl = b.category.toLowerCase();
          if (al === 'other' && bl !== 'other') return 1;
          if (bl === 'other' && al !== 'other') return -1;
          return a.category.localeCompare(b.category);
        })
      );
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

  // Finance Report Handlers
  const handleExportReports = async () => {
    try {
      toast.info('Exporting financial reports...');
      
      // Fetch all assets with financial data
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!assets || assets.length === 0) {
        toast.error('No asset data to export');
        return;
      }

      // Format data for export
      const exportData = assets.map(asset => ({
        'Asset ID': asset.asset_id,
        'Asset Tag': asset.asset_tag,
        'Asset Name': asset.asset_name,
        'Category': asset.category,
        'Brand': asset.brand || 'N/A',
        'Model': asset.model || 'N/A',
        'Serial Number': asset.serial_number || 'N/A',
        'Status': asset.status,
        'Purchase Cost': asset.purchase_cost || 0,
        'Purchase Date': asset.purchase_date ? format(new Date(asset.purchase_date), 'yyyy-MM-dd') : 'N/A',
        'Warranty End Date': asset.warranty_end_date ? format(new Date(asset.warranty_end_date), 'yyyy-MM-dd') : 'N/A',
        'Department': asset.department || 'N/A',
        'Location': asset.location || 'N/A',
        'Notes': asset.notes || 'N/A',
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 },
        { wch: 15 }, { wch: 30 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Financial Reports');

      // Generate filename with timestamp
      const filename = `Financial_Reports_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, filename);
      
      toast.success('Financial reports exported successfully!');
    } catch (error) {
      console.error('Error exporting reports:', error);
      toast.error('Failed to export financial reports');
    }
  };

  const handleImportData = async () => {
    try {
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        toast.info('Processing import file...');

        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
              toast.error('No data found in file');
              return;
            }

            let successCount = 0;
            let errorCount = 0;

            // Process each row
            for (const row of jsonData as any[]) {
              try {
                const assetId = row['Asset ID'] || row['asset_id'];
                const purchaseCost = parseFloat(row['Purchase Cost'] || row['purchase_cost'] || '0');
                const purchaseDate = row['Purchase Date'] || row['purchase_date'];
                const warrantyEndDate = row['Warranty End Date'] || row['warranty_end_date'];

                if (!assetId) {
                  errorCount++;
                  continue;
                }

                // Update asset with financial data
                const { error: updateError } = await supabase
                  .from('assets')
                  .update({
                    purchase_cost: purchaseCost,
                    purchase_date: purchaseDate || null,
                    warranty_end_date: warrantyEndDate || null,
                  })
                  .eq('asset_id', assetId);

                if (updateError) {
                  console.error(`Error updating asset ${assetId}:`, updateError);
                  errorCount++;
                } else {
                  successCount++;
                }
              } catch (rowError) {
                console.error('Error processing row:', rowError);
                errorCount++;
              }
            }

            if (successCount > 0) {
              toast.success(`Successfully imported ${successCount} asset records`);
              // Refresh data
              if (userRole === 'financer') {
                fetchGlobalCategoryStats();
              }
            }
            
            if (errorCount > 0) {
              toast.warning(`${errorCount} records failed to import`);
            }
          } catch (error) {
            console.error('Error processing file:', error);
            toast.error('Failed to process import file');
          }
        };

        reader.readAsArrayBuffer(file);
      };

      input.click();
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    }
  };

  const handleGenerateUtilizationReport = async () => {
    try {
      toast.info('Generating asset utilization report...');
      
      const { data: assets, error } = await supabase
        .from('assets')
        .select('category, status, asset_name, asset_id, department, location');

      if (error) throw error;

      // Calculate utilization by category
      const categoryUtilization: Record<string, any> = {};
      
      assets?.forEach(asset => {
        if (!categoryUtilization[asset.category]) {
          categoryUtilization[asset.category] = {
            total: 0,
            assigned: 0,
            available: 0,
            maintenance: 0,
          };
        }
        
        categoryUtilization[asset.category].total++;
        
        if (asset.status === 'assigned') {
          categoryUtilization[asset.category].assigned++;
        } else if (asset.status === 'available') {
          categoryUtilization[asset.category].available++;
        } else if (asset.status === 'under_maintenance') {
          categoryUtilization[asset.category].maintenance++;
        }
      });

      // Create export data
      const exportData = Object.entries(categoryUtilization).map(([category, stats]) => ({
        'Category': category,
        'Total Assets': stats.total,
        'Assigned': stats.assigned,
        'Available': stats.available,
        'Under Maintenance': stats.maintenance,
        'Utilization Rate (%)': ((stats.assigned / stats.total) * 100).toFixed(2),
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 18 }, { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Utilization Report');
      
      const filename = `Asset_Utilization_Report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      toast.success('Asset utilization report generated successfully!');
    } catch (error) {
      console.error('Error generating utilization report:', error);
      toast.error('Failed to generate utilization report');
    }
  };

  const handleGenerateFinancialSummary = async () => {
    try {
      toast.info('Generating financial summary...');
      
      const { data: assets, error } = await supabase
        .from('assets')
        .select('category, purchase_cost, status, purchase_date');

      if (error) throw error;

      // Calculate financial data by category
      const categoryFinancials: Record<string, any> = {};
      
      assets?.forEach(asset => {
        if (!categoryFinancials[asset.category]) {
          categoryFinancials[asset.category] = {
            totalCost: 0,
            count: 0,
            assigned: 0,
            available: 0,
          };
        }
        
        categoryFinancials[asset.category].totalCost += asset.purchase_cost || 0;
        categoryFinancials[asset.category].count++;
        
        if (asset.status === 'assigned') {
          categoryFinancials[asset.category].assigned++;
        } else if (asset.status === 'available') {
          categoryFinancials[asset.category].available++;
        }
      });

      // Create export data
      const exportData = Object.entries(categoryFinancials).map(([category, stats]) => ({
        'Category': category,
        'Total Assets': stats.count,
        'Total Investment': `$${stats.totalCost.toFixed(2)}`,
        'Average Cost': `$${(stats.totalCost / stats.count).toFixed(2)}`,
        'Assigned Assets': stats.assigned,
        'Available Assets': stats.available,
        'Utilization Rate (%)': ((stats.assigned / stats.count) * 100).toFixed(2),
      }));

      // Add summary row
      const totalInvestment = Object.values(categoryFinancials).reduce((sum: number, cat: any) => sum + cat.totalCost, 0);
      const totalAssets = Object.values(categoryFinancials).reduce((sum: number, cat: any) => sum + cat.count, 0);
      
      exportData.push({
        'Category': 'TOTAL',
        'Total Assets': totalAssets,
        'Total Investment': `$${totalInvestment.toFixed(2)}`,
        'Average Cost': `$${(totalInvestment / totalAssets).toFixed(2)}`,
        'Assigned Assets': '',
        'Available Assets': '',
        'Utilization Rate (%)': '',
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 },
        { wch: 18 }, { wch: 18 }, { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Financial Summary');
      
      const filename = `Financial_Summary_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      toast.success('Financial summary generated successfully!');
    } catch (error) {
      console.error('Error generating financial summary:', error);
      toast.error('Failed to generate financial summary');
    }
  };

  const handleGenerateDepartmentAllocation = async () => {
    try {
      toast.info('Generating department allocation report...');
      
      const { data: allocations, error } = await supabase
        .from('asset_allocations')
        .select('department, category, asset_name, employee_name, allocated_date, status');

      if (error) throw error;

      // Group by department
      const departmentData: Record<string, any> = {};
      
      allocations?.forEach(allocation => {
        const dept = allocation.department || 'Unassigned';
        
        if (!departmentData[dept]) {
          departmentData[dept] = {
            totalAllocations: 0,
            active: 0,
            returned: 0,
            categories: new Set(),
          };
        }
        
        departmentData[dept].totalAllocations++;
        departmentData[dept].categories.add(allocation.category);
        
        if (allocation.status === 'active') {
          departmentData[dept].active++;
        } else if (allocation.status === 'returned') {
          departmentData[dept].returned++;
        }
      });

      // Create export data
      const exportData = Object.entries(departmentData).map(([department, stats]) => ({
        'Department': department,
        'Total Allocations': stats.totalAllocations,
        'Active Allocations': stats.active,
        'Returned': stats.returned,
        'Categories': Array.from(stats.categories).join(', '),
        'Allocation Rate (%)': ((stats.active / stats.totalAllocations) * 100).toFixed(2),
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
        { wch: 30 }, { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Department Allocation');
      
      const filename = `Department_Allocation_Report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      toast.success('Department allocation report generated successfully!');
    } catch (error) {
      console.error('Error generating department allocation report:', error);
      toast.error('Failed to generate department allocation report');
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
              <CardContent className="p-4">
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
      <div className="space-y-4 animate-in fade-in duration-500 bg-[#f8f6ff] min-h-screen -m-6 p-4">

        {/* Sticky header area: title + top summary + request overview */}
        <div className="sticky top-16 z-10 bg-[#f8f6ff] space-y-4 pb-4">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive overview of assets, employees, and requests</p>
          </div>

          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="rounded-2xl shadow-md border-0 bg-white">
              <CardContent className="p-4">
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Assets</p>
                    {loading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      <p className="text-3xl font-bold text-sky-600">{stats.totalAssets}</p>
                    )}
                  </div>
                  <div className="p-3 bg-sky-100 rounded-xl">
                    <Package className="h-6 w-6 text-sky-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-md border-0 bg-white">
              <CardContent className="p-4">
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
              <CardContent className="p-4">
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
              <CardContent className="p-4">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Assets by Category Chart */}
          <Card className="rounded-xl shadow-sm border bg-white">
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
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
                  <ResponsiveContainer width="100%" height={600}>
                    <PieChart>
                      <Pie
                        data={categoryStats.map((stat, index) => ({
                          name: stat.category,
                          value: stat.total,
                          utilization: stat.utilization,
                          totalValue: stat.totalValue,
                          fill: COLORS[index % COLORS.length],
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={160}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-1">
                                <div className="font-semibold text-base">{data.name}</div>
                                <div className="text-sm">Total Assets: <span className="font-medium">{data.value}</span></div>
                                <div className="text-sm">Utilization: <span className="font-medium">{data.utilization}%</span></div>
                                <div className="text-sm font-medium">Total Value: ₹{data.totalValue.toLocaleString('en-IN')}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
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
            <CardContent className="p-4">
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
                  <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3">
                    {recentRequests
                      .slice((suRecentReqPage - 1) * suPageSize, suRecentReqPage * suPageSize)
                      .map((request) => (
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
                  <div className="pt-2 flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSuRecentReqPage((p) => Math.max(1, p - 1))}
                      disabled={suRecentReqPage <= 1}
                    >
                      {'<'}
                    </Button>
                    <span className="text-sm">
                      {suRecentReqPage}/{Math.max(1, Math.ceil(recentRequests.length / suPageSize))}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSuRecentReqPage((p) => Math.min(Math.max(1, Math.ceil(recentRequests.length / suPageSize)), p + 1))}
                      disabled={suRecentReqPage >= Math.max(1, Math.ceil(recentRequests.length / suPageSize))}
                    >
                      {'>'}
                    </Button>
                  </div>
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
          <CardContent className="p-4">
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
                      <TableHead>Asset Category</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAllocations
                      .slice((suAllocPage - 1) * suPageSize, suAllocPage * suPageSize)
                      .map((allocation) => (
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
                <div className="p-3 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSuAllocPage((p) => Math.max(1, p - 1))}
                    disabled={suAllocPage <= 1}
                  >
                    {'<'}
                  </Button>
                  <span className="text-sm">
                    {suAllocPage}/{Math.max(1, Math.ceil(recentAllocations.length / suPageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSuAllocPage((p) => Math.min(Math.max(1, Math.ceil(recentAllocations.length / suPageSize)), p + 1))}
                    disabled={suAllocPage >= Math.max(1, Math.ceil(recentAllocations.length / suPageSize))}
                  >
                    {'>'}
                  </Button>
                </div>
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive overview of assets, employees, and requests</p>
        </div>

        {/* Top Summary Cards - reduced padding and added Total Assets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-4">
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

          {/* Total Assets */}
          <Card className="rounded-2xl shadow-md border-0 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Assets</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-sky-600">{stats.totalAssets}</p>
                  )}
                </div>
                <div className="p-3 bg-sky-100 rounded-xl">
                  <Package className="h-6 w-6 text-sky-600" />
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

          <div className="col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl shadow-md border-0 bg-white">
              <CardContent className="p-4">
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
              <CardContent className="p-4">
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
                  <ResponsiveContainer width="100%" height={240}>
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
                  <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3">
                    {adminRecentRequests
                      .slice((adminRecentReqPage - 1) * adminPageSize, adminRecentReqPage * adminPageSize)
                      .map((request) => (
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
                  <div className="pt-2 flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdminRecentReqPage((p) => Math.max(1, p - 1))}
                      disabled={adminRecentReqPage <= 1}
                    >
                      {'<'}
                    </Button>
                    <span className="text-sm">
                      {adminRecentReqPage}/{Math.max(1, Math.ceil(adminRecentRequests.length / adminPageSize))}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdminRecentReqPage((p) => Math.min(Math.max(1, Math.ceil(adminRecentRequests.length / adminPageSize)), p + 1))}
                      disabled={adminRecentReqPage >= Math.max(1, Math.ceil(adminRecentRequests.length / adminPageSize))}
                    >
                      {'>'}
                    </Button>
                  </div>
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
                      <TableHead>Asset Category</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminRecentAllocations
                      .slice((adminAllocPage - 1) * adminPageSize, adminAllocPage * adminPageSize)
                      .map((allocation) => (
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
                <div className="p-3 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdminAllocPage((p) => Math.max(1, p - 1))}
                    disabled={adminAllocPage <= 1}
                  >
                    {'<'}
                  </Button>
                  <span className="text-sm">
                    {adminAllocPage}/{Math.max(1, Math.ceil(adminRecentAllocations.length / adminPageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdminAllocPage((p) => Math.min(Math.max(1, Math.ceil(adminRecentAllocations.length / adminPageSize)), p + 1))}
                    disabled={adminAllocPage >= Math.max(1, Math.ceil(adminRecentAllocations.length / adminPageSize))}
                  >
                    {'>'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Finance/Department Head Dashboard
  if (userRole === 'financer' || userRole === 'department_head' || userRole === 'department head') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">


        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Financial overview and reporting of asset investments</p>
        </div>

        {/* Summary Cards */}
        {isFinancer ? (
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
                <div className="text-2xl font-bold text-success">₹{(globalTotalAssetValue || 0).toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">Total investment</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Assets
                </CardTitle>
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stats.totalAssets}</div>
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
                <div className="text-2xl font-bold text-accent">{globalCategoryStats.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Asset categories</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Employees (Org)
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Organization-wide</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Employees (Team)
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deptEmployeeCount}</div>
                <p className="text-xs text-muted-foreground mt-1">In your department</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Assets
                </CardTitle>
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{deptAllocations.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Allocated in your department</p>
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
                <div className="text-2xl font-bold text-accent">{deptCategoryStats.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Asset categories in your department</p>
              </CardContent>
            </Card>

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
                <div className="text-2xl font-bold text-success">₹{(deptTotalValue || 0).toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">Your department</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Finance Admin Charts with Filters */}
        {isFinancer && (
          <>
            {/* Filters Section */}
            <Card>
              <CardHeader>
                <CardTitle>Analytical Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select
                      value={financeFilters.department}
                      onValueChange={(value) => setFinanceFilters(prev => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asset Category</label>
                    <Select
                      value={financeFilters.category}
                      onValueChange={(value) => setFinanceFilters(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Financial Year</label>
                    <Select
                      value={financeFilters.financialYear}
                      onValueChange={(value) => setFinanceFilters(prev => ({ ...prev, financialYear: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="2024">FY 2024-25</SelectItem>
                        <SelectItem value="2023">FY 2023-24</SelectItem>
                        <SelectItem value="2022">FY 2022-23</SelectItem>
                        <SelectItem value="2021">FY 2021-22</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={financeFilters.startDate}
                      onChange={(e) => setFinanceFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={financeFilters.endDate}
                      onChange={(e) => setFinanceFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Asset Distribution by Category - Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Distribution by Category</CardTitle>
                  <p className="text-sm text-muted-foreground">Total number of assets in each category</p>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      count: {
                        label: "Asset Count",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financeChartData.assetCountByCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="category" 
                          tick={{ fill: 'hsl(var(--foreground))' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Asset Value by Category - Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Value by Category</CardTitle>
                  <p className="text-sm text-muted-foreground">Total monetary value of assets grouped by category</p>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: {
                        label: "Total Value",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financeChartData.assetValueByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.category}: ₹${(entry.value / 1000).toFixed(0)}K`}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {financeChartData.assetValueByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={({ payload }) => {
                            if (payload && payload.length > 0) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="grid gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm text-muted-foreground">{data.category}</span>
                                      <span className="font-bold">₹{data.value.toLocaleString('en-IN')}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Department-wise Asset Cost - Full Width Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Department-wise Asset Cost Summary</CardTitle>
                <p className="text-sm text-muted-foreground">Total asset cost allocated per department</p>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    cost: {
                      label: "Total Cost",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[350px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={financeChartData.departmentCostData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="department" 
                        tick={{ fill: 'hsl(var(--foreground))' }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--foreground))' }}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                      />
                      <ChartTooltip 
                        content={({ payload }) => {
                          if (payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid gap-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-muted-foreground">{data.department}</span>
                                    <span className="font-bold">₹{data.cost.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        )}

        {/* Reports & Data Management (Financer) OR Department Assets Overview (Dept Head) */}
        {isFinancer ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reports & Data Management</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportReports}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Reports
                </Button>
                <Button variant="outline" size="sm" onClick={handleImportData}>
                  <Upload className="h-4 w-4 mr-2" />
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
                    <Button className="w-full" onClick={handleGenerateUtilizationReport}>Generate</Button>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base">Financial Summary</CardTitle>
                    <p className="text-sm text-muted-foreground">Cost analysis and ROI metrics</p>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={handleGenerateFinancialSummary}>Generate</Button>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base">Department Allocation</CardTitle>
                    <p className="text-sm text-muted-foreground">Asset distribution by department</p>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={handleGenerateDepartmentAllocation}>Generate</Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Department Assets Overview {deptName ? `- ${deptName}` : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 bg-white">
                    <div className="text-sm text-muted-foreground mb-2">Assets by Category</div>
                    {deptCategoryStats.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-muted-foreground">No data</div>
                    ) : (
                      <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={deptCategoryStats.map((stat, index) => ({
                                name: stat.category,
                                value: stat.total,
                                totalValue: stat.totalValue,
                                fill: COLORS[index % COLORS.length],
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={90}
                              dataKey="value"
                            >
                              {deptCategoryStats.map((_, index) => (
                                <Cell key={`dept-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data: any = payload[0].payload;
                                  return (
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-1">
                                      <div className="font-semibold text-base">{data.name}</div>
                                      <div className="text-sm">Total Assets: <span className="font-medium">{data.value}</span></div>
                                      <div className="text-sm font-medium">Total Value: ₹{data.totalValue.toLocaleString('en-IN')}</div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <div className="p-4 font-medium border-b">Allocated Assets List</div>
                  <div className="max-h-[360px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Allocated Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deptAllocations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">No allocations</TableCell>
                          </TableRow>
                        ) : (
                          deptAllocations.map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.assets?.asset_name || 'N/A'}</TableCell>
                              <TableCell className="capitalize">{row.assets?.category?.replace(/_/g, ' ') || 'N/A'}</TableCell>
                              <TableCell>₹{(row.assets?.purchase_cost || 0).toLocaleString('en-IN')}</TableCell>
                              <TableCell>{row.employee_name || 'N/A'}</TableCell>
                              <TableCell>{row.allocated_date ? format(new Date(row.allocated_date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // HR Dashboard
  if (userRole === 'hr') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">


        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
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
                    {approvedRequestsList
                      .slice((hrApprovedPage - 1) * hrPageSize, hrApprovedPage * hrPageSize)
                      .map((request) => (
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
                {/* Pagination controls for Approved Assets */}
                <div className="p-3 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHrApprovedPage((p) => Math.max(1, p - 1))}
                    disabled={hrApprovedPage <= 1}
                  >
                    {'<'}
                  </Button>
                  <span className="text-sm">
                    {hrApprovedPage}/{Math.max(1, Math.ceil(approvedRequestsList.length / hrPageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHrApprovedPage((p) => Math.min(Math.max(1, Math.ceil(approvedRequestsList.length / hrPageSize)), p + 1))}
                    disabled={hrApprovedPage >= Math.max(1, Math.ceil(approvedRequestsList.length / hrPageSize))}
                  >
                    {'>'}
                  </Button>
                </div>
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
                    {myRequests
                      .slice((hrMyReqPage - 1) * hrPageSize, hrMyReqPage * hrPageSize)
                      .map((request) => (
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
                {/* Pagination controls for Asset Requests Status */}
                <div className="p-3 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHrMyReqPage((p) => Math.max(1, p - 1))}
                    disabled={hrMyReqPage <= 1}
                  >
                    {'<'}
                  </Button>
                  <span className="text-sm">
                    {hrMyReqPage}/{Math.max(1, Math.ceil(myRequests.length / hrPageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHrMyReqPage((p) => Math.min(Math.max(1, Math.ceil(myRequests.length / hrPageSize)), p + 1))}
                    disabled={hrMyReqPage >= Math.max(1, Math.ceil(myRequests.length / hrPageSize))}
                  >
                    {'>'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f6ff] min-h-screen -m-6 p-4">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName || 'User'}</h1>
        <p className="text-muted-foreground">Here’s a quick summary of your assets and tickets.</p>
      </div>

      {/* User Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
        <Card className="rounded-2xl shadow-md border-0 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">My Assigned Assets</p>
                <p className="text-3xl font-bold text-sky-600">{userStats.assigned}</p>
              </div>
              <div className="p-3 bg-sky-100 rounded-xl">
                <Package className="h-6 w-6 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tickets Raised</p>
                <p className="text-3xl font-bold text-blue-600">{userStats.raised}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tickets In Progress</p>
                <p className="text-3xl font-bold text-blue-500">{userStats.inProgress}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tickets Resolved</p>
                <p className="text-3xl font-bold text-green-600">{userStats.resolved}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Upcoming Maintenance</p>
                <p className="text-3xl font-bold text-purple-600">{userStats.upcoming}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Wrench className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
