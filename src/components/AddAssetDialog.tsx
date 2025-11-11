import { useState } from 'react';
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

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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

export const AddAssetDialog = ({ open, onOpenChange, onSuccess }: AddAssetDialogProps) => {
  const [category, setCategory] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { addAsset, isSubmitting } = useAddAsset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      return;
    }

    const success = await addAsset(formData, category);
    
    if (success) {
      setCategory('');
      setFormData({});
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setFormData({});
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
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Asset</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category">
              Asset Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={handleCategoryChange} required>
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
              {isSubmitting ? 'Adding...' : 'Add Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
