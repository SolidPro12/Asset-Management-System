import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, MapPin, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  serial_number: string | null;
  current_assignee?: {
    full_name: string;
    email: string;
  } | null;
}

interface AssetCategoryModalProps {
  open: boolean;
  onClose: () => void;
  category: string;
  categoryLabel: string;
  assets: Asset[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-800 border-green-200';
    case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'under_maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'retired': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const AssetCategoryModal = ({ open, onClose, category, categoryLabel, assets }: AssetCategoryModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (asset.category !== category) return false;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        asset.asset_id.toLowerCase().includes(searchLower) ||
        asset.asset_name.toLowerCase().includes(searchLower) ||
        asset.asset_tag.toLowerCase().includes(searchLower) ||
        asset.brand?.toLowerCase().includes(searchLower) ||
        asset.model?.toLowerCase().includes(searchLower) ||
        asset.location?.toLowerCase().includes(searchLower) ||
        asset.department?.toLowerCase().includes(searchLower) ||
        asset.current_assignee?.full_name.toLowerCase().includes(searchLower)
      );
    });
  }, [assets, category, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            {categoryLabel} ({filteredAssets.length})
          </DialogTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by asset ID, name, tag, brand, model, location, or assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-muted-foreground mb-2">
                {searchQuery ? 'No assets found matching your search' : `No ${categoryLabel.toLowerCase()} found`}
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Brand/Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">{asset.asset_id}</span>
                        <span className="text-xs text-muted-foreground">{asset.asset_tag}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{asset.asset_name}</span>
                        {asset.serial_number && (
                          <span className="text-xs text-muted-foreground">SN: {asset.serial_number}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {asset.brand && <span className="text-sm">{asset.brand}</span>}
                        {asset.model && <span className="text-xs text-muted-foreground">{asset.model}</span>}
                        {!asset.brand && !asset.model && <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(asset.status)}>
                        {formatStatus(asset.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {asset.current_assignee ? (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex flex-col">
                            <span className="text-sm">{asset.current_assignee.full_name}</span>
                            <span className="text-xs text-muted-foreground">{asset.current_assignee.email}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {asset.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{asset.location}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {asset.department ? (
                        <span className="text-sm">{asset.department}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {asset.purchase_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{new Date(asset.purchase_date).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
