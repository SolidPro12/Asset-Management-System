import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';

interface AssetMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
  assetName: string | null;
}

interface MaintenanceSchedule {
  id: string;
  maintenance_type: string;
  frequency: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string;
  status: string;
  notes: string | null;
}

interface MaintenanceHistory {
  id: string;
  maintenance_type: string;
  maintenance_date: string;
  performed_by_name: string | null;
  cost: number | null;
  vendor: string | null;
  description: string | null;
  notes: string | null;
}

export function AssetMaintenanceModal({ open, onOpenChange, assetId, assetName }: AssetMaintenanceModalProps) {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedules');
  
  // New schedule form
  const [maintenanceType, setMaintenanceType] = useState('');
  const [frequency, setFrequency] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const { toast } = useToast();
  const { sendMaintenanceReminderEmail } = useEmailNotifications();

  useEffect(() => {
    if (open && assetId) {
      fetchSchedules();
      fetchHistory();
    }
  }, [open, assetId]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .eq('asset_id', assetId)
        .order('next_maintenance_date');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_history')
        .select('*')
        .eq('asset_id', assetId)
        .order('maintenance_date', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
    }
  };

  const handleAddSchedule = async () => {
    if (!assetId || !maintenanceType || !frequency || !nextDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('maintenance_schedules')
        .insert({
          asset_id: assetId,
          asset_name: assetName || '',
          maintenance_type: maintenanceType,
          frequency,
          next_maintenance_date: nextDate,
          notes: notes || null,
          created_by: user.id,
        });

      if (error) throw error;

      // Send email notification if asset has an assignee
      try {
        const { data: assetData } = await supabase
          .from('assets')
          .select('current_assignee_id')
          .eq('id', assetId)
          .single();

        if (assetData?.current_assignee_id) {
          const { data: assigneeData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', assetData.current_assignee_id)
            .single();

          if (assigneeData) {
            await sendMaintenanceReminderEmail({
              recipientEmail: assigneeData.email,
              recipientName: assigneeData.full_name,
              assetName: assetName || '',
              maintenanceType,
              scheduledDate: nextDate,
              frequency,
              notes: notes || undefined,
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the schedule creation if email fails
      }

      toast({
        title: 'Success',
        description: 'Maintenance schedule added successfully',
      });

      // Reset form
      setMaintenanceType('');
      setFrequency('');
      setNextDate('');
      setNotes('');
      
      fetchSchedules();
    } catch (error: any) {
      console.error('Error adding schedule:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add maintenance schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asset Maintenance - {assetName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedules">
              <Calendar className="h-4 w-4 mr-2" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="add">
              <Loader2 className="h-4 w-4 mr-2" />
              Add Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="space-y-4">
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No maintenance schedules found
              </p>
            ) : (
              schedules.map((schedule) => (
                <Card key={schedule.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{schedule.maintenance_type}</h4>
                      <p className="text-sm text-muted-foreground">
                        Frequency: {schedule.frequency}
                      </p>
                      {schedule.last_maintenance_date && (
                        <p className="text-sm text-muted-foreground">
                          Last: {new Date(schedule.last_maintenance_date).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-sm font-medium mt-1">
                        Next: {new Date(schedule.next_maintenance_date).toLocaleDateString()}
                      </p>
                      {schedule.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{schedule.notes}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(schedule.status)}`}>
                      {schedule.status}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No maintenance history found
              </p>
            ) : (
              history.map((record) => (
                <Card key={record.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{record.maintenance_type}</h4>
                      <span className="text-sm text-muted-foreground">
                        {new Date(record.maintenance_date).toLocaleDateString()}
                      </span>
                    </div>
                    {record.performed_by_name && (
                      <p className="text-sm text-muted-foreground">
                        Performed by: {record.performed_by_name}
                      </p>
                    )}
                    {record.vendor && (
                      <p className="text-sm text-muted-foreground">Vendor: {record.vendor}</p>
                    )}
                    {record.cost && (
                      <p className="text-sm font-medium">Cost: ₹{record.cost.toLocaleString()}</p>
                    )}
                    {record.description && (
                      <p className="text-sm">{record.description}</p>
                    )}
                    {record.notes && (
                      <p className="text-sm text-muted-foreground italic">{record.notes}</p>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Maintenance Type *</Label>
                <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventive Maintenance">Preventive Maintenance</SelectItem>
                    <SelectItem value="Software Update">Software Update</SelectItem>
                    <SelectItem value="Hardware Inspection">Hardware Inspection</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="Battery Replacement">Battery Replacement</SelectItem>
                    <SelectItem value="Component Upgrade">Component Upgrade</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Semi-Annually">Semi-Annually</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Next Maintenance Date *</Label>
                <Input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this maintenance schedule..."
                  rows={3}
                />
              </div>

              <Button onClick={handleAddSchedule} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Maintenance Schedule
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}