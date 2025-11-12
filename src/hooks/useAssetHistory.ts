import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AssetHistoryRecord, HistoryFilters } from '@/pages/AssetMovementHistory';

export function useAssetHistory(filters: HistoryFilters) {
  const [records, setRecords] = useState<AssetHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssetHistory();
  }, [filters]);

  const fetchAssetHistory = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('asset_history')
        .select('*')
        .order('action_date', { ascending: false });

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `asset_name.ilike.%${filters.search}%,asset_code.ilike.%${filters.search}%,details.ilike.%${filters.search}%`
        );
      }

      // Apply category filter
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // Apply action filter
      if (filters.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }

      // Apply date range filters
      if (filters.dateFrom) {
        query = query.gte('action_date', filters.dateFrom.toISOString().split('T')[0]);
      }

      if (filters.dateTo) {
        query = query.lte('action_date', filters.dateTo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out records with missing critical fields
      const validRecords = (data || []).filter(
        (record) =>
          record.asset_name &&
          record.asset_code &&
          record.category &&
          record.action &&
          record.condition
      ) as AssetHistoryRecord[];

      setRecords(validRecords);
    } catch (error: any) {
      console.error('Error fetching asset history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch asset history',
        variant: 'destructive',
      });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchAssetHistory();
  };

  return { records, loading, refetch };
}
