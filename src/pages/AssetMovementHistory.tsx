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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { AssetAllocationFilters } from "@/components/AssetAllocationFilters";
import { AssetAllocationHistoryModal } from "@/components/AssetAllocationHistoryModal";
import { useAssetAllocations, type AllocationFilters } from "@/hooks/useAssetAllocations";

// Export types for backward compatibility
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

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  returned: "bg-gray-100 text-gray-700",
};

const AssetMovementHistory = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<any>(null);
  const [filters, setFilters] = useState<AllocationFilters>({
    search: '',
    category: 'all',
    status: 'all',
    department: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const { allocations, loading } = useAssetAllocations(filters);

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

  const handleViewHistory = (allocation: any) => {
    setSelectedAllocation(allocation);
  };

  const handleCloseModal = () => {
    setSelectedAllocation(null);
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
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Asset Assignment History</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <AssetAllocationFilters filters={filters} onFilterChange={setFilters} />

        <Card>
          <CardHeader>
            <CardTitle>Asset Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading allocations...
              </div>
            ) : allocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No asset allocations found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Asset Type</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => (
                      <TableRow key={allocation.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {allocation.asset_id?.slice(0, 8) || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{allocation.category}</Badge>
                        </TableCell>
                        <TableCell>{allocation.asset_name}</TableCell>
                        <TableCell>{allocation.employee_name}</TableCell>
                        <TableCell>{allocation.department || 'N/A'}</TableCell>
                        <TableCell>
                          {format(new Date(allocation.allocated_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {allocation.return_date
                            ? format(new Date(allocation.return_date), "MMM d, yyyy")
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[allocation.status] || "bg-gray-100"}>
                            {allocation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewHistory(allocation)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View History
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedAllocation && (
          <AssetAllocationHistoryModal
            allocation={selectedAllocation}
            open={!!selectedAllocation}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default AssetMovementHistory;
