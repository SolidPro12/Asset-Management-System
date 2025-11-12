import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EditTicketModal } from '@/components/EditTicketModal';
import { TicketHistoryModal } from '@/components/TicketHistoryModal';
import { ViewTicketModal } from '@/components/ViewTicketModal';
import { DEPARTMENTS } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, History, XCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Configurable bucket name for ticket attachments
const TICKET_BUCKET = (import.meta as any).env?.VITE_SUPABASE_TICKET_BUCKET || 'ticket-attachments';

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

const MyTickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [historyTicket, setHistoryTicket] = useState<{ id: string; ticket_id: string } | null>(null);
  const [cancelTicket, setCancelTicket] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState({
    asset_id: '',
    asset_name: '',
    location: '',
    title: '',
    description: '',
    priority: 'medium',
    issue_category: 'hardware',
    department: '',
    deadline : '',
  });

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyTickets();
      fetchMyAssets();
    }
  }, [user]);

  const fetchMyTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch assigned to names
      const ticketsWithNames = await Promise.all(
        (data || []).map(async (ticket) => {
          if (ticket.assigned_to) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', ticket.assigned_to)
              .single();
            return { ...ticket, assigned_to_name: profile?.full_name || 'Unknown' };
          }
          return { ...ticket, assigned_to_name: 'Unassigned' };
        })
      );

      setTickets(ticketsWithNames);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_allocations')
        .select('assets(*)')
        .eq('employee_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setAssets(data?.map((d: any) => d.assets) || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };


  const handleAssetChange = (assetId: string) => {
    const selectedAsset = assets.find((a) => a.id === assetId);
    if (selectedAsset) {
      setFormData({
        ...formData,
        asset_id: assetId,
        asset_name: selectedAsset.asset_name,
        location: selectedAsset.location || '',
        department: selectedAsset.department || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!formData.asset_id) {
      toast({
        title: 'Error',
        description: 'Please select an asset',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a description',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.location.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a location',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.department.trim()) {
      toast({
        title: 'Error',
        description: 'Department is required',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a ticket',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (attachmentFile && attachmentFile.type !== 'image/png') {
        toast({ title: 'Invalid file', description: 'Only PNG files are allowed for damage evidence.', variant: 'destructive' });
        return;
      }
      console.log('Creating ticket with data:', {
        asset_id: formData.asset_id,
        asset_name: formData.asset_name,
        location: formData.location,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        issue_category: formData.issue_category,
        department: formData.department,
        created_by: user?.id,
        deadline: formData.deadline,
      });

      // Prepare insert data, ensuring no empty strings are sent
      // Let the database trigger handle ticket_id generation automatically
      // Upload attachment if provided
      let attachmentUrl: string | null = null;
      if (attachmentFile && user?.id) {
        const fileExt = attachmentFile.name.split('.').pop();
        const filePath = `tickets/${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(TICKET_BUCKET)
          .upload(filePath, attachmentFile, { upsert: true });
        if (uploadError) {
          if ((uploadError as any).message?.toLowerCase().includes('bucket') || (uploadError as any).error === 'Bucket not found') {
            toast({
              title: 'Storage bucket missing',
              description: `Bucket "${TICKET_BUCKET}" was not found. Ticket will be created without attachment. Configure the bucket to enable uploads.`,
              variant: 'destructive',
            });
            attachmentUrl = null; // continue without attachment
          } else {
            throw uploadError;
          }
        } else {
          const { data: publicData } = supabase.storage
            .from(TICKET_BUCKET)
            .getPublicUrl(filePath);
          attachmentUrl = publicData.publicUrl;
        }
      }
      const insertData: any = {
        ticket_id: null, // Set to null to let database trigger auto-generate
        asset_id: formData.asset_id || null,
        asset_name: formData.asset_name.trim(),
        location: formData.location.trim(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
        issue_category: formData.issue_category as 'hardware' | 'software' | 'network' | 'access',
        department: formData.department.trim(),
        created_by: user?.id || null,
        attachments: attachmentUrl,
      };
      if (formData.deadline) {
        insertData.deadline = formData.deadline;
      }

      // Convert empty strings to null for optional fields
      if (!insertData.asset_id || insertData.asset_id === '') insertData.asset_id = null;
      if (!insertData.created_by || insertData.created_by === '') insertData.created_by = null;
      
      // Ensure all required string fields are not empty (validation already done above, but double-check)
      if (insertData.asset_name === '') {
        toast({
          title: 'Error',
          description: 'Asset name cannot be empty',
          variant: 'destructive',
        });
        return;
      }
      if (insertData.location === '') {
        toast({
          title: 'Error',
          description: 'Location cannot be empty',
          variant: 'destructive',
        });
        return;
      }
      if (insertData.title === '') {
        toast({
          title: 'Error',
          description: 'Title cannot be empty',
          variant: 'destructive',
        });
        return;
      }
      if (insertData.description === '') {
        toast({
          title: 'Error',
          description: 'Description cannot be empty',
          variant: 'destructive',
        });
        return;
      }
      if (insertData.department === '') {
        toast({
          title: 'Error',
          description: 'Department cannot be empty',
          variant: 'destructive',
        });
        return;
      }

      let newTicket: any = null;
      let error: any = null;
      try {
        const res = await supabase.from('tickets').insert([insertData]).select().maybeSingle();
        newTicket = res.data; error = res.error;
      } catch (e: any) {
        error = e;
      }

      // If column doesn't exist yet (42703), retry without deadline
      if (error && (error.code === '42703' || (error.message || '').toLowerCase().includes('deadline'))) {
        delete insertData.deadline;
        const retry = await supabase.from('tickets').insert([insertData]).select().maybeSingle();
        newTicket = retry.data; error = retry.error;
      }

      if (error) {
        console.error('Ticket creation error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log('Ticket created successfully:', newTicket);

      // Log activity
      if (user && newTicket) {
        try {
          await supabase.from("user_activity_log").insert({
            user_id: user.id,
            activity_type: "ticket_created",
            description: `Created ticket: ${formData.title}`,
            entity_type: "ticket",
            entity_id: newTicket.id,
            metadata: {
              title: formData.title,
              priority: formData.priority,
              category: formData.issue_category,
            },
          });
        } catch (logError) {
          console.error("Failed to log ticket creation:", logError);
        }
      }

      toast({
        title: 'Success',
        description: 'Ticket created successfully',
      });

      setIsDialogOpen(false);
      setFormData({
        asset_id: '',
        asset_name: '',
        location: '',
        title: '',
        description: '',
        priority: 'medium',
        issue_category: 'hardware',
        department: '',
        deadline: '',
      });
      setAttachmentFile(null);
      fetchMyTickets();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelTicket = async () => {
    if (!cancelTicket) return;

    try {
      // Set to 'closed' which is guaranteed in queue/status mappings
      const { data, error } = await supabase
        .from('tickets')
        .update({ status: 'closed' })
        .eq('id', cancelTicket.id)
        .select('id,status')
        .single();
      if (error) throw error;

      // Apply returned status to UI immediately
      if (data?.status) {
        setTickets((prev) => prev.map((t) => t.id === cancelTicket.id ? { ...t, status: data.status as any } : t));
      }

      toast({ title: 'Success', description: 'Ticket cancelled successfully' });

      setCancelTicket(null);
      fetchMyTickets();
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
      on_hold: 'outline',
      cancelled: 'destructive',
    };
    const variant = variants[status] ?? 'secondary';
    return (
      <Badge variant={variant}>
        {String(status || '').replace('_', ' ').toUpperCase() || 'UNKNOWN'}
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
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Ticket ID</TableHead>
                <TableHead>Asset ID</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Completed Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground">
                    No tickets found. Create your first ticket!
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                        {ticket.ticket_id}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {ticket.asset_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{ticket.asset_name}</TableCell>
                    <TableCell>{ticket.location}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{ticket.issue_category}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{ticket.assigned_to_name}</TableCell>
                    <TableCell>{format(new Date(ticket.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {ticket.completed_at
                        ? format(new Date(ticket.completed_at), 'MMM dd, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewTicket(ticket)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setHistoryTicket({ id: ticket.id, ticket_id: ticket.ticket_id })}
                          title="View History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {ticket.status === 'open' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditTicket(ticket)}
                              title="Edit Ticket"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setCancelTicket(ticket)}
                              title="Cancel Ticket"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ViewTicketModal
        ticket={viewTicket}
        open={!!viewTicket}
        onOpenChange={(open) => !open && setViewTicket(null)}
      />

      <EditTicketModal
        open={!!editTicket}
        onOpenChange={(open) => !open && setEditTicket(null)}
        ticket={editTicket}
        onSuccess={fetchMyTickets}
      />

      <TicketHistoryModal
        open={!!historyTicket}
        onOpenChange={(open) => !open && setHistoryTicket(null)}
        ticketId={historyTicket?.id || ''}
        ticketNumber={historyTicket?.ticket_id || ''}
      />

      <AlertDialog open={!!cancelTicket} onOpenChange={(open) => !open && setCancelTicket(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel ticket {cancelTicket?.ticket_id}? This action will close the ticket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelTicket}>Yes, cancel ticket</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticket_id">Ticket ID</Label>
              <Input
                id="ticket_id"
                value="Auto-generated"
                readOnly
                disabled
                className="bg-muted font-mono text-muted-foreground italic"
              />
              <p className="text-xs text-muted-foreground">
                Ticket ID will be automatically generated when you create the ticket
              </p>
            </div>

            <div className="space-y-2">
              <Label>Asset ID *</Label>
              <Select value={formData.asset_id} onValueChange={handleAssetChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.asset_tag} - {asset.asset_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input value={formData.asset_name} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Guindy">Guindy</SelectItem>
                    <SelectItem value="Vandalur">Vandalur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the issue"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Deadline Date</Label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachment (PNG damage photo)</Label>
              <Input
                type="file"
                accept="image/png"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Issue Category *</Label>
                <Select
                  value={formData.issue_category}
                  onValueChange={(value) => setFormData({ ...formData, issue_category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="access">Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Ticket</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyTickets;
