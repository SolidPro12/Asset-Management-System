import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Package, 
  Plus, 
  Download, 
  Upload, 
  FileText, 
  RotateCcw,
  Laptop,
  Monitor,
  Headphones,
  MousePointer,
  Briefcase,
  Cable,
  Usb,
  Tv,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { AddAssetDialog } from '@/components/AddAssetDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';

interface Asset {
  id: string;
  asset_name: string;
  asset_tag: string;
  category: string;
  brand: string | null;
  model: string | null;
  status: string;
  department: string | null;
  location: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  serial_number: string | null;
  warranty_end_date: string | null;
  notes: string | null;
  specifications: any;
}

const Assets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      // Generic error message - details not exposed to user
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success text-success-foreground';
      case 'assigned':
        return 'bg-accent text-accent-foreground';
      case 'under_maintenance':
        return 'bg-warning text-warning-foreground';
      case 'retired':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconClass = "h-5 w-5";
    switch (category.toLowerCase()) {
      case 'laptop':
        return <Laptop className={iconClass} />;
      case 'monitor':
        return <Monitor className={iconClass} />;
      case 'headphones':
        return <Headphones className={iconClass} />;
      case 'wireless_keyboard_&_mouse':
      case 'wired_keyboard_&_mouse':
      case 'mouse_pad':
        return <MousePointer className={iconClass} />;
      case 'bags':
        return <Briefcase className={iconClass} />;
      case 'chargers':
        return <Cable className={iconClass} />;
      case 'pendrives':
      case 'jabra_devices':
        return <Usb className={iconClass} />;
      case 'tv':
        return <Tv className={iconClass} />;
      default:
        return <Package className={iconClass} />;
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const handleExportExcel = () => {
    toast({
      title: 'Export Excel',
      description: 'Export functionality coming soon!',
    });
  };

  const handleImportExcel = () => {
    toast({
      title: 'Import Excel',
      description: 'Import functionality coming soon!',
    });
  };

  const handleDownloadTemplate = () => {
    toast({
      title: 'Download Template',
      description: 'Template download coming soon!',
    });
  };

  const assetCategories = Array.from(new Set(assets.map(a => a.category)));

  const groupedAssets = filteredAssets.reduce((acc, asset) => {
    const categoryName = asset.specifications?.originalCategory || asset.category;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleAllCategories = () => {
    if (expandedCategories.size === Object.keys(groupedAssets).length) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set(Object.keys(groupedAssets)));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assets</h2>
          <p className="text-muted-foreground">Manage and view all company assets</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-48 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Asset Management</h2>
          <p className="text-muted-foreground">Comprehensive asset tracking and management system</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={handleImportExcel} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Advanced Filters</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by model, tag, cost..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {assetCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No assets found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'Assets will appear here once added'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Asset Categories</CardTitle>
              <Button variant="ghost" size="sm" onClick={toggleAllCategories}>
                {expandedCategories.size === Object.keys(groupedAssets).length ? 'Collapse All' : 'Expand All'} ({Object.keys(groupedAssets).length} categories)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(groupedAssets).map(([categoryName, categoryAssets]) => {
              const isExpanded = expandedCategories.has(categoryName);
              return (
                <Collapsible
                  key={categoryName}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(categoryName)}
                >
                  <Card className="border">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="py-3 px-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {getCategoryIcon(categoryAssets[0].category)}
                            </div>
                            <div className="text-left">
                              <h3 className="font-medium text-sm">{categoryName}</h3>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {categoryAssets.length} asset{categoryAssets.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Model</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Service Tag</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Purchase Date</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">RAM</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Processor</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Organization ID</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Notes</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Cost</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Serial Number</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Warranty</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Vendor</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Operating System</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Storage</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryAssets.map((asset, index) => (
                              <tr 
                                key={asset.id} 
                                className={`border-t hover:bg-muted/30 transition-colors ${
                                  index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                                }`}
                              >
                                <td className="px-4 py-3 font-medium">{asset.model || '-'}</td>
                                <td className="px-4 py-3">{asset.serial_number || asset.asset_tag}</td>
                                <td className="px-4 py-3">
                                  <Badge className={getStatusColor(asset.status)} variant="secondary">
                                    {asset.status.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {asset.purchase_date 
                                    ? new Date(asset.purchase_date).toLocaleDateString('en-US', { 
                                        month: '2-digit', 
                                        day: '2-digit', 
                                        year: 'numeric' 
                                      }) 
                                    : '-'}
                                </td>
                                <td className="px-4 py-3">{asset.specifications?.ram || '-'}</td>
                                <td className="px-4 py-3">{asset.specifications?.processor || '-'}</td>
                                <td className="px-4 py-3">{asset.specifications?.organizationId || '-'}</td>
                                <td className="px-4 py-3 max-w-[150px] truncate" title={asset.notes || ''}>
                                  {asset.notes || '-'}
                                </td>
                                <td className="px-4 py-3">
                                  {asset.purchase_cost 
                                    ? `₹${asset.purchase_cost.toLocaleString()}` 
                                    : '-'}
                                </td>
                                <td className="px-4 py-3">{asset.serial_number || '-'}</td>
                                <td className="px-4 py-3">
                                  {asset.warranty_end_date 
                                    ? new Date(asset.warranty_end_date).toLocaleDateString('en-US', { 
                                        year: 'numeric' 
                                      }) 
                                    : '-'}
                                </td>
                                <td className="px-4 py-3">{asset.brand || '-'}</td>
                                <td className="px-4 py-3">{asset.specifications?.operatingSystem || '-'}</td>
                                <td className="px-4 py-3">{asset.specifications?.storage || '-'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      )}
      
      <AddAssetDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchAssets}
      />
    </div>
  );
};

export default Assets;
