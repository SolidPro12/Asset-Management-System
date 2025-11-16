import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Asset {
  id: string;
  asset_id: string;
  asset_name: string;
  current_assignee_id: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

interface AssetTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
  onSuccess?: () => void;
}

export function AssetTransferModal({ open, onOpenChange, assetId, onSuccess }: AssetTransferModalProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [toUserId, setToUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && assetId) {
      fetchAssetDetails();
      fetchEmployees();
    }
  }, [open, assetId]);

  const fetchAssetDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, asset_id, asset_name, current_assignee_id')
        .eq('id', assetId)
        .single();

      if (error) throw error;
      setAsset(data);

      if (data.current_assignee_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', data.current_assignee_id)
          .single();
        
        if (userData) setCurrentUser(userData);
      }
    } catch (error: any) {
      console.error('Error fetching asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch asset details',
        variant: 'destructive',
      });
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleInitiateTransfer = async () => {
    if (!asset || !toUserId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a recipient',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const toUser = employees.find(e => e.id === toUserId);
      if (!toUser) throw new Error('Recipient not found');

      // Create transfer request
      const { error: transferError } = await supabase
        .from('asset_transfers')
        .insert({
          asset_id: asset.id,
          asset_name: asset.asset_name,
          from_user_id: asset.current_assignee_id,
          from_user_name: currentUser?.full_name || null,
          to_user_id: toUserId,
          to_user_name: toUser.full_name,
          initiated_by: user.id,
          status: 'pending',
          notes: notes || null,
        });

      if (transferError) throw transferError;

      // Send email notifications
      try {
        const { data: initiatorProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        // Notify current assignee if exists
        if (currentUser) {
          await supabase.functions.invoke('send-transfer-notification', {
            body: {
              recipientEmail: currentUser.email,
              recipientName: currentUser.full_name,
              assetName: asset.asset_name,
              initiatorName: initiatorProfile?.full_name || 'Admin',
              type: 'approval_request',
            },
          });
        }

        // Notify new assignee
        await supabase.functions.invoke('send-transfer-notification', {
          body: {
            recipientEmail: toUser.email,
            recipientName: toUser.full_name,
            assetName: asset.asset_name,
            initiatorName: initiatorProfile?.full_name || 'Admin',
            type: 'approval_request',
          },
        });
      } catch (emailError) {
        console.error('Error sending notifications:', emailError);
        // Don't fail the transfer if email fails
      }

      toast({
        title: 'Transfer Initiated',
        description: 'Transfer request created successfully. Awaiting approvals.',
      });

      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error('Error initiating transfer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate transfer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAsset(null);
    setCurrentUser(null);
    setToUserId('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Initiate Asset Transfer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Asset</Label>
            <div className="p-2 bg-muted rounded">
              <p className="font-medium">{asset?.asset_name}</p>
              <p className="text-sm text-muted-foreground">{asset?.asset_id}</p>
            </div>
          </div>

          {currentUser && (
            <div className="space-y-2">
              <Label>Current Assignee</Label>
              <div className="p-2 bg-muted rounded">
                <p className="font-medium">{currentUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Transfer To *</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter(emp => emp.id !== asset?.current_assignee_id)
                  .map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this transfer..."
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded text-sm">
            <p className="font-medium mb-1">Transfer Process:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              {currentUser && <li>Current assignee will receive email notification to approve</li>}
              <li>New assignee will receive email notification to approve</li>
              <li>Transfer completes when both parties approve</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleInitiateTransfer} disabled={loading || !toUserId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Initiate Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}