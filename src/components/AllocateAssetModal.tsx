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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DEPARTMENTS } from '@/lib/constants';

interface Asset {
  id: string;
  asset_name: string;
  category: string;
  location?: string;
}

interface Employee {
  id: string;
  full_name: string;
  department: string;
}

interface AllocationData {
  id?: string;
  asset_name: string;
  category: string;
  employee_name: string;
  department: string;
  allocated_date: string;
  condition: string;
  location?: string;
}

interface AllocateAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation?: AllocationData | null;
  onSuccess: () => void;
}

const LOCATIONS = ['Guindy', 'Vandalur'];

export function AllocateAssetModal({
  open,
  onOpenChange,
  allocation,
  onSuccess,
}: AllocateAssetModalProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [allocatedDate, setAllocatedDate] = useState<Date>(new Date());
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAssets();
      fetchEmployees();

      if (allocation) {
        // Editing mode
        setCondition(allocation.condition);
        setAllocatedDate(new Date(allocation.allocated_date));
        setDepartment(allocation.department || '');
        setLocation(allocation.location || '');
        
        // Fetch asset location if not provided
        if (allocation.id && !allocation.location) {
          supabase
            .from('asset_allocations')
            .select('asset_id')
            .eq('id', allocation.id)
            .single()
            .then(({ data }) => {
              if (data?.asset_id) {
                supabase
                  .from('assets')
                  .select('location')
                  .eq('id', data.asset_id)
                  .single()
                  .then(({ data: assetData }) => {
                    if (assetData?.location) {
                      setLocation(assetData.location);
                    }
                  });
              }
            });
        }
      } else {
        // Reset for new allocation
        setSelectedAssetId('');
        setSelectedEmployeeId('');
        setDepartment('');
        setLocation('');
        setAllocatedDate(new Date());
        setCondition('good');
        setNotes('');
      }
    }
  }, [open, allocation]);

  // Auto-fill department when employee is selected
  useEffect(() => {
    if (selectedEmployeeId && !allocation) {
      const employee = employees.find((e) => e.id === selectedEmployeeId);
      if (employee && employee.department) {
        setDepartment(employee.department);
      }
    }
  }, [selectedEmployeeId, employees, allocation]);

  // Auto-fill location when asset is selected
  useEffect(() => {
    if (selectedAssetId && !allocation) {
      const asset = assets.find((a) => a.id === selectedAssetId);
      if (asset && asset.location) {
        setLocation(asset.location);
      }
    }
  }, [selectedAssetId, assets, allocation]);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, asset_name, category, location')
        .eq('status', 'available')
        .order('asset_name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async () => {
    if (!allocation && (!selectedAssetId || !selectedEmployeeId)) {
      toast({
        title: 'Error',
        description: 'Please select both asset and employee',
        variant: 'destructive',
      });
      return;
    }

    if (!department || !location) {
      toast({
        title: 'Error',
        description: 'Please select both department and location',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const asset = allocation ? null : assets.find((a) => a.id === selectedAssetId);
      const employee = allocation ? null : employees.find((e) => e.id === selectedEmployeeId);

      if (!allocation && (!asset || !employee)) {
        throw new Error('Invalid asset or employee selection');
      }

      if (allocation?.id) {
        // Update existing allocation
        const { error } = await supabase
          .from('asset_allocations')
          .update({
            department,
            condition,
            notes,
            allocated_date: allocatedDate.toISOString().split('T')[0],
          })
          .eq('id', allocation.id);

        if (error) throw error;

        // Update asset location if changed
        if (location) {
          const { data: allocationData } = await supabase
            .from('asset_allocations')
            .select('asset_id')
            .eq('id', allocation.id)
            .single();

          if (allocationData?.asset_id) {
            await supabase
              .from('assets')
              .update({ location })
              .eq('id', allocationData.asset_id);
          }
        }

        toast({
          title: 'Success',
          description: 'Allocation updated successfully',
        });
      } else {
        // Create new allocation
        const { error: insertError } = await supabase
          .from('asset_allocations')
          .insert([
            {
              asset_id: selectedAssetId,
              asset_name: asset!.asset_name,
              category: asset!.category as any,
              employee_id: selectedEmployeeId,
              employee_name: employee!.full_name,
              department,
              allocated_date: allocatedDate.toISOString().split('T')[0],
              condition,
              notes,
              allocated_by: user?.id,
              status: 'active',
            },
          ]);

        if (insertError) throw insertError;

        // Update asset status to assigned and location
        const updateData: any = {
          status: 'assigned',
          current_assignee_id: selectedEmployeeId,
        };
        if (location) {
          updateData.location = location;
        }

        const { error: updateError } = await supabase
          .from('assets')
          .update(updateData)
          .eq('id', selectedAssetId);

        if (updateError) throw updateError;

        toast({
          title: 'Success',
          description: 'Asset allocated successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to allocate asset',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {allocation ? 'Edit Allocation' : 'Allocate New Asset'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!allocation && (
            <>
              <div className="space-y-2">
                <Label>Asset</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_name} - {asset.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={department} onValueChange={setDepartment} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Select value={location} onValueChange={setLocation} required>
                  <SelectTrigger>
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
              </div>
            </>
          )}

          {allocation && (
            <>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={department} onValueChange={setDepartment} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Select value={location} onValueChange={setLocation} required>
                  <SelectTrigger>
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
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Allocation Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !allocatedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {allocatedDate ? format(allocatedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={allocatedDate}
                  onSelect={(date) => date && setAllocatedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : allocation ? 'Update' : 'Allocate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
