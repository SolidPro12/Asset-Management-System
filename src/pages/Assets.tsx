import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  ArrowLeftRight,
  Wrench,
  ScanLine,
  BarChart3,
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
  Trash2,
  LayoutGrid,
  List,
  CheckCircle,
  UserCheck,
  QrCode,
  FileArchive,
  Printer
} from 'lucide-react';
import { AddAssetDialog } from '@/components/AddAssetDialog';
import { ViewAssetModal } from '@/components/ViewAssetModal';
import { ViewAssetQRModal } from '@/components/ViewAssetQRModal';
import { AssetLifecycleDashboard } from '@/components/AssetLifecycleDashboard';
import { AssetTransferModal } from '@/components/AssetTransferModal';
import { AssetMaintenanceModal } from '@/components/AssetMaintenanceModal';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { AssetCategoryOverview } from '@/components/AssetCategoryOverview';
import { Checkbox } from '@/components/ui/checkbox';
import { downloadQRCodesAsZip, generatePrintablePDF } from '@/lib/qrCodeUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  current_assignee?: {
    full_name: string;
    email: string;
  } | null;
}

const Assets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [qrAsset, setQrAsset] = useState<{ id: string; name: string } | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New feature modals
  const [showDashboard, setShowDashboard] = useState(false);
  const [transferAssetId, setTransferAssetId] = useState<string | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [maintenanceAsset, setMaintenanceAsset] = useState<{ id: string; name: string } | null>(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    fetchAssets();
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          current_assignee:profiles!current_assignee_id(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to handle the relationship properly
      const transformedData = (data || []).map(asset => ({
        ...asset,
        current_assignee: Array.isArray(asset.current_assignee) && asset.current_assignee.length > 0
          ? asset.current_assignee[0]
          : null
      }));
      
      setAssets(transformedData);
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

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleBulkDownloadQR = async () => {
    if (selectedAssets.size === 0) {
      toast({
        title: 'No assets selected',
        description: 'Please select at least one asset to download QR codes.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsBulkProcessing(true);
      const selectedAssetData = assets
        .filter(a => selectedAssets.has(a.id))
        .map(a => ({ asset_id: a.asset_id, asset_name: a.asset_name }));

      await downloadQRCodesAsZip(selectedAssetData, (current, total) => {
        setBulkProgress({ current, total });
      });

      toast({
        title: 'Success',
        description: `${selectedAssets.size} QR codes downloaded successfully.`,
      });
      
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Error downloading QR codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to download QR codes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handlePrintQRLabels = async () => {
    if (selectedAssets.size === 0) {
      toast({
        title: 'No assets selected',
        description: 'Please select at least one asset to print labels.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsBulkProcessing(true);
      const selectedAssetData = assets
        .filter(a => selectedAssets.has(a.id))
        .map(a => ({ asset_id: a.asset_id, asset_name: a.asset_name }));

      await generatePrintablePDF(selectedAssetData, (current, total) => {
        setBulkProgress({ current, total });
      });

      toast({
        title: 'Success',
        description: `PDF with ${selectedAssets.size} QR labels generated successfully.`,
      });
      
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
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

  const handleScanSuccess = async (assetId: string) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('asset_id', assetId)
        .maybeSingle();

      if (error || !data) {
        toast({
          title: 'Asset Not Found',
          description: `No asset found with ID: ${assetId}`,
          variant: 'destructive',
        });
        return;
      }

      setSelectedAsset(data);
      setIsViewModalOpen(true);
      
      toast({
        title: 'Asset Found',
        description: `Loaded details for ${data.asset_name}`,
      });
    } catch (error) {
      console.error('Error finding asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to lookup asset',
        variant: 'destructive',
      });
    }
  };

  const assetCategories = Array.from(new Set(assets.map(a => a.category)));
  const sortedAssetCategories = [...assetCategories].sort((a, b) => {
    const al = (a || '').toLowerCase();
    const bl = (b || '').toLowerCase();
    if (al === 'other' && bl !== 'other') return 1;
    if (bl === 'other' && al !== 'other') return -1;
    return al.localeCompare(bl);
  });

  // Calculate category counts for Super Admin dashboard
  const categoryCounts = assets.reduce((acc, asset) => {
    const categoryName = asset.specifications?.originalCategory || asset.category;
    const displayName = categoryName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (!acc[displayName]) {
      acc[displayName] = { 
        count: 0, 
        available: 0,
        assigned: 0,
        originalCategory: categoryName 
      };
    }
    acc[displayName].count++;
    if (asset.status === 'available') {
      acc[displayName].available++;
    } else if (asset.status === 'assigned') {
      acc[displayName].assigned++;
    }
    return acc;
  }, {} as Record<string, { count: number; available: number; assigned: number; originalCategory: string }>);

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

      {/* Sticky header area: title + actions + bulk bar + dashboard + stats + filters */}
      <div className="sticky top-16 z-10 bg-background space-y-4 pb-4">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Asset Management</h2>
            <p className="text-muted-foreground">Comprehensive asset tracking and management system</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowDashboard(!showDashboard)} variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              {showDashboard ? 'Hide' : 'View'} Dashboard
            </Button>
            <Button onClick={() => setIsScannerOpen(true)} variant="outline" size="sm">
              <ScanLine className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
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
            {userRole !== 'financer' && (
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedAssets.size > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedAssets(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleBulkDownloadQR}
                  variant="outline"
                  size="sm"
                  disabled={isBulkProcessing}
                >
                  <FileArchive className="h-4 w-4 mr-2" />
                  Download QR Codes (ZIP)
                </Button>
                <Button 
                  onClick={handlePrintQRLabels}
                  variant="outline"
                  size="sm"
                  disabled={isBulkProcessing}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print QR Labels (PDF)
                </Button>
              </div>
            </div>
            {isBulkProcessing && bulkProgress.total > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                  <span>Processing...</span>
                  <span>{bulkProgress.current} / {bulkProgress.total}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Lifecycle Dashboard */}
        {showDashboard && (
          <Card className="p-6">
            <AssetLifecycleDashboard />
          </Card>
        )}

        {/* Asset Category Overview */}
        <AssetCategoryOverview 
          assets={assets}
          selectedCategory={categoryFilter}
          onCategorySelect={setCategoryFilter}
        />

        {/* Asset Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{filteredAssets.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Assets</p>
                <p className="text-2xl font-bold">
                  {filteredAssets.filter(asset => asset.status === 'available').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned Assets</p>
                <p className="text-2xl font-bold">
                  {filteredAssets.filter(asset => asset.status === 'assigned').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by asset ID, model, tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {sortedAssetCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <div className="flex-1">
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
                <Button variant="ghost" size="icon" onClick={handleReset} title="Reset filters">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleSelectAll}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {selectedAssets.size === filteredAssets.length ? 'Deselect All' : 'Select All'}
              </Button>
              <ToggleGroup
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')} 
                className="inline-flex items-center rounded-lg border bg-muted/30 p-1"
              >
                <ToggleGroupItem 
                  value="grid" 
                  aria-label="Grid view" 
                  className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm rounded-md px-3 py-1.5"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  <span>Grid</span>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="list" 
                  aria-label="List view" 
                  className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm rounded-md px-3 py-1.5"
                >
                  <List className="h-4 w-4 mr-2" />
                  <span>List</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </Card>
      </div>

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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const categoryName = asset.specifications?.originalCategory || asset.category;
            return (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedAssets.has(asset.id)}
                        onCheckedChange={() => toggleAssetSelection(asset.id)}
                        aria-label={`Select ${asset.asset_name}`}
                      />
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{asset.asset_name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{categoryName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Asset ID</span>
                      <span className="font-mono font-medium">{asset.asset_id || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium">{asset.model || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(asset.status)} variant="secondary">
                        {asset.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {asset.serial_number && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Serial</span>
                        <span className="font-mono text-xs">{asset.serial_number}</span>
                      </div>
                    )}
                    {asset.location && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Location</span>
                        <span>{asset.location}</span>
                      </div>
                    )}
                    {asset.purchase_cost && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cost</span>
                        <span className="font-medium">₹{asset.purchase_cost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setIsViewModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setQrAsset({ id: asset.asset_id, name: asset.asset_name });
                        setIsQRModalOpen(true);
                      }}
                      title="View QR Code"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      QR
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setEditAsset(asset);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
            {Object.entries(groupedAssets)
              .sort(([a], [b]) => {
                const al = a.toLowerCase();
                const bl = b.toLowerCase();
                if (al === 'other' && bl !== 'other') return 1;
                if (bl === 'other' && al !== 'other') return -1;
                return al.localeCompare(bl);
              })
              .map(([categoryName, categoryAssets]) => {
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
                              <th className="px-4 py-2">
                                <Checkbox
                                  checked={categoryAssets.every(a => selectedAssets.has(a.id))}
                                  onCheckedChange={() => {
                                    const allSelected = categoryAssets.every(a => selectedAssets.has(a.id));
                                    setSelectedAssets(prev => {
                                      const newSet = new Set(prev);
                                      categoryAssets.forEach(a => {
                                        if (allSelected) {
                                          newSet.delete(a.id);
                                        } else {
                                          newSet.add(a.id);
                                        }
                                      });
                                      return newSet;
                                    });
                                  }}
                                  aria-label="Select all in category"
                                />
                              </th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Asset ID</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Model</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Service Tag</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Purchase Date</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">RAM</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Processor</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Graphics Card</th>
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
                                <td className="px-4 py-3">
                                  <Checkbox
                                    checked={selectedAssets.has(asset.id)}
                                    onCheckedChange={() => toggleAssetSelection(asset.id)}
                                    aria-label={`Select ${asset.asset_name}`}
                                  />
                                </td>
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
                                <td className="px-4 py-3">{asset.specifications?.graphicsCard || asset.specifications?.gpu || '-'}</td>
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
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7"
                                      onClick={() => {
                                        setSelectedAsset(asset);
                                        setIsViewModalOpen(true);
                                      }}
                                      title="View Details"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7"
                                      onClick={() => {
                                        setQrAsset({ id: asset.asset_id, name: asset.asset_name });
                                        setIsQRModalOpen(true);
                                      }}
                                      title="View QR Code"
                                    >
                                      <QrCode className="h-3.5 w-3.5" />
                                    </Button>
                                    {(userRole === 'admin' || userRole === 'super_admin') && (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7"
                                          onClick={() => {
                                            setTransferAssetId(asset.id);
                                            setIsTransferModalOpen(true);
                                          }}
                                          title="Transfer Asset"
                                        >
                                          <ArrowLeftRight className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7"
                                          onClick={() => {
                                            setMaintenanceAsset({ id: asset.id, name: asset.asset_name });
                                            setIsMaintenanceModalOpen(true);
                                          }}
                                          title="Maintenance"
                                        >
                                          <Wrench className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7"
                                          onClick={() => {
                                            setEditAsset(asset);
                                            setIsAddDialogOpen(true);
                                          }}
                                          title="Edit Asset"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    )}
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
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setEditAsset(null);
        }}
        onSuccess={() => {
          fetchAssets();
          setEditAsset(null);
        }}
        editAsset={editAsset}
      />
      
      <ViewAssetModal
        asset={selectedAsset}
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        onEdit={() => {
          setIsViewModalOpen(false);
          if (selectedAsset) {
            setEditAsset(selectedAsset);
            setIsAddDialogOpen(true);
          }
        }}
      />
      
      <ViewAssetQRModal
        assetId={qrAsset?.id || null}
        assetName={qrAsset?.name || null}
        open={isQRModalOpen}
        onOpenChange={setIsQRModalOpen}
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* New Feature Modals */}
      <AssetTransferModal 
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        assetId={transferAssetId}
        onSuccess={() => {
          fetchAssets();
          setTransferAssetId(null);
        }}
      />

      <AssetMaintenanceModal
        open={isMaintenanceModalOpen}
        onOpenChange={setIsMaintenanceModalOpen}
        assetId={maintenanceAsset?.id || null}
        assetName={maintenanceAsset?.name || null}
      />

      <BarcodeScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};

export default Assets;
