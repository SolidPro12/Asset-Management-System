import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Laptop, Monitor, Package, Cpu, HardDrive, MemoryStick, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

interface Asset {
  id: string;
  asset_name: string;
  asset_tag: string;
  category: string;
  brand: string;
  model: string;
  serial_number: string;
  specifications: any;
  status: string;
  location: string;
  department: string;
  allocated_date: string;
  allocated_by_name: string;
}

const MyAssets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyAssets();
    }
  }, [user]);

  const fetchMyAssets = async () => {
    try {
      const { data: allocations, error } = await supabase
        .from('asset_allocations')
        .select(`
          *,
          assets (
            id,
            asset_name,
            asset_tag,
            category,
            brand,
            model,
            serial_number,
            specifications,
            status,
            location,
            department
          )
        `)
        .eq('employee_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;

      // Get allocated by names
      const assetsWithDetails = await Promise.all(
        (allocations || []).map(async (allocation: any) => {
          let allocatedByName = 'Unknown';
          if (allocation.allocated_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', allocation.allocated_by)
              .single();
            if (profile) allocatedByName = profile.full_name;
          }

          return {
            ...allocation.assets,
            allocated_date: allocation.allocated_date,
            allocated_by_name: allocatedByName,
            department: allocation.department || allocation.assets?.department || 'N/A',
            location: allocation.assets?.location || 'N/A',
          };
        })
      );

      setAssets(assetsWithDetails);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssetIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'laptop':
        return <Laptop className="h-8 w-8" />;
      case 'desktop':
        return <Monitor className="h-8 w-8" />;
      case 'mobile':
        return <Smartphone className="h-8 w-8" />;
      default:
        return <Package className="h-8 w-8" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      returned: 'secondary',
      'under maintenance': 'destructive',
    };
    return <Badge variant={variants[status.toLowerCase()] || 'outline'}>{status}</Badge>;
  };

  const renderSpecifications = (asset: Asset) => {
    const specs = asset.specifications || {};
    
    if (asset.category === 'laptop' || asset.category === 'desktop') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {specs.processor && (
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{specs.processor}</span>
            </div>
          )}
          {specs.ram && (
            <div className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{specs.ram}</span>
            </div>
          )}
          {specs.storage && (
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{specs.storage}</span>
            </div>
          )}
          {specs.os && (
            <div className="flex items-center gap-2">
              <span className="text-sm">🪟 {specs.os}</span>
            </div>
          )}
        </div>
      );
    } else if (asset.category === 'software') {
      return (
        <div className="space-y-2">
          {specs.version && <div className="text-sm">Version: {specs.version}</div>}
          {specs.license_type && <div className="text-sm">License: {specs.license_type}</div>}
          {specs.license_key && (
            <div className="text-sm">Key: {specs.license_key.replace(/./g, '*')}</div>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Assets</h1>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No assets assigned to you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getAssetIcon(asset.category)}
                    <div>
                      <CardTitle className="text-lg">
                        {asset.category} - {asset.model}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{asset.brand}</p>
                    </div>
                  </div>
                  {getStatusBadge(asset.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Asset ID:</span>
                    <span className="font-medium">{asset.asset_tag}</span>
                  </div>
                  {asset.serial_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Serial:</span>
                      <span className="font-medium">{asset.serial_number}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  {renderSpecifications(asset)}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Assigned:</span>
                    <span>{format(new Date(asset.allocated_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Assigned By:</span>
                    <span>{asset.allocated_by_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{asset.location}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Department:</span>
                    <span>{asset.department}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedAsset(asset);
                    setIsDialogOpen(true);
                  }}
                >
                  View More Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getAssetIcon(selectedAsset.category)}
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedAsset.asset_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedAsset.brand} {selectedAsset.model}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Asset ID</p>
                  <p className="font-medium">{selectedAsset.asset_tag}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Serial Number</p>
                  <p className="font-medium">{selectedAsset.serial_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedAsset.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedAsset.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Full Specifications</p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(selectedAsset.specifications, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedAsset.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedAsset.department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedAsset.allocated_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned By</p>
                  <p className="font-medium">{selectedAsset.allocated_by_name}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAssets;
