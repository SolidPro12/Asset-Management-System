import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEPARTMENTS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  request_id?: string;
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
  specification?: string | null;
  employment_type?: string | null;
  location?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
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
  cancelled: { label: 'Cancelled', color: 'bg-gray-500', icon: XCircle },
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
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

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
    setCurrentPage(1);
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

  const canCancelRequest = (request: AssetRequest): { canCancel: boolean; reason?: string } => {
    // Cannot cancel if already cancelled
    if (request.status === 'cancelled') {
      return { canCancel: false, reason: 'Request is already cancelled' };
    }
    
    // Cannot cancel if already approved
    if (request.status === 'approved') {
      return { canCancel: false, reason: 'Cannot cancel approved requests' };
    }
    
    // Cannot cancel if in progress
    if (request.status === 'in_progress') {
      return { canCancel: false, reason: 'Cannot cancel requests in progress' };
    }
    
    // Cannot cancel if already fulfilled
    if (request.status === 'fulfilled') {
      return { canCancel: false, reason: 'Cannot cancel fulfilled requests' };
    }
    
    // Cannot cancel if already rejected
    if (request.status === 'rejected') {
      return { canCancel: false, reason: 'Cannot cancel rejected requests' };
    }
    
    // HR can only cancel pending requests
    if (userRole === 'hr' && request.status === 'pending') {
      return { canCancel: true };
    }
    
    // Admins can cancel any valid status
    if (userRole === 'admin' || userRole === 'super_admin') {
      return { canCancel: true };
    }
    
    return { canCancel: false, reason: 'You do not have permission to cancel this request' };
  };

  const openCancelDialog = (request: AssetRequest) => {
    const { canCancel, reason } = canCancelRequest(request);
    
    if (!canCancel) {
      toast.error(reason || 'Cannot cancel this request');
      return;
    }
    
    setCancelRequestId(request.id);
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!user || !cancelRequestId) return;
    
    setCancelSubmitting(true);
    try {
      // Update the request with cancellation data
      const { error: updateError } = await supabase
        .from('asset_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
        })
        .eq('id', cancelRequestId);

      if (updateError) throw updateError;

      // Add to history with proper action type
      await supabase.from('request_history').insert({
        request_id: cancelRequestId,
        action: 'cancelled',
        performed_by: user.id,
        remarks: 'Request cancelled by user',
      });

      toast.success('Request cancelled successfully');
      setCancelDialogOpen(false);
      setCancelRequestId(null);
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setCancelSubmitting(false);
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

  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentPageData = filteredRequests.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6 bg-[#f8f6ff] min-h-screen -m-6 p-6">
      

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Requests</h1>
        </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Request</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Are you sure you want to cancel this request?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelSubmitting}>
              No
            </Button>
            <Button onClick={confirmCancel} disabled={cancelSubmitting} className="bg-orange-600 hover:bg-orange-700">
              {cancelSubmitting ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            className="h-10 bg-white"
          />
        </div>

        <div className="space-y-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue placeholder="All Request Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Request Types</SelectItem>
              <SelectItem value="express">Express</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-10 bg-white">
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
              <Button variant="outline" className="h-10 flex-1 bg-white">
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
          <Button variant="outline" size="icon" onClick={resetFilters} className="h-10 bg-white">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className={cn(
        "grid gap-4",
        userRole === 'hr' ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1 md:grid-cols-6"
      )}>
        {Object.entries(statusConfig)
          .filter(([status]) => {
            // For HR role, exclude in_progress and fulfilled status cards, but include cancelled
            if (userRole === 'hr') {
              return status !== 'in_progress' && status !== 'fulfilled';
            }
            return true;
          })
          .map(([status, config]) => {
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
              <TableHead>Request ID</TableHead>
              <TableHead>Asset Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Department Head</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Request Date</TableHead>
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
              currentPageData.map((request, index) => (
                <TableRow key={request.id} className={index % 2 === 1 ? 'bg-muted/50' : ''}>
                  <TableCell className="font-mono text-sm font-semibold">{request.request_id || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{request.category}</TableCell>
                  <TableCell>
                    <Badge variant={request.request_type === 'express' ? 'destructive' : 'secondary'}>
                      {request.request_type === 'express' ? 'Express' : 'Regular'}
                    </Badge>
                  </TableCell>
                  <TableCell>{(request as any).location || 'N/A'}</TableCell>
                  <TableCell>{request.department || 'N/A'}</TableCell>
                  <TableCell>{request.profiles?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{format(new Date(request.created_at), 'dd MMM yyyy')}</TableCell>
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
                      {/* Edit button - Show for HR on requests created by HR */}
                      {userRole === 'hr' && request.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => { setEditRequest(request); setIsCreateModalOpen(true); }}
                          title="Edit Request"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {/* Approve/Reject buttons - Only for admins on pending/in_progress requests */}
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
                      {/* Cancel button - Only for HR on pending requests */}
                      {userRole === 'hr' && (() => {
                        const { canCancel } = canCancelRequest(request);
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCancelDialog(request)}
                            disabled={!canCancel}
                            className={cn(
                              "h-8",
                              canCancel 
                                ? "border-orange-500 text-orange-600 hover:bg-orange-50" 
                                : "opacity-50 cursor-not-allowed"
                            )}
                            title={canCancel ? "Cancel Request" : canCancelRequest(request).reason}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        );
                      })()}
                      {/* Delete button - Only for admins */}
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
        <div className="p-4 border-t flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            {'<'}
          </Button>
          <span className="text-sm">{currentPage}/{totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            {'>'}
          </Button>
        </div>
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
          employment_type: editRequest.employment_type || undefined,
          quantity: editRequest.quantity,
          specification: editRequest.specification || editRequest.reason || undefined,
          reason: editRequest.reason,
          location: editRequest.location || undefined,
          department: editRequest.department || undefined,
          expected_delivery_date: editRequest.expected_delivery_date || null,
          request_type: (editRequest.request_type === 'express' || editRequest.request_type === 'urgent') ? 'express' : 'regular',
          notes: editRequest.notes || null,
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
