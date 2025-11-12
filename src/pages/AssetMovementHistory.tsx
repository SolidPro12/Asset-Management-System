import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AssetHistoryFilters } from "@/components/AssetHistoryFilters";
import { AssetHistoryTable } from "@/components/AssetHistoryTable";
import { ViewAssetHistoryModal } from "@/components/ViewAssetHistoryModal";
import { useAssetHistory } from "@/hooks/useAssetHistory";

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
  // Legacy fields from original structure
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

const AssetMovementHistory = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AssetHistoryRecord | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({
    search: '',
    category: 'all',
    action: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const { records, loading, refetch } = useAssetHistory(filters);

  // Check if user is super admin
  useEffect(() => {
    checkSuperAdminAccess();
  }, []);

  const checkSuperAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error || roleData?.role !== 'super_admin') {
        toast({
          title: "Access Denied",
          description: "Only Super Admins can access this page",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsSuperAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  };

  const handleViewRecord = (record: AssetHistoryRecord) => {
    setSelectedRecord(record);
  };

  const handleCloseModal = () => {
    setSelectedRecord(null);
  };

  // Don't render anything until we verify super admin access
  if (isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#f7f4ff] p-6">
      <div className="container mx-auto max-w-7xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Asset Movement History</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Asset Movement History</h1>
          <p className="text-muted-foreground mt-2">
            Track all asset movements including assignments, returns, maintenance, and repairs
          </p>
        </div>

        <AssetHistoryFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalRecords={records.length}
        />

        <AssetHistoryTable
          records={records}
          loading={loading}
          onViewRecord={handleViewRecord}
        />

        {selectedRecord && (
          <ViewAssetHistoryModal
            record={selectedRecord}
            open={!!selectedRecord}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default AssetMovementHistory;
