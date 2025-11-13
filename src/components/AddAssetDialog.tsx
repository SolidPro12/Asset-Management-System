import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddAsset } from '@/hooks/useAddAsset';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editAsset?: Asset | null;
}

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

const ASSET_CATEGORIES = [
  'Laptop',
  'Bags',
  'Chargers',
  'Headphones',
  'Wireless Keyboard & Mouse',
  'Wired Keyboard & Mouse',
  'Laptop Stand',
  'Mouse Pad',
  'Monitor',
  'Jabra Devices',
  'Pendrives',
  'TV',
  'Webcam',
  'Software',
];

const getAssetFields = (category: string) => {
  // Asset ID is always the first field for all categories
  const baseFields = ['assetId', 'model', 'serviceTag', 'purchaseDate', 'cost', 'note'];
  
  switch (category) {
    case 'Laptop':
      return ['assetId', 'model', 'serviceTag', 'ram', 'processor', 'organizationId', 'purchaseDate', 'cost', 'note'];
    case 'Monitor':
      return ['assetId', 'model', 'serviceTag', 'screenSize', 'resolution', 'refreshRate', 'connectivity', 'purchaseDate', 'cost', 'note'];
    case 'Headphones':
      return ['assetId', 'model', 'serviceTag', 'connectivity', 'purchaseDate', 'cost', 'note'];
    case 'TV':
      return ['assetId', 'model', 'serviceTag', 'screenSize', 'smartTV', 'purchaseDate', 'cost', 'note'];
    default:
      return baseFields;
  }
};

const getFieldLabel = (field: string) => {
  const labels: Record<string, string> = {
    assetId: 'Asset ID',
    model: 'Model',
    serviceTag: 'Service Tag',
    ram: 'RAM',
    processor: 'Processor',
    organizationId: 'Organization ID',
    purchaseDate: 'Purchase Date',
    cost: 'Cost',
    note: 'Notes',
    screenSize: 'Screen Size',
    resolution: 'Resolution',
    refreshRate: 'Refresh Rate',
    connectivity: 'Connectivity',
    smartTV: 'Smart TV',
  };
  return labels[field] || field;
};

export const AddAssetDialog = ({ open, onOpenChange, onSuccess, editAsset }: AddAssetDialogProps) => {
  const [category, setCategory] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { addAsset, isSubmitting } = useAddAsset();

  // Initialize form when editAsset changes
  useEffect(() => {
    if (editAsset && open) {
      const originalCategory = editAsset.specifications?.originalCategory || editAsset.category;
      const categoryDisplay = originalCategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      setCategory(categoryDisplay);
      setFormData({
        assetId: editAsset.asset_id,
        model: editAsset.model || '',
        serviceTag: editAsset.serial_number || editAsset.asset_tag || '',
        brand: editAsset.brand || '',
        purchaseDate: editAsset.purchase_date ? editAsset.purchase_date.split('T')[0] : '',
        cost: editAsset.purchase_cost || '',
        note: editAsset.notes || '',
        ...editAsset.specifications,
      });
    } else if (!editAsset && open) {
      setCategory('');
      setFormData({});
    }
  }, [editAsset, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      return;
    }

    if (editAsset) {
      // Update asset logic
      const success = await updateAsset(editAsset.id, formData, category);
      if (success) {
        setCategory('');
        setFormData({});
        onOpenChange(false);
        onSuccess?.();
      }
    } else {
      // Add asset logic
      const success = await addAsset(formData, category);
      if (success) {
        setCategory('');
        setFormData({});
        onOpenChange(false);
        onSuccess?.();
      }
    }
  };

  const updateAsset = async (assetId: string, formData: Record<string, any>, category: string) => {
    try {
      const getCategoryEnum = (cat: string): string => {
        const mapping: Record<string, string> = {
          'Laptop': 'laptop',
          'Monitor': 'monitor',
          'Headphones': 'headset',
          'Wireless Keyboard & Mouse': 'keyboard',
          'Wired Keyboard & Mouse': 'keyboard',
          'Mouse Pad': 'mouse',
          'TV': 'other',
          'Bags': 'other',
          'Chargers': 'other',
          'Laptop Stand': 'other',
          'Jabra Devices': 'other',
          'Pendrives': 'other',
        };
        return mapping[cat] || 'other';
      };

      const assetData = {
        asset_id: formData.assetId,
        asset_name: formData.model || category,
        asset_tag: formData.serviceTag || `${category}-${Date.now()}`,
        category: getCategoryEnum(category) as any,
        brand: formData.brand || null,
        model: formData.model || null,
        serial_number: formData.serviceTag || null,
        purchase_date: formData.purchaseDate || null,
        purchase_cost: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.note || null,
        specifications: {
          ...formData,
          originalCategory: category,
        },
      };

      const { error } = await supabase
        .from('assets')
        .update(assetData)
        .eq('id', assetId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Asset updated successfully!',
      });

      return true;
    } catch (error: any) {
      console.error('Asset update error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update asset. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    if (!editAsset) {
      setFormData({});
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderField = (field: string) => {
    if (field === 'smartTV') {
      return (
        <div key={field} className="flex items-center space-x-2">
          <Checkbox
            id={field}
            checked={formData[field] || false}
            onCheckedChange={(checked) => handleInputChange(field, checked)}
          />
          <Label htmlFor={field} className="cursor-pointer">
            {getFieldLabel(field)}
          </Label>
        </div>
      );
    }

    if (field === 'note') {
      return (
        <div key={field} className="space-y-2 md:col-span-2">
          <Label htmlFor={field}>{getFieldLabel(field)}</Label>
          <Input
            id={field}
            type="text"
            value={formData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`}
          />
        </div>
      );
    }

    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={field}>
          {getFieldLabel(field)}
          {['assetId', 'model', 'serviceTag'].includes(field) && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          id={field}
          type={field === 'purchaseDate' ? 'date' : field === 'cost' ? 'number' : 'text'}
          value={formData[field] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`}
          required={['assetId', 'model', 'serviceTag'].includes(field)}
          disabled={editAsset && field === 'assetId'}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editAsset ? 'Edit Asset' : 'Add New Asset'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category">
              Asset Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={handleCategoryChange} required disabled={!!editAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Select asset category" />
              </SelectTrigger>
              <SelectContent>
                {[...ASSET_CATEGORIES]
                  .sort((a, b) => {
                    const ai = a.toLowerCase();
                    const bi = b.toLowerCase();
                    if (ai === 'other' && bi !== 'other') return 1;
                    if (bi === 'other' && ai !== 'other') return -1;
                    return ai.localeCompare(bi);
                  })
                  .map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getAssetFields(category).map((field) => renderField(field))}
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCategory('');
                setFormData({});
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!category || isSubmitting}>
              {isSubmitting ? (editAsset ? 'Updating...' : 'Adding...') : (editAsset ? 'Update Asset' : 'Add Asset')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
