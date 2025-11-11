import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
import * as XLSX from 'xlsx';

interface Asset {
  id: string;
  asset_id: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      asset.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    try {
      if (filteredAssets.length === 0) {
        toast({
          title: 'No data to export',
          description: 'There are no assets to export.',
          variant: 'destructive',
        });
        return;
      }

      const exportData = filteredAssets.map(asset => ({
        'Asset ID': asset.asset_id || '',
        'Asset Name': asset.asset_name,
        'Asset Tag': asset.asset_tag,
        'Category': asset.category,
        'Brand': asset.brand || '',
        'Model': asset.model || '',
        'Serial Number': asset.serial_number || '',
        'Status': asset.status,
        'Department': asset.department || '',
        'Location': asset.location || '',
        'Purchase Date': asset.purchase_date || '',
        'Purchase Cost': asset.purchase_cost || '',
        'Warranty End Date': asset.warranty_end_date || '',
        'RAM': asset.specifications?.ram || '',
        'Processor': asset.specifications?.processor || '',
        'Storage': asset.specifications?.storage || '',
        'Operating System': asset.specifications?.operatingSystem || '',
        'Organization ID': asset.specifications?.organizationId || '',
        'Notes': asset.notes || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

      const fileName = `assets_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: 'Export Successful',
        description: `${filteredAssets.length} assets exported successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export assets. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleImportExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (jsonData.length === 0) {
            toast({
              title: 'No Data Found',
              description: 'The uploaded file contains no data.',
              variant: 'destructive',
            });
            return;
          }

          // Map the imported data to match database schema
          const assetsToImport = jsonData.map((row) => ({
            asset_id: row['Asset ID'] || row['asset_id'] || `ASSET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            asset_name: row['Asset Name'] || row['asset_name'] || '',
            asset_tag: row['Asset Tag'] || row['asset_tag'] || `TAG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: (row['Category'] || row['category'] || '').toLowerCase().replace(/ /g, '_'),
            brand: row['Brand'] || row['brand'] || null,
            model: row['Model'] || row['model'] || null,
            serial_number: row['Serial Number'] || row['serial_number'] || null,
            status: (row['Status'] || row['status'] || 'available').toLowerCase().replace(/ /g, '_'),
            department: row['Department'] || row['department'] || null,
            location: row['Location'] || row['location'] || null,
            purchase_date: row['Purchase Date'] || row['purchase_date'] || null,
            purchase_cost: parseFloat(row['Purchase Cost'] || row['purchase_cost'] || 0) || null,
            warranty_end_date: row['Warranty End Date'] || row['warranty_end_date'] || null,
            notes: row['Notes'] || row['notes'] || null,
            specifications: {
              ram: row['RAM'] || row['ram'] || '',
              processor: row['Processor'] || row['processor'] || '',
              storage: row['Storage'] || row['storage'] || '',
              operatingSystem: row['Operating System'] || row['operatingSystem'] || '',
              organizationId: row['Organization ID'] || row['organizationId'] || '',
            },
          }));

          // Filter out invalid entries
          const validAssets = assetsToImport.filter(asset => asset.asset_name && asset.category);

          if (validAssets.length === 0) {
            toast({
              title: 'Invalid Data',
              description: 'No valid assets found in the file. Please check the required fields.',
              variant: 'destructive',
            });
            return;
          }

          // Insert into database
          const { data: insertedData, error } = await supabase
            .from('assets')
            .insert(validAssets)
            .select();

          if (error) {
            throw error;
          }

          toast({
            title: 'Import Successful',
            description: `${validAssets.length} assets imported successfully.`,
          });

          // Refresh the assets list
          fetchAssets();
        } catch (parseError) {
          toast({
            title: 'Import Failed',
            description: 'Failed to parse the file. Please check the format.',
            variant: 'destructive',
          });
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Failed to read the file. Please try again.',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      'Asset ID': 'ASSET-001',
      'Asset Name': 'Example Laptop',
      'Asset Tag': 'LAP-001',
      'Category': 'laptop',
      'Brand': 'Dell',
      'Model': 'Latitude 5520',
      'Serial Number': 'SN123456',
      'Status': 'available',
      'Department': 'IT',
      'Location': 'Office A',
      'Purchase Date': '2024-01-15',
      'Purchase Cost': '50000',
      'Warranty End Date': '2027-01-15',
      'RAM': '16GB',
      'Processor': 'Intel i7',
      'Storage': '512GB SSD',
      'Operating System': 'Windows 11',
      'Organization ID': 'ORG-001',
      'Notes': 'New laptop for employee',
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets Template');

    XLSX.writeFile(workbook, 'assets_import_template.xlsx');

    toast({
      title: 'Template Downloaded',
      description: 'Import template has been downloaded successfully.',
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Assets</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
              placeholder="Search by asset ID, model, tag..."
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
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Asset ID</th>
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
                                <td className="px-4 py-3 font-semibold text-primary">{asset.asset_id || '-'}</td>
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
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default Assets;
