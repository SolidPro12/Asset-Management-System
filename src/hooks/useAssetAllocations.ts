import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AssetAllocation {
  id: string;
  asset_id: string | null;
  asset_name: string;
  category: string;
  employee_id: string | null;
  employee_name: string;
  allocated_date: string;
  return_date: string | null;
  status: string;
  condition: string;
  department: string | null;
  notes: string | null;
  asset_details?: {
    asset_id: string;
    asset_tag: string;
    specifications: any;
  } | null;
}

export interface AllocationFilters {
  search: string;
  category: string;
  status: string;
  department: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

export function useAssetAllocations(filters: AllocationFilters) {
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllocations();

    // Set up real-time subscription for asset allocations
    const channel = supabase
      .channel('asset-allocations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_allocations'
        },
        () => {
          // Refetch data when any change occurs
          fetchAllocations();
        }
      )
      .subscribe();

    // Set up real-time subscription for tickets (to update history)
    const ticketsChannel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          // Refetch data when tickets change
          fetchAllocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [filters]);

  const fetchAllocations = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('asset_allocations')
        .select('*, asset_details:assets(asset_id, asset_tag, specifications)')
        .order('allocated_date', { ascending: false });

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `asset_name.ilike.%${filters.search}%,employee_name.ilike.%${filters.search}%`
        );
      }

      // Apply category filter
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category as any);
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply department filter
      if (filters.department && filters.department !== 'all') {
        query = query.eq('department', filters.department);
      }

      // Apply date range filters
      if (filters.dateFrom) {
        query = query.gte('allocated_date', filters.dateFrom.toISOString().split('T')[0]);
      }

      if (filters.dateTo) {
        query = query.lte('allocated_date', filters.dateTo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAllocations(data || []);
    } catch (error: any) {
      console.error('Error fetching allocations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch asset allocations',
        variant: 'destructive',
      });
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchAllocations();
  };

  return { allocations, loading, refetch };
}
