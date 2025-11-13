import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Package, Calendar, DollarSign, MapPin, Building2, Tag } from 'lucide-react';

interface Asset {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_tag: string;
  category: string;
  brand: string | null;
  model: string | null;
  status: string;
  department: string | null;
  location: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  serial_number: string | null;
  warranty_end_date: string | null;
  notes: string | null;
  specifications: any;
}

interface ViewAssetModalProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800';
    case 'assigned':
      return 'bg-blue-100 text-blue-800';
    case 'under_maintenance':
      return 'bg-yellow-100 text-yellow-800';
    case 'retired':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function ViewAssetModal({ asset, open, onOpenChange, onEdit }: ViewAssetModalProps) {
  if (!asset) return null;

  const categoryName = asset.specifications?.originalCategory || asset.category;
  const formattedCategory = categoryName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Asset Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 pb-4 border-b">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{asset.asset_name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{formattedCategory}</p>
              <div className="mt-2">
                <Badge className={getStatusColor(asset.status)}>
                  {asset.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Asset ID</Label>
                <p className="font-mono text-sm font-medium">{asset.asset_id || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Asset Tag</Label>
                <p className="text-sm">{asset.asset_tag || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Model</Label>
                <p className="text-sm">{asset.model || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Brand</Label>
                <p className="text-sm">{asset.brand || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Serial Number</Label>
                <p className="font-mono text-xs">{asset.serial_number || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Category</Label>
                <p className="text-sm">{formattedCategory}</p>
              </div>
            </div>
          </div>

          {/* Location & Department */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Location & Department</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <p className="text-sm">{asset.location || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Department
                </Label>
                <p className="text-sm">{asset.department || '-'}</p>
              </div>
            </div>
          </div>

          {/* Purchase Information */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Purchase Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Purchase Date
                </Label>
                <p className="text-sm">
                  {asset.purchase_date 
                    ? new Date(asset.purchase_date).toLocaleDateString('en-US', { 
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : '-'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Purchase Cost
                </Label>
                <p className="text-sm font-medium">
                  {asset.purchase_cost ? `₹${asset.purchase_cost.toLocaleString()}` : '-'}
                </p>
              </div>
              {asset.warranty_end_date && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Warranty End Date</Label>
                  <p className="text-sm">
                    {new Date(asset.warranty_end_date).toLocaleDateString('en-US', { 
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Specifications */}
          {asset.specifications && Object.keys(asset.specifications).length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-4">Specifications</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(asset.specifications)
                  .filter(([key]) => key !== 'originalCategory')
                  .map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                      <p className="text-sm">{String(value) || '-'}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {asset.notes && (
            <div>
              <h4 className="text-lg font-semibold mb-4">Notes</h4>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {onEdit && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={onEdit}>
                Edit Asset
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

