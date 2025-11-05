import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarIcon, Download, Plus, Eye, Edit, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AddServiceModal } from '@/components/AddServiceModal';

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

export default function AssetHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'asset-history');
  const [assetHistory, setAssetHistory] = useState<AssetHistoryRecord[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAssetHistory(), fetchServiceHistory()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetHistory = async () => {
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
    }
  };

  const fetchServiceHistory = async () => {
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

  const handleExport = () => {
    const data = activeTab === 'asset-history' ? assetHistory : serviceHistory;
    const csv = activeTab === 'asset-history'
      ? 'Asset,Action,Details,Date,Performed By,Condition\n' +
        assetHistory.map(r => 
          `${r.assets?.asset_name},${r.return_date ? 'Returned' : 'Assigned'},${r.notes || ''},${format(new Date(r.assigned_date), 'yyyy-MM-dd')},${r.assignee?.full_name || ''},good`
        ).join('\n')
      : 'Asset,Service Type,Vendor,Date,Cost,Status\n' +
        serviceHistory.map(r =>
          `${r.assets?.asset_name},${r.service_type},${r.vendor || ''},${format(new Date(r.service_date), 'yyyy-MM-dd')},${r.cost || 0},completed`
        ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Export completed');
  };

  return (
    <div className="space-y-6 bg-[#f8f6ff] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset History & Maintenance</h1>
          <p className="text-muted-foreground">Track asset movements and service records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="rounded-lg">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {activeTab === 'service-history' && (
            <Button onClick={() => setIsServiceModalOpen(true)} className="rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Service Record
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'dd-MMM-yyyy') : 'dd-mm-yyyy'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'dd-MMM-yyyy') : 'dd-mm-yyyy'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        setSearchParams({ tab: value });
      }} className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="asset-history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Asset History ({assetHistory.length})
          </TabsTrigger>
          <TabsTrigger value="service-history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Service History ({serviceHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Asset History Tab */}
        <TabsContent value="asset-history" className="space-y-4">
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Asset Movement History</h2>
            </div>
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
                ) : assetHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No asset history found
                    </TableCell>
                  </TableRow>
                ) : (
                  assetHistory.map((record, index) => (
                    <TableRow key={record.id} className={index % 2 === 1 ? 'bg-muted/50' : ''}>
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
        </TabsContent>

        {/* Service History Tab */}
        <TabsContent value="service-history" className="space-y-4">
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Service & Maintenance Records</h2>
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
                ) : serviceHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No service history found
                    </TableCell>
                  </TableRow>
                ) : (
                  serviceHistory.map((record, index) => (
                    <TableRow key={record.id} className={index % 2 === 1 ? 'bg-muted/50' : ''}>
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
        </TabsContent>
      </Tabs>

      <AddServiceModal
        open={isServiceModalOpen}
        onOpenChange={setIsServiceModalOpen}
        onSuccess={() => {
          fetchServiceHistory();
          toast.success('Service record added successfully');
        }}
      />
    </div>
  );
}
