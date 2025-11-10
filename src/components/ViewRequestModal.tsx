import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

interface UserRole {
  role: string;
}

interface ViewRequestModalProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface RequestHistory {
  id: string;
  action: string;
  performed_by: string;
  remarks?: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

const rejectionSchema = z.object({
  reason: z.string()
    .trim()
    .min(10, { message: 'Rejection reason must be at least 10 characters' })
    .max(500, { message: 'Rejection reason must be less than 500 characters' }),
});

export function ViewRequestModal({
  request,
  open,
  onOpenChange,
  onSuccess,
}: ViewRequestModalProps) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (open && request) {
      fetchHistory();
    }
  }, [open, request]);

  const checkUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setUserRole(data?.role || null);
  };

  const fetchHistory = async () => {
    try {
      const { data: historyData, error } = await supabase
        .from('request_history')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch performer profiles
      if (historyData && historyData.length > 0) {
        const userIds = [...new Set(historyData.map(h => h.performed_by).filter(Boolean))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        // Merge profiles with history
        const historyWithProfiles = historyData.map(record => ({
          ...record,
          profiles: profilesData?.find(p => p.id === record.performed_by),
        }));

        setHistory(historyWithProfiles as any);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleApprove = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('asset_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Add to history
      await supabase.from('request_history').insert({
        request_id: request.id,
        action: 'approved',
        performed_by: user.id,
        remarks: 'Request approved',
      });

      toast.success('✅ Request approved successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user) return;

    // Validate rejection reason
    try {
      rejectionSchema.parse({ reason: rejectionReason });
      setValidationError('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.issues[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('asset_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Add to history
      await supabase.from('request_history').insert({
        request_id: request.id,
        action: 'rejected',
        performed_by: user.id,
        remarks: rejectionReason.trim(),
      });

      toast.success('❌ Request rejected with remarks');
      onSuccess();
      onOpenChange(false);
      setShowRejectForm(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'fulfilled':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Request Details</DialogTitle>
          <p className="text-sm text-muted-foreground">Request ID: {request.request_id || 'N/A'}</p>
        </DialogHeader>

        {/* Request Information Card */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-4">Request Information</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Asset Category</Label>
              <p className="font-medium capitalize">{request.category}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Priority</Label>
              <div>
                <Badge variant={getPriorityColor(request.request_type) as any} className="capitalize">
                  {request.request_type}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Department</Label>
              <p className="font-medium">{request.department || request.profiles?.department || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Requested By</Label>
              <p className="font-medium">{request.profiles?.full_name || 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Request Date</Label>
              <p className="font-medium">
                {format(new Date(request.created_at), 'dd MMM yyyy')}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Request ID</Label>
              <p className="font-medium">{request.request_id || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Expected Delivery Date</Label>
              <p className="font-medium">
                {request.expected_delivery_date ? (
                  format(new Date(request.expected_delivery_date), 'dd MMM yyyy')
                ) : (
                  'N/A'
                )}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Status</Label>
              <div>
                <Badge className={getStatusColor(request.status)}>
                  {request.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Quantity</Label>
              <p className="font-medium">{request.quantity}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Specification</Label>
              <p className="font-medium">{request.reason}</p>
            </div>
          </div>

          {request.notes && (
            <div className="mt-4 space-y-1">
              <Label className="text-sm text-muted-foreground">Additional Notes</Label>
              <p className="text-sm bg-gray-50 p-3 rounded-lg">{request.notes}</p>
            </div>
          )}

          {request.rejection_reason && (
            <div className="mt-4 space-y-1">
              <Label className="text-sm text-muted-foreground">Rejection Reason</Label>
              <p className="text-sm text-destructive bg-red-50 p-3 rounded-lg border border-red-200">
                {request.rejection_reason}
              </p>
            </div>
          )}
        </div>

        {/* Approval History */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-4">Approval History</h3>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No approval history found.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div key={record.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={record.action === 'approved' ? 'default' : 'secondary'}>
                          {record.action.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(record.created_at), 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        By: {record.profiles?.full_name || 'System'}
                      </p>
                      {record.remarks && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Remarks: {record.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rejection Form */}
        {showRejectForm && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <Label htmlFor="rejection-reason" className="text-sm font-semibold">
              Reason for Rejection *
            </Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setValidationError('');
              }}
              placeholder="Please provide a detailed reason (min 10 characters)..."
              rows={4}
              maxLength={500}
              className={validationError ? 'border-red-500' : ''}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason('');
                  setValidationError('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 justify-end border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Close
          </Button>
          {userRole !== 'hr' && (request.status === 'pending' || request.status === 'in_progress') && !showRejectForm && (
            <>
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Approving...' : 'Approve Request'}
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                variant="destructive"
              >
                Reject Request
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
