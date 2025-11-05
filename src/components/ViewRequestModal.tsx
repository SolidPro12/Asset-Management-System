import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface ViewRequestModalProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ViewRequestModal({
  request,
  open,
  onOpenChange,
  onSuccess,
}: ViewRequestModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(request.status);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleStatusUpdate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const updateData: any = {
        status,
      };

      if (status === 'approved') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('asset_requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Request updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Category</Label>
              <p className="font-medium">{request.category}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Quantity</Label>
              <p className="font-medium">{request.quantity}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Requested By</Label>
              <p className="font-medium">{request.profiles?.full_name || 'Unknown'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Department</Label>
              <p className="font-medium">{request.profiles?.department || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Request Date</Label>
              <p className="font-medium">
                {format(new Date(request.created_at), 'dd MMM yyyy')}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Priority</Label>
              <Badge variant="default">{request.request_type}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Reason</Label>
            <p className="font-medium">{request.reason}</p>
          </div>

          {request.notes && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Notes</Label>
              <p className="text-sm">{request.notes}</p>
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Update Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === 'rejected' && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection"
                  rows={3}
                />
              </div>
            )}

            {request.rejection_reason && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Previous Rejection Reason</Label>
                <p className="text-sm text-destructive">{request.rejection_reason}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Close
            </Button>
            <Button onClick={handleStatusUpdate} disabled={loading}>
              {loading ? 'Updating...' : 'Update Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
