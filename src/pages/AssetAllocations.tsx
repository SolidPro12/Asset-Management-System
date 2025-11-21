import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DEPARTMENTS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Download,
  Plus,
  Search,
  Laptop,
  RotateCcw,
  Eye,
  Edit,
  Trash2,
  User,
  Building2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AllocateAssetModal } from '@/components/AllocateAssetModal';
import { ViewAllocationModal } from '@/components/ViewAllocationModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Allocation {
  id: string;
  asset_name: string;
  category: string;
  employee_name: string;
  department: string | null;
  allocated_date: string;
  status: string;
  condition: string;
  notes?: string | null;
  return_date?: string | null;
}

export default function AssetAllocations() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [filteredAllocations, setFilteredAllocations] = useState<Allocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAllocations();
  }, []);

  useEffect(() => {
    filterAllocations();
  }, [allocations, searchQuery, statusFilter, departmentFilter, categoryFilter]);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('asset_allocations')
        .select('*')
        .order('allocated_date', { ascending: false });

      if (error) throw error;
      setAllocations(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch allocations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Pagination (5 per page)
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredAllocations.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentPageData = filteredAllocations.slice(startIndex, startIndex + pageSize);

  const filterAllocations = () => {
    let filtered = [...allocations];

    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter((a) => a.department === departmentFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((a) => a.category === categoryFilter);
    }

    setFilteredAllocations(filtered);
    setCurrentPage(1);
  };

  const handleReturn = async (id: string) => {
    try {
      const { error } = await supabase
        .from('asset_allocations')
        .update({ status: 'returned', return_date: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Asset marked as returned',
      });
      fetchAllocations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to return asset',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!allocationToDelete) return;

    try {
      const { error } = await supabase
        .from('asset_allocations')
        .delete()
        .eq('id', allocationToDelete);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Allocation deleted successfully',
      });
      fetchAllocations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete allocation',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAllocationToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-blue-500">Active</Badge>;
    }
    return <Badge variant="secondary">Returned</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, string> = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      fair: 'bg-orange-500',
      poor: 'bg-red-500',
    };
    return <Badge className={variants[condition] || 'bg-gray-500'}>{condition}</Badge>;
  };

  const activeCount = allocations.filter((a) => a.status === 'active').length;
  const returnedCount = allocations.filter((a) => a.status === 'returned').length;

  const exportToCSV = () => {
    const headers = ['Asset Name', 'Asset Category', 'Employee', 'Department', 'Allocated Date', 'Status', 'Condition'];
    const rows = filteredAllocations.map((a) => [
      a.asset_name,
      a.category,
      a.employee_name,
      a.department || '',
      a.allocated_date,
      a.status,
      a.condition,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset-allocations.csv';
    a.click();
  };

  return (
    <div className="space-y-6">

      {/* Sticky header area: title + filters + summary cards */}
      <div className="sticky top-16 z-10 bg-background space-y-4 pb-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Asset Allocations</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage asset assignments across the organization.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setIsAllocateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Allocate Asset
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search allocations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="laptop">Laptop</SelectItem>
                <SelectItem value="monitor">Monitor</SelectItem>
                <SelectItem value="headset">Headphones</SelectItem>
                <SelectItem value="keyboard">Keyboard</SelectItem>
                <SelectItem value="mouse">Mouse</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Laptop className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Allocations</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RotateCcw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Returned Assets</p>
                <p className="text-2xl font-bold">{returnedCount}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Table */}
      <Card className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Asset Allocations ({filteredAllocations.length})
          </h2>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Asset Category</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Allocated Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAllocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No allocations found
                  </TableCell>
                </TableRow>
              ) : (
                currentPageData.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell className="font-medium">{allocation.asset_name}</TableCell>
                    <TableCell className="capitalize">{allocation.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {(allocation.employee_name || '').split('•')[0].split('-')[0].trim()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {allocation.department || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(allocation.allocated_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(allocation.status)}</TableCell>
                    <TableCell>{getConditionBadge(allocation.condition)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAllocation(allocation);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAllocation(allocation);
                            setIsAllocateModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {allocation.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReturn(allocation.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAllocationToDelete(allocation.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 flex items-center justify-center w-full px-4">
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="hidden h-8 w-8 p-0 lg:flex"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-8 w-8 p-0"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>
              <span className="text-muted-foreground">|</span>
              <div className="flex items-center space-x-1">
                <span className="text-sm">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, totalPages)}
                  value={currentPage}
                  onChange={(e) => {
                    const page = e.target.value ? Number(e.target.value) : 1;
                    setCurrentPage(Math.min(Math.max(1, page), totalPages));
                  }}
                  className="w-12 h-8 text-sm border rounded text-center"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="hidden h-8 w-8 p-0 lg:flex"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <AllocateAssetModal
        open={isAllocateModalOpen}
        onOpenChange={(open) => {
          setIsAllocateModalOpen(open);
          if (!open) setSelectedAllocation(null);
        }}
        allocation={selectedAllocation}
        onSuccess={fetchAllocations}
      />

      <ViewAllocationModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        allocation={selectedAllocation}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this allocation record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
