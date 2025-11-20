export interface AssetHistoryRecord {
  id: string;
  asset_id: string;
  asset_name: string | null;
  asset_code: string | null;
  category: string | null;
  action: 'assigned' | 'returned' | 'maintenance' | 'transfer' | 'repair' | null;
  details: string | null;
  action_date: string | null;
  performed_by: string | null;
  performed_by_email: string | null;
  condition: 'excellent' | 'good' | 'fair' | null;
  notes: string | null;
  created_at: string;
  assigned_to: string | null;
  assigned_date: string | null;
  return_date: string | null;
  assigned_by: string | null;
}

export interface HistoryFilters {
  search: string;
  category: string;
  action: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}


