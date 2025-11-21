import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Eye, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Ticket {
  id: string;
  ticket_id: string;
  asset_id: string | null;
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
  attachments: string | null;
  created_by_name?: string;
  assigned_to_name?: string;
  updated_at?: string;
}

interface StatusHistory {
  status: string;
  changed_at: string;
  changed_by: string;
}

const TicketQueue = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [itStaff, setItStaff] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Calculate pagination values
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTickets = tickets.slice(startIndex, startIndex + pageSize);

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

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ticket status updated successfully',
      });

      fetchAllTickets();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    
    // Fetch status history (simulated - in production you'd have a separate table)
    const history: StatusHistory[] = [
      {
        status: 'open',
        changed_at: ticket.created_at,
        changed_by: ticket.created_by_name || 'System',
      },
    ];

    if (ticket.status !== 'open') {
      history.push({
        status: ticket.status,
        changed_at: ticket.updated_at || ticket.created_at,
        changed_by: 'Admin',
      });
    }

    setStatusHistory(history);
    setIsViewDialogOpen(true);
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
      on_hold: 'destructive',
      resolved: 'outline',
      closed: 'secondary',
    };
    const labels: Record<string, string> = {
      open: 'OPEN',
      in_progress: 'IN PROGRESS',
      on_hold: 'ON HOLD',
      resolved: 'COMPLETED',
      closed: 'CLOSED',
    };
    return (
      <Badge variant={variants[status]}>
        {labels[status] || status.toUpperCase()}
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
    <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f6ff] min-h-screen -m-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ticket Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track all support tickets</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ticket Queue</CardTitle>
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, tickets.length)} of {tickets.length} tickets
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Asset ID</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Update Status</TableHead>
                <TableHead>View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticket_id}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {ticket.asset_id ? `${ticket.asset_id.slice(0, 8)}...` : 'N/A'}
                    </TableCell>
                    <TableCell>{ticket.asset_name}</TableCell>
                    <TableCell>{ticket.location}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ticket.title}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="capitalize">{ticket.issue_category}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{ticket.assigned_to_name || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) => handleStatusUpdate(ticket.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="resolved">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {!loading && tickets.length > 0 && (
            <div className="p-3 flex items-center justify-center w-full border-t">
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  className="hidden h-8 w-8 p-0 lg:flex"
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 p-0"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm">
                    Page {currentPage} of {Math.max(1, totalPages)}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">Go to:</span>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, totalPages)}
                      value={currentPage}
                      onChange={(e) => {
                        const page = e.target.value ? Number(e.target.value) : 1;
                        setCurrentPage(Math.min(Math.max(1, page), totalPages));
                      }}
                      className="w-12 h-8 text-sm border rounded text-center"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 p-0"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="hidden h-8 w-8 p-0 lg:flex"
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Ticket Details - {selectedTicket?.ticket_id}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{selectedTicket.issue_category}</p>
                </div>
              </div>

              {/* Asset & Location Info */}
              <div>
                <h3 className="font-semibold mb-3">Asset Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Asset ID</p>
                    <p className="font-medium font-mono text-sm">{selectedTicket.asset_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Asset Name</p>
                    <p className="font-medium">{selectedTicket.asset_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedTicket.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{selectedTicket.department}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Ticket Details */}
              <div>
                <h3 className="font-semibold mb-3">Ticket Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Title</p>
                    <p className="font-medium text-lg">{selectedTicket.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Assignment Info */}
              <div>
                <h3 className="font-semibold mb-3">Assignment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p className="font-medium">{selectedTicket.created_by_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    <p className="font-medium">{selectedTicket.assigned_to_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedTicket.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Date</p>
                    <p className="font-medium">
                      {selectedTicket.completed_at
                        ? format(new Date(selectedTicket.completed_at), 'MMM dd, yyyy HH:mm')
                        : 'Not completed'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Attachments */}
              <div>
                <h3 className="font-semibold mb-3">Attachments</h3>
                {selectedTicket.attachments ? (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{selectedTicket.attachments}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments</p>
                )}
              </div>

              <Separator />

              {/* Status Timeline */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status Timeline
                </h3>
                <div className="space-y-3">
                  {statusHistory.map((history, index) => (
                    <div key={index} className="flex items-start gap-3 pl-4 border-l-2 border-primary pb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(history.status)}
                          <span className="text-sm text-muted-foreground">
                            by {history.changed_by}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(history.changed_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Select
                  value={selectedTicket.status}
                  onValueChange={(value) => {
                    handleStatusUpdate(selectedTicket.id, value);
                    setIsViewDialogOpen(false);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="resolved">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketQueue;
