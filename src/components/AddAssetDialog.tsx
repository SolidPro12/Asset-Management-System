import { useState, useEffect, ChangeEvent } from 'react';
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
  'Desktop PC',
  'Mobile',
  'Tablets',
  'Wireless Keyboard & Mouse',
  'Wired Keyboard & Mouse',
  'Wireless Keyboard',
  'Wired Keyboard',
  'Wired Mouse',
  'Wireless Mouse',
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
  const baseFields = ['assetId', 'assetType', 'model', 'serviceTag', 'purchaseDate', 'cost', 'note'];
  
  switch (category) {
    case 'Laptop':
      return [
        'assetId',
        'assetType',
        'model',
        'serviceTag',
        'ram',
        'processor',
        'storage',
        'operatingSystem',
        'organizationId',
        'purchaseDate',
        'cost',
        'note',
      ];
    case 'Bags':
      return ['assetId', 'assetType', 'brand', 'serviceTag', 'purchaseDate', 'cost', 'bagAttachment', 'note'];
    case 'Monitor':
      return [
        'assetId',
        'assetType',
        'model',
        'serviceTag',
        'screenSize',
        'resolution',
        'refreshRate',
        'connectivity',
        'color',
        'purchaseDate',
        'cost',
        'note',
      ];
    case 'Headphones':
      return ['assetId', 'assetType', 'model', 'serviceTag', 'connectivity', 'purchaseDate', 'cost', 'note'];
    case 'TV':
      return ['assetId', 'assetType', 'model', 'serviceTag', 'screenSize', 'smartTV', 'purchaseDate', 'cost', 'note'];
    case 'Pendrives':
      return ['assetId', 'assetType', 'size', 'serialNumber', 'purchaseDate', 'cost', 'note'];
    default:
      return baseFields;
  }
};

const getFieldLabel = (field: string) => {
  const labels: Record<string, string> = {
    assetId: 'Asset ID',
    assetType: 'Asset Type',
    model: 'Model',
    serviceTag: 'Service Tag',
    ram: 'RAM',
    processor: 'Processor',
    organizationId: 'Organization ID',
    purchaseDate: 'Purchase Date',
    cost: 'Cost',
    brand: 'Brand',
    storage: 'Storage',
    operatingSystem: 'Operating System',
    bagAttachment: 'Image Attachment',
    color: 'Colour',
    size: 'Size',
    serialNumber: 'Serial No',
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
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
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
        serialNumber: editAsset.serial_number || '',
        brand: editAsset.brand || '',
        purchaseDate: editAsset.purchase_date ? editAsset.purchase_date.split('T')[0] : '',
        cost: editAsset.purchase_cost || '',
        note: editAsset.notes || '',
        ...editAsset.specifications,
      });
    } else if (!editAsset && open) {
      setCategory('');
      setFormData({});
      setAttachmentFile(null);
    }
  }, [editAsset, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      return;
    }

    if (!formData.assetType) {
      toast({
        title: 'Error',
        description: 'Asset Type is required.',
        variant: 'destructive',
      });
      return;
    }

    let submitData = { ...formData };

    if (category === 'Bags' && attachmentFile) {
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `bags/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('asset-attachments')
        .upload(fileName, attachmentFile);

      if (uploadError) {
        toast({
          title: 'Error',
          description: 'Failed to upload attachment. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('asset-attachments')
        .getPublicUrl(fileName);

      submitData = {
        ...submitData,
        attachmentUrl: publicUrlData.publicUrl,
      };
    }

    if (editAsset) {
      // Update asset logic
      const success = await updateAsset(editAsset.id, submitData, category);
      if (success) {
        setCategory('');
        setFormData({});
        setAttachmentFile(null);
        onOpenChange(false);
        onSuccess?.();
      }
    } else {
      // Add asset logic
      const success = await addAsset(submitData, category);
      if (success) {
        setCategory('');
        setFormData({});
        setAttachmentFile(null);
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
          'Desktop PC': 'desktop',
          'Monitor': 'monitor',
          'Headphones': 'headset',
          'Mobile': 'phone',
          'Tablets': 'tablet',
          'Wireless Keyboard & Mouse': 'keyboard',
          'Wired Keyboard & Mouse': 'keyboard',
          'Wireless Keyboard': 'keyboard',
          'Wired Keyboard': 'keyboard',
          'Wired Mouse': 'mouse',
          'Wireless Mouse': 'mouse',
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
        asset_tag: formData.serialNumber || formData.serviceTag || `${category}-${Date.now()}`,
        category: getCategoryEnum(category) as any,
        brand: formData.brand || null,
        model: formData.model || null,
        serial_number: formData.serialNumber || formData.serviceTag || null,
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
    if (field === 'assetType') {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor="assetType">
            {getFieldLabel(field)} <span className="text-destructive ml-1">*</span>
          </Label>
          <Select
            value={formData.assetType || ''}
            onValueChange={(value) => handleInputChange('assetType', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Physical">Physical</SelectItem>
              <SelectItem value="Digital">Digital</SelectItem>
              <SelectItem value="Infrastructure">Infrastructure</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (field === 'bagAttachment') {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor="bagAttachment">{getFieldLabel(field)}</Label>
          <Input
            id="bagAttachment"
            type="file"
            accept="image/*"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0] || null;
              setAttachmentFile(file);
            }}
          />
        </div>
      );
    }
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
          {['assetId', 'brand', 'model', 'serviceTag', 'serialNumber', 'cost'].includes(field) && (
            <span className="text-destructive ml-1">*</span>
          )}
        </Label>
        <Input
          id={field}
          type={field === 'purchaseDate' ? 'date' : field === 'cost' ? 'text' : 'text'}
          value={formData[field] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`}
          required={['assetId', 'brand', 'model', 'serviceTag', 'serialNumber', 'cost'].includes(field)}
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
                setAttachmentFile(null);
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
