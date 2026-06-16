import { jsPDF } from 'jspdf';

export interface InvoiceInput {
  orderId: string;
  paymentId: string;
  dateStr: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  serviceType: string;
  itemCount: number;
  amount: number;
}

export function generateInvoicePDF(data: InvoiceInput) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297

  // Color Palette Constants
  const COAL = '#1c1917'; // stone-900
  const GOLD = '#b45309'; // amber-700
  const TEXT_MUTED = '#78716c'; // stone-500
  const BG_LIGHT = '#fafaf9'; // stone-50
  const GREEN = '#15803d'; // emerald-700

  // Standard Margins
  const lMargin = 20;
  const rMargin = 20;
  const contentWidth = pageWidth - lMargin - rMargin; // 170

  // 1. Draw elegant outer frame border (Aesthetic, high-end)
  doc.setDrawColor(231, 229, 228); // stone-200
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // 2. Corporate Header Logo & Branding Block
  doc.setFillColor(28, 25, 23); // stone-900
  doc.rect(12, 12, pageWidth - 24, 28, 'F');

  // ReLive Gold Star Logo / Emblem Accent
  doc.setTextColor(217, 119, 6); // amber-600
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ReLive', 18, 25);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(250, 250, 249); // Warm stone-50
  doc.text('HERITAGE ARCHIVAL LABORATORIES', 18, 30);
  
  // Header details (right-aligned in header block)
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(245, 158, 11); // gold
  doc.text('JAIPUR LAB HUB & RESTORATION DEPT', pageWidth - 14 - 64, 21);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(168, 162, 158); // stone-400
  doc.text('Special Archival Recovery Zone, Plot 14', pageWidth - 14 - 60, 25);
  doc.text('District Industrial Focal Point, Jaipur, RJ', pageWidth - 14 - 60, 29);
  doc.text('Email: labs@relive-heritage.in | Ph: +91 141-554109', pageWidth - 14 - 64, 33);

  // 3. Document Title Block
  let y = 52;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(28, 25, 23);
  doc.text('OFFICIAL PAYMENT RECEIPT & INVOICE', lMargin, y);

  doc.setDrawColor(180, 83, 9); // amber-700
  doc.setLineWidth(1);
  doc.line(lMargin, y + 2, lMargin + 90, y + 2); // gold decorative underline

  // 4. Metadata Details (Invoice No, Date, Payment ID, Status)
  y = 65;
  
  // Render clean two-column metadata and billing details
  // Left: Customer details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text('BILLED TO:', lMargin, y);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(28, 25, 23);
  doc.text(data.customerName, lMargin, y + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108); // stone-500
  doc.text(`Email: ${data.customerEmail}`, lMargin, y + 10);
  if (data.customerPhone) {
    doc.text(`Phone: ${data.customerPhone}`, lMargin, y + 14);
  }
  if (data.customerAddress) {
    // Basic text wrap for address if long
    const splitAddr = doc.splitTextToSize(`Address: ${data.customerAddress}`, 75);
    doc.text(splitAddr, lMargin, y + 18);
  } else {
    doc.text('Address: Secure Digital Custody Client, India', lMargin, y + 18);
  }

  // Right: Invoice specs
  const colRight = 115;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text('INVOICE INFORMATION:', colRight, y);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108);
  
  doc.text('Receipt Reference:', colRight, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(28, 25, 23);
  doc.text(`#INV-ORD-${data.orderId}`, colRight + 32, y + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text('Payment Gateway:', colRight, y + 10);
  doc.text('Stripe Secure API', colRight + 32, y + 10);

  doc.text('Transaction Date:', colRight, y + 15);
  doc.text(data.dateStr, colRight + 32, y + 15);

  doc.text('Receipt Status:', colRight, y + 20);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(21, 128, 61); // Green
  doc.text('PAID & SECURED', colRight + 32, y + 20);

  // 5. Drawing Itemized Charges Table
  y = 100;
  
  // Table Header Block
  doc.setFillColor(245, 245, 244); // stone-100
  doc.rect(lMargin, y, contentWidth, 8, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(68, 64, 60); // stone-700
  
  doc.text('PARTICULARS & SPECIFICATIONS', lMargin + 3, y + 5.5);
  doc.text('QTY', lMargin + 100, y + 5.5);
  doc.text('UNIT PRICE', lMargin + 120, y + 5.5);
  doc.text('SUBTOTAL', lMargin + 148, y + 5.5);

  // Table Row Separator Line
  doc.setDrawColor(214, 211, 209); // stone-300
  doc.setLineWidth(0.3);
  doc.line(lMargin, y + 8, lMargin + contentWidth, y + 8);

  // Table Row Content
  y += 8;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);

  // Draw light background for better readability
  doc.setFillColor(255, 255, 255);
  doc.rect(lMargin, y, contentWidth, 14, 'F');

  const unitPrice = data.itemCount > 0 ? Math.round(data.amount / data.itemCount) : data.amount;

  doc.setFont('Helvetica', 'bold');
  doc.text(`Digitalization & ${data.serviceType}`, lMargin + 3, y + 5.5);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('Jaipur Labs high-DPI scan, archival color pigment restoration, custom cloud backup & secure S3 storage', lMargin + 3, y + 9.5);

  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text(String(data.itemCount || 1), lMargin + 102, y + 7);
  doc.text(`INR ${unitPrice.toLocaleString('en-IN')}.00`, lMargin + 120, y + 7);
  doc.setFont('Helvetica', 'bold');
  doc.text(`INR ${data.amount.toLocaleString('en-IN')}.00`, lMargin + 148, y + 7);

  // Bottom border of item row
  doc.setDrawColor(214, 211, 209);
  doc.line(lMargin, y + 14, lMargin + contentWidth, y + 14);

  // Summary section
  y += 14;
  
  doc.setFillColor(250, 250, 249); // stone-50
  doc.rect(lMargin + 90, y, 80, 28, 'F');
  doc.rect(lMargin + 90, y, 80, 28, 'S');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Subtotal:', lMargin + 94, y + 6);
  doc.text(`INR ${data.amount.toLocaleString('en-IN')}.00`, lMargin + 140, y + 6);

  doc.text('Taxes & Levies (CGST/SGST 0%):', lMargin + 94, y + 12);
  doc.text('INR 0.00', lMargin + 140, y + 12);

  doc.text('Archival Lab Discount:', lMargin + 94, y + 18);
  doc.text('INR (0.00)', lMargin + 140, y + 18);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(28, 25, 23);
  doc.text('Total Price Amount Paid:', lMargin + 94, y + 24);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`INR ${data.amount.toLocaleString('en-IN')}.00`, lMargin + 138, y + 24);

  // 6. Security, Payment & Gateway Reassurance Block
  y += 36;
  doc.setDrawColor(187, 247, 208); // emerald-250
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.rect(lMargin, y, contentWidth, 14, 'F');
  doc.rect(lMargin, y, contentWidth, 14, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text('🔒 SECURE TRANSACTION CONFIRMED', lMargin + 4, y + 5);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text(`Stripe Payment Reference ID: ${data.paymentId || 'stripe_re_live_auth_token_secured'}`, lMargin + 4, y + 9);

  // Draw a simulated elegant Green Ribbon Stamp "PAID WITH STRIPE"
  doc.setFillColor(22, 163, 74); // emerald-600
  doc.rect(lMargin + 115, y + 2.5, 45, 9, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('VERIFIED CHIP DISPATCH ✓', lMargin + 118, y + 8);

  // 7. Signature, Terms, and Support Footer
  y += 24;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(68, 64, 60);
  doc.text('Terms & Client Responsibilities:', lMargin, y);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('• Digital files are held in physical cold backup for 12 months at the Jaipur headquarters.', lMargin, y + 4.5);
  doc.text('• Your connection to S3 is locked for encryption keys synced strictly via user email authorization.', lMargin, y + 8.5);
  doc.text('• ReLive uses premium high-DPI physical colorization simulation matched to local historical pigment databases.', lMargin, y + 12.5);

  // Lab Director Signature placeholder
  const sigCol = 125;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(68, 64, 60);
  doc.text('For ReLive Heritage Laboratories', sigCol, y);

  // Dynamic aesthetic signature path
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  // Elegant signature brush curves
  doc.line(sigCol + 5, y + 4, sigCol + 15, y + 8);
  doc.line(sigCol + 15, y + 8, sigCol + 25, y + 5);
  doc.line(sigCol + 25, y + 5, sigCol + 35, y + 9);

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('Authorized Signatory', sigCol + 8, y + 13);
  
  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.3);
  doc.line(sigCol, y + 14, sigCol + 45, y + 14);

  // Final Tiny Bottom footer line
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(168, 162, 158);
  doc.text('ReLive Heritage Archival Labs Pvt. Ltd. | CIN: U92110RJ2026PTC099411 | Special economic recovery license #45524', pageWidth / 2 - 68, pageHeight - 14);

  // Save/Download the compiled PDF file
  const safeFilename = `Invoice_ReLive_ORD_${data.orderId}.pdf`;
  doc.save(safeFilename);
}
