import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const serviceSchema = z.object({
  asset_id: z.string().min(1, 'Asset is required'),
  service_type: z.string().min(1, 'Service type is required'),
  vendor: z.string().max(200, 'Vendor name must be less than 200 characters').optional(),
  cost: z.number().min(0, 'Cost must be positive').max(10000000, 'Cost is too high').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export function AddServiceModal({
  open,
  onOpenChange,
  onSuccess,
}: AddServiceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serviceDate, setServiceDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    asset_id: '',
    service_type: '',
    vendor: '',
    cost: '',
    description: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open]);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('id, asset_name, category')
      .order('asset_name');
    setAssets(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    // Validate
    try {
      serviceSchema.parse({
        asset_id: formData.asset_id,
        service_type: formData.service_type,
        vendor: formData.vendor || undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('service_history').insert({
        asset_id: formData.asset_id,
        service_type: formData.service_type,
        service_date: serviceDate.toISOString(),
        vendor: formData.vendor.trim() || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        performed_by: user.id,
      });

      if (error) throw error;

      onSuccess();
      onOpenChange(false);
      setFormData({
        asset_id: '',
        service_type: '',
        vendor: '',
        cost: '',
        description: '',
        notes: '',
      });
      setServiceDate(new Date());
      setErrors({});
    } catch (error) {
      console.error('Error adding service record:', error);
      toast.error('Failed to add service record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Service Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset *</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, asset_id: value });
                  setErrors({ ...errors, asset_id: '' });
                }}
                required
              >
                <SelectTrigger className={errors.asset_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.asset_name} ({asset.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.asset_id && (
                <p className="text-sm text-destructive">{errors.asset_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type *</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => {
                  setFormData({ ...formData, service_type: value });
                  setErrors({ ...errors, service_type: '' });
                }}
                required
              >
                <SelectTrigger className={errors.service_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warranty">Warranty</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="upgrade">Upgrade</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
              {errors.service_type && (
                <p className="text-sm text-destructive">{errors.service_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => {
                  setFormData({ ...formData, vendor: e.target.value });
                  setErrors({ ...errors, vendor: '' });
                }}
                placeholder="Service provider name"
                maxLength={200}
                className={errors.vendor ? 'border-red-500' : ''}
              />
              {errors.vendor && (
                <p className="text-sm text-destructive">{errors.vendor}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_date">Service Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(serviceDate, 'dd MMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={serviceDate}
                    onSelect={(date) => date && setServiceDate(date)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost (₹)</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={(e) => {
                  setFormData({ ...formData, cost: e.target.value });
                  setErrors({ ...errors, cost: '' });
                }}
                placeholder="0.00"
                className={errors.cost ? 'border-red-500' : ''}
              />
              {errors.cost && (
                <p className="text-sm text-destructive">{errors.cost}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                setErrors({ ...errors, description: '' });
              }}
              placeholder="Service details..."
              rows={3}
              maxLength={500}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => {
                setFormData({ ...formData, notes: e.target.value });
                setErrors({ ...errors, notes: '' });
              }}
              placeholder="Additional information (optional)"
              rows={2}
              maxLength={500}
              className={errors.notes ? 'border-red-500' : ''}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Service Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
