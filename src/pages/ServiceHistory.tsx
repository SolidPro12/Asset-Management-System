import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Download, Plus, Eye, Edit, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AddServiceModal } from '@/components/AddServiceModal';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ServiceHistoryRecord {
  id: string;
  asset_id: string;
  service_type: string;
  service_date: string;
  vendor?: string;
  cost?: number;
  description?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
  assets?: {
    asset_name: string;
    category: string;
  };
}

const SERVICE_TYPE_OPTIONS = [
  { value: 'warranty', label: 'Warranty' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'inspection', label: 'Inspection' },
];

export default function ServiceHistory() {
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<ServiceHistoryRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ServiceHistoryRecord | null>(null);
  const [editForm, setEditForm] = useState({
    service_type: '',
    service_date: '',
    vendor: '',
    cost: '',
    description: '',
    notes: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const handleOpenEdit = (record: ServiceHistoryRecord) => {
    setEditingRecord(record);
    setEditForm({
      service_type: record.service_type || '',
      service_date: format(new Date(record.service_date), 'yyyy-MM-dd'),
      vendor: record.vendor || '',
      cost: record.cost ? record.cost.toString() : '',
      description: record.description || '',
      notes: record.notes || '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('service_history')
        .update({
          service_type: editForm.service_type,
          service_date: new Date(editForm.service_date).toISOString(),
          vendor: editForm.vendor.trim() || null,
          cost: editForm.cost ? parseFloat(editForm.cost) : null,
          description: editForm.description.trim() || null,
          notes: editForm.notes.trim() || null,
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast.success('Service record updated');
      setEditingRecord(null);
      fetchServiceHistory();
    } catch (error) {
      console.error('Error updating service record:', error);
      toast.error('Failed to update service record');
    } finally {
      setEditLoading(false);
    }
  };


  useEffect(() => {
    fetchServiceHistory();
  }, []);

  const fetchServiceHistory = async () => {
    setLoading(true);
    try {
      const { data: serviceData, error } = await supabase
        .from('service_history')
        .select('*')
        .order('service_date', { ascending: false });

      if (error) throw error;

      if (serviceData && serviceData.length > 0) {
        const assetIds = [...new Set(serviceData.map(s => s.asset_id))];
        const { data: assets } = await supabase
          .from('assets')
          .select('id, asset_name, category')
          .in('id', assetIds);

        const enrichedData = serviceData.map(record => ({
          ...record,
          assets: assets?.find(a => a.id === record.asset_id),
        }));

        setServiceHistory(enrichedData as any);
      }
    } catch (error) {
      console.error('Error fetching service history:', error);
      toast.error('Failed to load service history');
    } finally {
      setLoading(false);
    }
  };

  const getServiceStatus = (serviceType: string) => {
    const type = serviceType.toLowerCase();
    if (type.includes('warranty') || type.includes('cleaning')) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">completed</Badge>;
    }
    if (type.includes('maintenance')) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">in progress</Badge>;
    }
    if (type.includes('repair')) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">repair</Badge>;
    }
    return <Badge variant="secondary">completed</Badge>;
  };

  const handleExport = (exportFormat: 'csv' | 'xlsx') => {
    const data = serviceHistory.map(r => ({
      Asset: r.assets?.asset_name || 'Unknown',
      Category: r.assets?.category || 'N/A',
      'Service Type': r.service_type,
      Vendor: r.vendor || 'Internal Team',
      Date: format(new Date(r.service_date), 'yyyy-MM-dd'),
      Cost: r.cost || 0,
      Description: r.description || '',
      Notes: r.notes || ''
    }));

    if (exportFormat === 'csv') {
      const csv = 'Asset,Category,Service Type,Vendor,Date,Cost,Description,Notes\n' +
        data.map(r => Object.values(r).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Service History');
      XLSX.writeFile(wb, `service-history-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }
    toast.success(`Export completed as ${exportFormat.toUpperCase()}`);
  };

  const filteredHistory = serviceHistory.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.assets?.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.service_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || record.assets?.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
     

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service History</h1>
          <p className="text-muted-foreground">Track asset maintenance and service records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('xlsx')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => setIsServiceModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service Record
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search service history..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="laptop">Laptop</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="monitor">Monitor</SelectItem>
            <SelectItem value="keyboard">Keyboard</SelectItem>
            <SelectItem value="mouse">Mouse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredHistory.length)} of {filteredHistory.length} records
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No service history found
                </TableCell>
              </TableRow>
            ) : (
              paginatedHistory.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{record.assets?.asset_name || 'Unknown Asset'}</p>
                      <p className="text-sm text-muted-foreground capitalize">{record.assets?.category}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.service_type}</Badge>
                  </TableCell>
                  <TableCell>{record.vendor || 'Internal Team'}</TableCell>
                  <TableCell>
                    <div>
                      <p>{format(new Date(record.service_date), 'yyyy-MM-dd')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.service_date), 'HH:mm')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>₹ {record.cost?.toLocaleString() || 0}</TableCell>
                  <TableCell>{getServiceStatus(record.service_type)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(record)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(record)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {!loading && filteredHistory.length > 0 && (
          <div className="p-3 flex items-center justify-center w-full border-t">
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
        )}
      </div>

      <AddServiceModal
        open={isServiceModalOpen}
        onOpenChange={setIsServiceModalOpen}
        onSuccess={fetchServiceHistory}
      />

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord?.service_type || 'Service Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedRecord?.assets?.asset_name ?? 'Unknown Asset'}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Asset</p>
                  <p className="font-medium">{selectedRecord.assets?.asset_name ?? 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="capitalize font-medium">{selectedRecord.assets?.category ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedRecord.service_date), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendor</p>
                  <p className="font-medium">{selectedRecord.vendor || 'Internal Team'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost</p>
                  <p className="font-medium">
                    ₹ {selectedRecord.cost?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Performed By</p>
                  <p className="font-medium">{selectedRecord.performed_by || 'N/A'}</p>
                </div>
              </div>

              {selectedRecord.description && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Description</p>
                  <p className="text-sm">{selectedRecord.description}</p>
                </div>
              )}

              {selectedRecord.notes && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedRecord.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service Record</DialogTitle>
            <DialogDescription>
              Update details for {editingRecord?.assets?.asset_name ?? 'selected asset'}.
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Asset</p>
                  <p className="font-medium">{editingRecord.assets?.asset_name ?? 'Unknown'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="capitalize font-medium">{editingRecord.assets?.category ?? 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service Type *</label>
                  <Select
                    value={editForm.service_type}
                    onValueChange={(value) => setEditForm({ ...editForm, service_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service Date *</label>
                  <Input
                    type="date"
                    value={editForm.service_date}
                    onChange={(e) => setEditForm({ ...editForm, service_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendor</label>
                  <Input
                    value={editForm.vendor}
                    onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                    placeholder="Service provider"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.cost}
                    onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingRecord(null)} disabled={editLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
