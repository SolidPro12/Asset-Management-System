import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

/**
 * Generate QR code as data URL
 */
export const generateQRCodeDataURL = (value: string, size: number = 512): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = size;
      canvas.height = size;

      // Create SVG QR code
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', size.toString());
      svg.setAttribute('height', size.toString());
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

      // Use QRCode library to generate
      const QRCode = require('qrcode');
      QRCode.toDataURL(value, { 
        width: size,
        margin: 2,
        errorCorrectionLevel: 'H'
      })
        .then((url: string) => resolve(url))
        .catch((err: Error) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate and download multiple QR codes as a ZIP file
 */
export const downloadQRCodesAsZip = async (
  assets: Array<{ asset_id: string; asset_name: string }>,
  onProgress?: (current: number, total: number) => void
) => {
  try {
    const zip = new JSZip();
    const total = assets.length;

    // Generate QR codes for each asset
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const qrValue = `${window.location.origin}/assets/${asset.asset_id}`;
      
      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Generate QR code as data URL
      const dataUrl = await generateQRCodeDataURL(qrValue, 512);
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Add to ZIP with asset name
      const fileName = `${asset.asset_id}_${asset.asset_name.replace(/[^a-z0-9]/gi, '_')}.png`;
      zip.file(fileName, blob);
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `asset-qr-codes-${new Date().toISOString().split('T')[0]}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error generating ZIP:', error);
    throw error;
  }
};

/**
 * Generate printable PDF with QR code labels (Avery 5160 format - 30 labels per sheet)
 */
export const generatePrintablePDF = async (
  assets: Array<{ asset_id: string; asset_name: string }>,
  onProgress?: (current: number, total: number) => void
) => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter' // 8.5" x 11"
    });

    // Avery 5160 dimensions (in mm)
    const labelWidth = 66.675; // 2.625"
    const labelHeight = 25.4; // 1"
    const marginLeft = 4.7625; // 0.1875"
    const marginTop = 12.7; // 0.5"
    const horizontalGap = 3.175; // 0.125"
    const verticalGap = 0; // No gap between rows
    const labelsPerRow = 3;
    const labelsPerColumn = 10;
    const labelsPerPage = labelsPerRow * labelsPerColumn;

    let currentLabel = 0;
    const total = assets.length;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      
      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Calculate position
      const pageIndex = Math.floor(currentLabel / labelsPerPage);
      const labelOnPage = currentLabel % labelsPerPage;
      const row = Math.floor(labelOnPage / labelsPerRow);
      const col = labelOnPage % labelsPerRow;

      // Add new page if needed
      if (pageIndex > 0 && labelOnPage === 0) {
        pdf.addPage();
      }

      // Calculate coordinates
      const x = marginLeft + col * (labelWidth + horizontalGap);
      const y = marginTop + row * (labelHeight + verticalGap);

      // Generate QR code
      const qrValue = `${window.location.origin}/assets/${asset.asset_id}`;
      const dataUrl = await generateQRCodeDataURL(qrValue, 256);

      // Add QR code to PDF
      const qrSize = 18; // mm
      const qrX = x + (labelWidth - qrSize) / 2;
      const qrY = y + 2;
      pdf.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Add asset name (truncate if too long)
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      const assetNameTruncated = asset.asset_name.length > 30 
        ? asset.asset_name.substring(0, 27) + '...'
        : asset.asset_name;
      const textWidth = pdf.getTextWidth(assetNameTruncated);
      const textX = x + (labelWidth - textWidth) / 2;
      pdf.text(assetNameTruncated, textX, qrY + qrSize + 3);

      // Add asset ID
      pdf.setFontSize(6);
      pdf.setFont('courier', 'normal');
      const idWidth = pdf.getTextWidth(asset.asset_id);
      const idX = x + (labelWidth - idWidth) / 2;
      pdf.text(asset.asset_id, idX, qrY + qrSize + 6);

      currentLabel++;
    }

    // Save PDF
    pdf.save(`asset-qr-labels-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
