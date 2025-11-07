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
import { Download, Eye, Edit, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface AssetHistoryRecord {
  id: string;
  asset_id: string;
  assigned_to: string;
  assigned_by?: string;
  assigned_date: string;
  return_date?: string;
  notes?: string;
  created_at: string;
  assets?: {
    asset_name: string;
    category: string;
  };
  assignee?: {
    full_name: string;
  };
  assigner?: {
    full_name: string;
  };
}

export default function AssetHistory() {
  const [assetHistory, setAssetHistory] = useState<AssetHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchAssetHistory();
  }, []);

  const fetchAssetHistory = async () => {
    setLoading(true);
    try {
      const { data: historyData, error } = await supabase
        .from('asset_history')
        .select('*')
        .order('assigned_date', { ascending: false });

      if (error) throw error;

      // Fetch related data
      if (historyData && historyData.length > 0) {
        const assetIds = [...new Set(historyData.map(h => h.asset_id))];
        const userIds = [...new Set([
          ...historyData.map(h => h.assigned_to),
          ...historyData.map(h => h.assigned_by).filter(Boolean)
        ])];

        const [{ data: assets }, { data: profiles }] = await Promise.all([
          supabase.from('assets').select('id, asset_name, category').in('id', assetIds),
          supabase.from('profiles').select('id, full_name').in('id', userIds)
        ]);

        const enrichedData = historyData.map(record => ({
          ...record,
          assets: assets?.find(a => a.id === record.asset_id),
          assignee: profiles?.find(p => p.id === record.assigned_to),
          assigner: profiles?.find(p => p.id === record.assigned_by),
        }));

        setAssetHistory(enrichedData as any);
      }
    } catch (error) {
      console.error('Error fetching asset history:', error);
      toast.error('Failed to load asset history');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (record: AssetHistoryRecord) => {
    if (record.return_date) {
      return <Badge variant="secondary" className="bg-gray-100">returned</Badge>;
    }
    if (record.notes?.toLowerCase().includes('maintenance')) {
      return <Badge variant="default" className="bg-blue-100 text-blue-700">maintenance</Badge>;
    }
    if (record.notes?.toLowerCase().includes('repair')) {
      return <Badge variant="destructive" className="bg-red-100 text-red-700">repair</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-700">assigned</Badge>;
  };

  const handleExport = (exportFormat: 'csv' | 'xlsx') => {
    const data = filteredHistory.map(r => ({
      Asset: r.assets?.asset_name || 'Unknown',
      Category: r.assets?.category || 'N/A',
      Action: r.return_date ? 'Returned' : 'Assigned',
      Details: r.notes || '',
      Date: format(new Date(r.assigned_date), 'yyyy-MM-dd'),
      'Performed By': r.assignee?.full_name || 'N/A',
      Condition: 'excellent'
    }));

    if (exportFormat === 'csv') {
      const csv = 'Asset,Category,Action,Details,Date,Performed By,Condition\n' +
        data.map(r => Object.values(r).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asset-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asset History');
      XLSX.writeFile(wb, `asset-history-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }
    toast.success(`Export completed as ${exportFormat.toUpperCase()}`);
  };

  const filteredHistory = assetHistory.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.assets?.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || record.assets?.category === categoryFilter;
    const matchesAction = actionFilter === 'all' || 
      (actionFilter === 'returned' && record.return_date) ||
      (actionFilter === 'assigned' && !record.return_date);
    return matchesSearch && matchesCategory && matchesAction;
  });

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Asset History</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset History</h1>
          <p className="text-muted-foreground">Track asset movements and assignments</p>
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
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10"
          />

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10">
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

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Asset History Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Condition</TableHead>
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
                  No asset history found
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
                  <TableCell>{getActionBadge(record)}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm">{record.notes || '—'}</p>
                  </TableCell>
                  <TableCell>{format(new Date(record.assigned_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{record.assignee?.full_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      excellent
                    </Badge>
                  </TableCell>
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
    </div>
  );
}
