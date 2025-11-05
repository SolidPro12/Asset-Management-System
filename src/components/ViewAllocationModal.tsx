import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface AllocationData {
  id?: string;
  asset_name: string;
  category: string;
  employee_name: string;
  department: string;
  allocated_date: string;
  return_date?: string;
  status: string;
  condition: string;
  notes?: string;
}

interface ViewAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: AllocationData | null;
}

export function ViewAllocationModal({
  open,
  onOpenChange,
  allocation,
}: ViewAllocationModalProps) {
  if (!allocation) return null;

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-blue-500">Active</Badge>;
    }
    return <Badge variant="secondary">Returned</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, string> = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      fair: 'bg-orange-500',
      poor: 'bg-red-500',
    };
    return <Badge className={variants[condition] || 'bg-gray-500'}>{condition}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Allocation Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Asset Name</p>
              <p className="font-medium">{allocation.asset_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium capitalize">{allocation.category}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Employee</p>
              <p className="font-medium">{allocation.employee_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{allocation.department || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Allocated Date</p>
              <p className="font-medium">
                {new Date(allocation.allocated_date).toLocaleDateString()}
              </p>
            </div>
            {allocation.return_date && (
              <div>
                <p className="text-sm text-muted-foreground">Return Date</p>
                <p className="font-medium">
                  {new Date(allocation.return_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(allocation.status)}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Condition</p>
              <div className="mt-1">{getConditionBadge(allocation.condition)}</div>
            </div>
          </div>

          {allocation.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-medium mt-1">{allocation.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
