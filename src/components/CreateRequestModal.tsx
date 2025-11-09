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
import { DEPARTMENTS } from '@/lib/constants';

const LOCATIONS = ['Guindy', 'Vandalur'];

const requestSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  employment_type: z.string().min(1, 'Employment type is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
  specification: z.string().min(10, 'Specification must be at least 10 characters').max(500, 'Specification must be less than 500 characters'),
  location: z.string().min(1, 'Location is required'),
  department: z.string().min(1, 'Department is required'),
  expected_delivery_date: z.date({ message: 'Expected delivery date is required' }),
  request_type: z.enum(['regular', 'express']),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

interface CreateRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editRequest?: {
    id: string;
    category: string;
    employment_type?: string;
    quantity: number;
    specification?: string;
    reason?: string;
    location?: string;
    department?: string;
    expected_delivery_date?: string | null;
    request_type: 'regular' | 'express';
    notes?: string | null;
  } | null;
}

export function CreateRequestModal({
  open,
  onOpenChange,
  onSuccess,
  editRequest,
}: CreateRequestModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestId, setRequestId] = useState('');
  const [formData, setFormData] = useState({
    category: '',
    employment_type: '',
    quantity: 1,
    specification: '',
    location: '',
    department: '',
    expected_delivery_date: undefined as Date | undefined,
    request_type: 'regular' as 'regular' | 'express',
    notes: '',
  });

  // Initialize or reset form when opening/closing or when editRequest changes
  useEffect(() => {
    if (open) {
      if (!editRequest) {
        fetchNextRequestId();
        // Reset form for new request
        setFormData({
          category: '',
          employment_type: '',
          quantity: 1,
          specification: '',
          location: '',
          department: '',
          expected_delivery_date: undefined,
          request_type: 'regular',
          notes: '',
        });
        setErrors({});
      } else {
        // Populate form for editing
        setFormData({
          category: editRequest.category || '',
          employment_type: editRequest.employment_type || '',
          quantity: editRequest.quantity ?? 1,
          specification: (editRequest.specification || editRequest.reason || ''),
          location: editRequest.location || '',
          department: editRequest.department || '',
          expected_delivery_date: editRequest.expected_delivery_date 
            ? (editRequest.expected_delivery_date instanceof Date 
                ? editRequest.expected_delivery_date 
                : new Date(editRequest.expected_delivery_date))
            : undefined,
          request_type: editRequest.request_type === 'express' || editRequest.request_type === 'urgent' 
            ? 'express' 
            : 'regular',
          notes: editRequest.notes || '',
        });
        setErrors({});
      }
    } else {
      // Reset when modal closes
      setFormData({
        category: '',
        employment_type: '',
        quantity: 1,
        specification: '',
        location: '',
        department: '',
        expected_delivery_date: undefined,
        request_type: 'regular',
        notes: '',
      });
      setErrors({});
      setRequestId('');
    }
  }, [open, editRequest]);

  const fetchNextRequestId = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_request_id');
      if (error) throw error;
      setRequestId(data);
    } catch (error) {
      console.error('Error fetching request ID:', error);
      setRequestId('AR???');
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    // Validate form data
    try {
      requestSchema.parse({
        category: formData.category,
        employment_type: formData.employment_type,
        quantity: formData.quantity,
        specification: formData.specification,
        location: formData.location,
        department: formData.department,
        expected_delivery_date: formData.expected_delivery_date,
        request_type: formData.request_type,
        notes: formData.notes,
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
      if (editRequest) {
        // Update existing request
        const { error: updateError } = await supabase
          .from('asset_requests')
          .update({
            category: formData.category as any,
            employment_type: formData.employment_type || null,
            quantity: formData.quantity,
            specification: formData.specification.trim() || null,
            location: formData.location.trim() || null,
            department: formData.department || null,
            expected_delivery_date: formData.expected_delivery_date?.toISOString().split('T')[0] || null,
            request_type: formData.request_type as any,
            notes: formData.notes.trim() || null,
            reason: formData.specification.trim() || null, // Keep reason for backward compatibility
          })
          .eq('id', editRequest.id);

        if (updateError) throw updateError;

        await supabase.from('request_history').insert({
          request_id: editRequest.id,
          action: 'updated',
          performed_by: user.id,
          remarks: 'Request updated',
        });

        toast.success('Request updated successfully');
      } else {
        // Create new request
        const { error: insertError } = await supabase.from('asset_requests').insert({
          requester_id: user.id,
          category: formData.category as any,
          employment_type: formData.employment_type,
          quantity: formData.quantity,
          specification: formData.specification.trim(),
          location: formData.location.trim(),
          department: formData.department,
          expected_delivery_date: formData.expected_delivery_date?.toISOString().split('T')[0],
          request_type: formData.request_type as any,
          notes: formData.notes.trim() || null,
          reason: formData.specification.trim(), // Keep reason for backward compatibility
        });

        if (insertError) throw insertError;

        // Add to history
        const { data: newRequest } = await supabase
          .from('asset_requests')
          .select('id')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (newRequest) {
          await supabase.from('request_history').insert({
            request_id: newRequest.id,
            action: 'created',
            performed_by: user.id,
            remarks: 'Request created',
          });
        }

        toast.success('Request created successfully');
      }

      onSuccess();
      onOpenChange(false);
      setErrors({});
    } catch (error) {
      console.error(editRequest ? 'Error updating request:' : 'Error creating request:', error);
      toast.error(editRequest ? 'Failed to update request' : 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRequest ? 'Edit Request' : 'Create New Request'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Request ID - only show for new requests */}
          {!editRequest && (
            <div className="space-y-2">
              <Label htmlFor="request_id">Request ID</Label>
              <Input
                id="request_id"
                value={requestId}
                readOnly
                className="bg-muted font-mono"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Asset Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData({ ...formData, category: value });
                  setErrors({ ...errors, category: '' });
                }}
                required
              >
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="keyboard">Keyboard</SelectItem>
                  <SelectItem value="mouse">Mouse</SelectItem>
                  <SelectItem value="headset">Headset</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment_type">Employment Type *</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => {
                  setFormData({ ...formData, employment_type: value });
                  setErrors({ ...errors, employment_type: '' });
                }}
                required
              >
                <SelectTrigger className={errors.employment_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extern">Extern</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                </SelectContent>
              </Select>
              {errors.employment_type && (
                <p className="text-sm text-destructive">{errors.employment_type}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Count *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="100"
              value={formData.quantity}
              onChange={(e) => {
                setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 });
                setErrors({ ...errors, quantity: '' });
              }}
              className={errors.quantity ? 'border-red-500' : ''}
              required
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specification">Specification *</Label>
            <Textarea
              id="specification"
              value={formData.specification}
              onChange={(e) => {
                setFormData({ ...formData, specification: e.target.value });
                setErrors({ ...errors, specification: '' });
              }}
              placeholder="Enter detailed specifications (min 10 characters)"
              maxLength={500}
              rows={4}
              className={errors.specification ? 'border-red-500' : ''}
              required
            />
            {errors.specification && (
              <p className="text-sm text-destructive">{errors.specification}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => {
                  setFormData({ ...formData, location: value });
                  setErrors({ ...errors, location: '' });
                }}
                required
              >
                <SelectTrigger className={errors.location ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => {
                  setFormData({ ...formData, department: value });
                  setErrors({ ...errors, department: '' });
                }}
                required
              >
                <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
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
              {errors.department && (
                <p className="text-sm text-destructive">{errors.department}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expected Delivery Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.expected_delivery_date && 'text-muted-foreground',
                    errors.expected_delivery_date && 'border-red-500'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expected_delivery_date ? (
                    format(formData.expected_delivery_date, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expected_delivery_date}
                  onSelect={(date) => {
                    setFormData({ ...formData, expected_delivery_date: date });
                    setErrors({ ...errors, expected_delivery_date: '' });
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.expected_delivery_date && (
              <p className="text-sm text-destructive">{errors.expected_delivery_date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Priority *</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={formData.request_type === 'regular' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormData({ ...formData, request_type: 'regular' })}
              >
                Regular Request
              </Button>
              <Button
                type="button"
                variant={formData.request_type === 'express' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormData({ ...formData, request_type: 'express' })}
              >
                Express Request
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => {
                setFormData({ ...formData, notes: e.target.value });
                setErrors({ ...errors, notes: '' });
              }}
              placeholder="Additional information (optional)"
              maxLength={500}
              rows={3}
              className={errors.notes ? 'border-red-500' : ''}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? (editRequest ? 'Updating...' : 'Creating...') 
                : (editRequest ? 'Update Request' : 'Create Request')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}