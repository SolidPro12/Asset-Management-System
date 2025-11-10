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
import { format } from 'date-fns';

interface Ticket {
  id: string;
  ticket_id: string;
  asset_id: string;
  asset_name: string;
  location: string;
  title: string;
  description: string;
  priority: string;
  issue_category: string;
  department: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  completed_at: string | null;
  assigned_to_name?: string;
}

interface ViewTicketModalProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewTicketModal({
  ticket,
  open,
  onOpenChange,
}: ViewTicketModalProps) {
  const [assignedToName, setAssignedToName] = useState<string>('Unassigned');

  useEffect(() => {
    if (open && ticket?.assigned_to) {
      fetchAssignedToName();
    } else if (open && ticket) {
      setAssignedToName('Unassigned');
    }
  }, [open, ticket]);

  const fetchAssignedToName = async () => {
    if (!ticket?.assigned_to) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ticket.assigned_to)
        .single();

      if (data) {
        setAssignedToName(data.full_name);
      }
    } catch (error) {
      console.error('Error fetching assigned to name:', error);
      setAssignedToName('Unknown');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      critical: 'destructive',
    };
    return <Badge variant={variants[priority]}>{priority.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      open: 'default',
      in_progress: 'secondary',
      resolved: 'outline',
      closed: 'secondary',
    };
    return (
      <Badge variant={variants[status]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Ticket Details</span>
            <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
              {ticket.ticket_id}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Ticket ID</Label>
              <p className="font-mono text-sm">{ticket.ticket_id}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
              <div>{getStatusBadge(ticket.status)}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Priority</Label>
              <div>{getPriorityBadge(ticket.priority)}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Issue Category</Label>
              <p className="text-sm capitalize">{ticket.issue_category}</p>
            </div>
          </div>

          {/* Asset Information */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Asset Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Asset ID</Label>
                <p className="font-mono text-xs text-muted-foreground">
                  {ticket.asset_id ? `${ticket.asset_id.slice(0, 8)}...` : 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Asset Name</Label>
                <p className="text-sm font-medium">{ticket.asset_name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Location</Label>
                <p className="text-sm">{ticket.location}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Department</Label>
                <p className="text-sm">{ticket.department}</p>
              </div>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Ticket Details</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Title</Label>
                <p className="text-sm font-medium">{ticket.title}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Description</Label>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {ticket.description}
                </p>
              </div>
            </div>
          </div>

          {/* Assignment & Dates */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Assignment & Timeline</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Assigned To</Label>
                <p className="text-sm">{ticket.assigned_to_name || assignedToName}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Created Date</Label>
                <p className="text-sm">
                  {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              {ticket.completed_at && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Completed Date</Label>
                  <p className="text-sm">
                    {format(new Date(ticket.completed_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

