import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useAddAsset = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAsset = async (formData: Record<string, any>, category: string) => {
    setIsSubmitting(true);
    try {
      // Validate required field
      if (!formData.assetId) {
        toast({
          title: 'Error',
          description: 'Asset ID is required.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return false;
      }

      // Map category to database enum values
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
        status: 'available' as any,
        department: null,
        location: null,
        purchase_date: formData.purchaseDate || null,
        purchase_cost: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.note || null,
        specifications: {
          ...formData,
          originalCategory: category,
        },
      };

      const { error } = await supabase.from('assets').insert([assetData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Asset added successfully!',
      });

      return true;
    } catch (error: any) {
      console.error('Asset creation error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to add asset. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { addAsset, isSubmitting };
};
