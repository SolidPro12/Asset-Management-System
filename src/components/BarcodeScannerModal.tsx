import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
}

export function BarcodeScannerModal({ open, onOpenChange, onScanSuccess }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = () => {
    if (scannerRef.current) {
      stopScanner();
    }

    try {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Extract asset ID from QR code URL or use directly
          let assetId = decodedText;
          
          // If it's a URL, extract the asset ID
          if (decodedText.includes('/asset/')) {
            const urlParts = decodedText.split('/asset/');
            assetId = urlParts[1]?.split('?')[0] || decodedText;
          }

          onScanSuccess(assetId);
          stopScanner();
          onOpenChange(false);
        },
        (errorMessage) => {
          // Ignore common errors like "No QR code found"
          if (!errorMessage.includes('No MultiFormat Readers')) {
            console.log('QR scan error:', errorMessage);
          }
        }
      );

      scannerRef.current = scanner;
      setError(null);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please check camera permissions.');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
  };

  const handleClose = () => {
    stopScanner();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Asset QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded text-sm">
            <p className="mb-2">Position the QR code or barcode within the frame to scan.</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Ensure good lighting</li>
              <li>Hold steady and avoid glare</li>
              <li>Keep the code centered in the frame</li>
            </ul>
          </div>

          <div id="qr-reader" className="w-full"></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}