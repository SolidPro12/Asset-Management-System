import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, QrCode } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AssetQRCodeProps {
  assetId: string;
  assetName: string;
  size?: number;
  showDownload?: boolean;
  showTitle?: boolean;
}

export function AssetQRCode({ 
  assetId, 
  assetName, 
  size = 200,
  showDownload = true,
  showTitle = true
}: AssetQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate URL for QR code - includes asset ID for direct access
  const qrValue = `${window.location.origin}/assets/${assetId}`;

  const downloadQRCode = () => {
    try {
      const svg = qrRef.current?.querySelector('svg');
      if (!svg) {
        toast({
          title: "Error",
          description: "QR code not found",
          variant: "destructive"
        });
        return;
      }

      // Create canvas from SVG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = size;
      canvas.height = size;

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // Download as PNG
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = `asset-${assetId}-qr.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);

            toast({
              title: "Success",
              description: "QR code downloaded successfully"
            });
          }
        });
      };
      img.src = url;
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Asset QR Code</h4>
          </div>
        )}
        
        <div className="flex flex-col items-center gap-4">
          <div 
            ref={qrRef}
            className="bg-white p-4 rounded-lg border-2 border-border"
          >
            <QRCodeSVG 
              value={qrValue}
              size={size}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">{assetName}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {assetId}
            </p>
          </div>

          {showDownload && (
            <Button 
              onClick={downloadQRCode}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
