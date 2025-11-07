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
import { Download, Plus, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AddServiceModal } from '@/components/AddServiceModal';
import * as XLSX from 'xlsx';

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

export default function ServiceHistory() {
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
              filteredHistory.map((record) => (
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
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddServiceModal
        open={isServiceModalOpen}
        onOpenChange={setIsServiceModalOpen}
        onSuccess={fetchServiceHistory}
      />
    </div>
  );
}
