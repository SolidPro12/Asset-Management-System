import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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
  created_by_name?: string;
  assigned_to_name?: string;
}

const TicketQueue = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itStaff, setItStaff] = useState<any[]>([]);
  const [updateData, setUpdateData] = useState({
    status: '',
    assigned_to: '',
  });

  useEffect(() => {
    fetchAllTickets();
    fetchItStaff();
  }, []);

  const fetchAllTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator and assignee names
      const ticketsWithNames = await Promise.all(
        (data || []).map(async (ticket) => {
          let createdByName = 'Unknown';
          let assignedToName = 'Unassigned';

          if (ticket.created_by) {
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', ticket.created_by)
              .single();
            if (creatorProfile) createdByName = creatorProfile.full_name;
          }

          if (ticket.assigned_to) {
            const { data: assigneeProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', ticket.assigned_to)
              .single();
            if (assigneeProfile) assignedToName = assigneeProfile.full_name;
          }

          return {
            ...ticket,
            created_by_name: createdByName,
            assigned_to_name: assignedToName,
          };
        })
      );

      setTickets(ticketsWithNames);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles(id, full_name)')
        .in('role', ['super_admin', 'admin']);

      if (error) throw error;
      setItStaff(data?.map((d: any) => d.profiles) || []);
    } catch (error) {
      console.error('Error fetching IT staff:', error);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    try {
      const updates: any = {};
      if (updateData.status) updates.status = updateData.status;
      if (updateData.assigned_to) updates.assigned_to = updateData.assigned_to;
      if (updateData.status === 'resolved' || updateData.status === 'closed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ticket updated successfully',
      });

      setIsDialogOpen(false);
      setSelectedTicket(null);
      setUpdateData({ status: '', assigned_to: '' });
      fetchAllTickets();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Ticket Queue</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticket_id}</TableCell>
                    <TableCell>{ticket.created_by_name}</TableCell>
                    <TableCell>{ticket.asset_name}</TableCell>
                    <TableCell>{ticket.location}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{ticket.issue_category}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{ticket.assigned_to_name}</TableCell>
                    <TableCell>{format(new Date(ticket.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setUpdateData({
                            status: ticket.status,
                            assigned_to: ticket.assigned_to || '',
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Ticket - {selectedTicket?.ticket_id}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Asset</p>
                  <p className="font-medium">{selectedTicket.asset_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{selectedTicket.created_by_name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium">{selectedTicket.title}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{selectedTicket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={updateData.status}
                    onValueChange={(value) =>
                      setUpdateData({ ...updateData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={updateData.assigned_to}
                    onValueChange={(value) =>
                      setUpdateData({ ...updateData, assigned_to: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select IT staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {itStaff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTicket}>Update Ticket</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketQueue;
