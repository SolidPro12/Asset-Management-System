import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEPARTMENTS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Package,
  Eye,
  Edit,
  Check,
  X,
  CalendarIcon,
  RotateCcw,
  Plus,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CreateRequestModal } from '@/components/CreateRequestModal';
import { ViewRequestModal } from '@/components/ViewRequestModal';
import { useAuth } from '@/contexts/AuthContext';

interface AssetRequest {
  id: string;
  category: string;
  reason: string;
  quantity: number;
  status: string;
  request_type: string;
  notes?: string;
  requester_id: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  expected_delivery_date?: string | null;
  department?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    department?: string;
  };
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-orange-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-500', icon: RefreshCw },
  fulfilled: { label: 'Fulfilled', color: 'bg-purple-500', icon: Package },
};

const priorityConfig = {
  low: { label: 'Low', variant: 'secondary' as const },
  medium: { label: 'Medium', variant: 'default' as const },
  high: { label: 'High', variant: 'default' as const },
  urgent: { label: 'Urgent', variant: 'destructive' as const },
};

export default function AssetRequests() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AssetRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<AssetRequest | null>(null);
  const [editRequest, setEditRequest] = useState<AssetRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
    fetchRequests();
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

  useEffect(() => {
    applyFilters();
  }, [requests, searchTerm, statusFilter, priorityFilter, departmentFilter, dateFilter]);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('asset_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profiles separately
      const userIds = [...new Set(requestsData?.map(r => r.requester_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .in('id', userIds);

      // Merge profiles with requests
      const requestsWithProfiles = requestsData?.map(request => ({
        ...request,
        profiles: profilesData?.find(p => p.id === request.requester_id),
      })) || [];

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    if (searchTerm) {
      filtered = filtered.filter(
        (req) =>
          req.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((req) => req.request_type === priorityFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter((req) => (req.department || req.profiles?.department) === departmentFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(
        (req) =>
          format(new Date(req.created_at), 'yyyy-MM-dd') ===
          format(dateFilter, 'yyyy-MM-dd')
      );
    }

    setFilteredRequests(filtered);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDepartmentFilter('all');
    setDateFilter(undefined);
  };

  const getStatusCount = (status: string) => {
    return requests.filter((req) => req.status === status).length;
  };

  const handleApprove = async (requestId: string) => {
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

      // Add to history
      await supabase.from('request_history').insert({
        request_id: requestId,
        action: 'approved',
        performed_by: user.id,
        remarks: 'Request approved',
      });

      toast.success('Request approved successfully!');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const { error: updateError } = await supabase
        .from('asset_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add to history
      await supabase.from('request_history').insert({
        request_id: requestId,
        action: 'rejected',
        performed_by: user.id,
        remarks: reason,
      });

      toast.success('Request rejected');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete request history first (foreign key constraint)
      await supabase
        .from('request_history')
        .delete()
        .eq('request_id', requestId);

      // Delete the request
      const { error: deleteError } = await supabase
        .from('asset_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      toast.success('Request deleted successfully');
      fetchRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  const departments = Array.from(
    new Set(requests.map((r) => r.department || r.profiles?.department).filter(Boolean))
  );

  return (
    <div className="space-y-6 bg-[#f8f6ff] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Requests</h1>
          <p className="text-muted-foreground">Manage all asset requests and approvals</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-lg">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="space-y-2">
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 flex-1">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, 'dd-MM-yyyy') : 'dd-mm-yyyy'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={resetFilters} className="h-10">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon;
          const count = getStatusCount(status);
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'bg-card rounded-lg p-4 border-2 transition-all hover:shadow-md',
                statusFilter === status ? 'border-primary' : 'border-transparent'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', config.color, 'bg-opacity-10')}>
                  <Icon className={cn('h-5 w-5', config.color.replace('bg-', 'text-'))} />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            Asset Requests ({filteredRequests.length})
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Request Date</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead>Request ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>View</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request, index) => (
                <TableRow key={request.id} className={index % 2 === 1 ? 'bg-muted/50' : ''}>
                  <TableCell className="font-medium">{request.category}</TableCell>
                  <TableCell>
                    <Badge variant={request.request_type === 'express' ? 'destructive' : 'secondary'}>
                      {request.request_type === 'express' ? 'Express' : 'Regular'}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.profiles?.department || 'N/A'}</TableCell>
                  <TableCell>{request.profiles?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{format(new Date(request.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    {request.expected_delivery_date
                      ? format(new Date(request.expected_delivery_date), 'dd MMM yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs break-all">{request.id}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === 'approved'
                          ? 'default'
                          : request.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {statusConfig[request.status as keyof typeof statusConfig]?.label || request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewRequest(request)}
                      className="h-8"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => { setEditRequest(request); setIsCreateModalOpen(true); }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {userRole !== 'hr' && (request.status === 'pending' || request.status === 'in_progress') && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            className="h-8 border-green-500 text-green-600 hover:bg-green-50"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(request.id)}
                            className="h-8 border-red-500 text-red-600 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {userRole !== 'hr' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(request.id)}
                          className="h-8 border-red-500 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateRequestModal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) setEditRequest(null);
        }}
        onSuccess={() => {
          fetchRequests();
          setEditRequest(null);
        }}
        editRequest={editRequest ? {
          id: editRequest.id,
          category: editRequest.category,
          employment_type: (editRequest as any).employment_type,
          quantity: editRequest.quantity,
          specification: (editRequest as any).specification,
          reason: (editRequest as any).reason,
          location: (editRequest as any).location,
          department: (editRequest as any).department,
          expected_delivery_date: (editRequest as any).expected_delivery_date,
          request_type: editRequest.request_type === 'express' ? 'express' : 'regular',
          notes: editRequest.notes as any,
        } : null}
      />

      {viewRequest && (
        <ViewRequestModal
          request={viewRequest}
          open={!!viewRequest}
          onOpenChange={(open) => !open && setViewRequest(null)}
          onSuccess={fetchRequests}
        />
      )}
    </div>
  );
}
