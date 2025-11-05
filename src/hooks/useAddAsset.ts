import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useAddAsset = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAsset = async (formData: Record<string, any>, category: string) => {
    setIsSubmitting(true);
    try {
      // Map category to database enum values
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
        asset_name: formData.model || category,
        asset_tag: formData.serviceTag || `${category}-${Date.now()}`,
        category: getCategoryEnum(category) as any,
        brand: formData.brand || null,
        model: formData.model || null,
        serial_number: formData.serviceTag || null,
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
      toast({
        title: 'Error',
        description: 'Failed to add asset. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { addAsset, isSubmitting };
};
