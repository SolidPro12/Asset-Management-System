import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AssetQRCode } from './AssetQRCode';

interface ViewAssetQRModalProps {
  assetId: string | null;
  assetName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewAssetQRModal({ assetId, assetName, open, onOpenChange }: ViewAssetQRModalProps) {
  if (!assetId || !assetName) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asset QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <AssetQRCode 
            assetId={assetId}
            assetName={assetName}
            size={256}
            showDownload={true}
            showTitle={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
