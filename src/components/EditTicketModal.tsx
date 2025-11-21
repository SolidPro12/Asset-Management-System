import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';

const RequiredField = ({ children }: { children: React.ReactNode }) => (
  <>
    {children} <span className="text-red-500">*</span>
  </>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <p className="mt-1 text-sm text-red-500">{message}</p>
);
// Configurable bucket name for ticket attachments
const TICKET_BUCKET = (import.meta as any).env?.VITE_SUPABASE_TICKET_BUCKET || 'ticket-attachments';

interface EditTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    ticket_id: string;
    title: string;
    description: string;
    priority: string;
    issue_category: string;
    location: string;
    status: string;
  } | null;
  onSuccess: () => void;
}

export function EditTicketModal({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: EditTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({
    title: '',
    description: '',
    priority: '',
    issue_category: '',
    location: ''
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    issue_category: 'hardware',
    location: '',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        issue_category: ticket.issue_category,
        location: ticket.location,
      });
    }
  }, [ticket]);

  const validateForm = () => {
    const errors = {
      title: !formData.title.trim() ? 'Title is required' : '',
      description: !formData.description.trim() ? 'Description is required' : '',
      priority: !formData.priority ? 'Priority is required' : '',
      issue_category: !formData.issue_category ? 'Issue category is required' : '',
      location: !formData.location ? 'Location is required' : ''
    };
    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !validateForm()) return;

    setLoading(true);
    try {
      // Optional: upload new attachment
      let attachmentUrl: string | null = null;
      if (attachmentFile) {
        if (attachmentFile.type !== 'image/png') {
          toast.error('Only PNG files are allowed for damage evidence.');
          setLoading(false);
          return;
        }
        const fileExt = attachmentFile.name.split('.').pop();
        const filePath = `tickets/${ticket.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(TICKET_BUCKET)
          .upload(filePath, attachmentFile, { upsert: true });
        if (uploadError) {
          const msg = (uploadError as any).message?.toLowerCase() || '';
          const code = (uploadError as any).error || '';
          if (msg.includes('bucket') || code === 'Bucket not found') {
            toast.error(`Storage bucket "${TICKET_BUCKET}" was not found. Updating ticket without attachment.`);
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

      const updatePayload: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
        issue_category: formData.issue_category as 'hardware' | 'software' | 'network' | 'access',
        location: formData.location,
      };
      if (attachmentUrl) updatePayload.attachments = attachmentUrl;

      const { error } = await supabase
        .from('tickets')
        .update(updatePayload)
        .eq('id', ticket.id);

      if (error) throw error;

      toast.success('Ticket updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ticket {ticket.ticket_id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ticket ID</Label>
            <Input value={ticket.ticket_id} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              <RequiredField>Title</RequiredField>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className={formErrors.title ? 'border-red-500' : ''}
            />
            {formErrors.title && <ErrorMessage message={formErrors.title} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              <RequiredField>Description</RequiredField>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
              className={formErrors.description ? 'border-red-500' : ''}
            />
            {formErrors.description && <ErrorMessage message={formErrors.description} />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                <RequiredField>Priority</RequiredField>
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => {
                  setFormData({ ...formData, priority: value });
                  if (value) setFormErrors(prev => ({ ...prev, priority: '' }));
                }}
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
              <Label>
                <RequiredField>Issue Category</RequiredField>
              </Label>
              <Select
                value={formData.issue_category}
                onValueChange={(value) => {
                  setFormData({ ...formData, issue_category: value });
                  if (value) setFormErrors(prev => ({ ...prev, issue_category: '' }));
                }}
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

          <div className="space-y-2">
            <Label>
              <RequiredField>Location</RequiredField>
            </Label>
            <Select
              value={formData.location}
              onValueChange={(value) => {
                setFormData({ ...formData, location: value });
                if (value) setFormErrors(prev => ({ ...prev, location: '' }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Guindy">Guindy</SelectItem>
                <SelectItem value="Vandalur">Vandalur</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.location && <ErrorMessage message={formErrors.location} />}
          </div>

          <div className="space-y-2">
            <Label>Attachment (PNG)</Label>
            <Input
              type="file"
              accept="image/png"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              disabled={true}
              title="Image upload is read-only. Please contact support to update the image."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
