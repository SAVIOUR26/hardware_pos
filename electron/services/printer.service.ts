import { queryOne, query } from '../database';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Use require for pdfMake to ensure proper loading in packaged Electron apps
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

// Configure pdfMake with fonts
// Handle different module export structures in dev vs production
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

// Type definitions for pdfmake
type Content = any;
type TDocumentDefinitions = any;

/**
 * Printer Service
 * Handles PDF generation for invoices, receipts, and delivery notes
 */

interface CompanyInfo {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tin: string | null;
  logo_path: string | null;
}

interface PrinterSettings {
  thermal_printer_name: string | null;
  a4_printer_name: string | null;
  thermal_paper_width: 80 | 58;
  a4_paper_size: 'A4' | 'Letter';
  a4_orientation: 'portrait' | 'landscape';
}

/**
 * Get company information for headers
 */
function getCompanyInfo(): CompanyInfo {
  try {
    const company = queryOne<CompanyInfo>(
      `SELECT name, address, phone, email, tin, logo_path
       FROM companies
       WHERE id = 1`
    );
    return company || {
      name: 'Stuti Hardware SMC Limited',
      address: 'Go Down Rd, Arua, Uganda',
      phone: '+256 777 058557',
      email: null,
      tin: null,
      logo_path: null,
    };
  } catch (error) {
    console.error('Failed to get company info:', error);
    return {
      name: 'Stuti Hardware SMC Limited',
      address: 'Go Down Rd, Arua, Uganda',
      phone: '+256 777 058557',
      email: null,
      tin: null,
      logo_path: null,
    };
  }
}

/**
 * Get printer settings
 */
function getPrinterSettings(): PrinterSettings {
  try {
    const settings = queryOne<any>(
      `SELECT key, value FROM settings
       WHERE key LIKE 'printer.%'`
    );

    return {
      thermal_printer_name: settings?.['printer.thermal_printer_name'] || null,
      a4_printer_name: settings?.['printer.a4_printer_name'] || null,
      thermal_paper_width: parseInt(settings?.['printer.thermal_paper_width'] || '80') as 80 | 58,
      a4_paper_size: (settings?.['printer.a4_paper_size'] || 'A4') as 'A4' | 'Letter',
      a4_orientation: (settings?.['printer.a4_orientation'] || 'portrait') as 'portrait' | 'landscape',
    };
  } catch (error) {
    console.error('Failed to get printer settings:', error);
    return {
      thermal_printer_name: null,
      a4_printer_name: null,
      thermal_paper_width: 80,
      a4_paper_size: 'A4',
      a4_orientation: 'portrait',
    };
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number | undefined | null, currency: string = 'UGX'): string {
  // Handle undefined, null, or NaN values
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  if (currency === 'UGX') {
    return `UGX ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  } else {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Generate PDF for invoice
 */
export async function generateInvoicePDF(invoiceId: number): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    // Get invoice data
    const invoice = queryOne<any>(
      `SELECT si.*, c.name as customer_name, c.phone as customer_phone,
              c.email as customer_email, c.address as customer_address
       FROM sales_invoices si
       JOIN customers c ON si.customer_id = c.id
       WHERE si.id = ?`,
      [invoiceId]
    );

    if (!invoice) {
      return { success: false, error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found' } };
    }

    // Get invoice items
    const items = query(
      `SELECT sii.*, p.name as product_name, p.unit
       FROM sales_invoice_items sii
       JOIN products p ON sii.product_id = p.id
       WHERE sii.invoice_id = ?
       ORDER BY sii.id`,
      [invoiceId]
    );

    const company = getCompanyInfo();
    const settings = getPrinterSettings();

    // Build PDF content
    const docDefinition: TDocumentDefinitions = {
      pageSize: settings.a4_paper_size,
      pageOrientation: settings.a4_orientation,
      pageMargins: [40, 60, 40, 60],

      header: (currentPage: number, pageCount: number) => {
        return {
          margin: [40, 20, 40, 0],
          columns: [
            {
              width: '*',
              text: company.name,
              style: 'companyName',
            },
            {
              width: 'auto',
              text: invoice.is_quotation ? 'QUOTATION' : 'SALES INVOICE',
              style: 'documentTitle',
              alignment: 'right',
            },
          ],
        };
      },

      content: [
        // Company Info
        {
          columns: [
            {
              width: '60%',
              stack: [
                { text: company.name, style: 'companyInfo', bold: true },
                company.address ? { text: company.address, style: 'companyInfo' } : null,
                company.phone ? { text: `Phone: ${company.phone}`, style: 'companyInfo' } : null,
                company.email ? { text: `Email: ${company.email}`, style: 'companyInfo' } : null,
                company.tin ? { text: `TIN: ${company.tin}`, style: 'companyInfo' } : null,
              ].filter(Boolean),
            },
            {
              width: '40%',
              stack: [
                { text: `${invoice.is_quotation ? 'Quote' : 'Invoice'} #: ${invoice.invoice_number}`, style: 'invoiceInfo' },
                { text: `Date: ${format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}`, style: 'invoiceInfo' },
                invoice.due_date ? { text: `Due Date: ${format(new Date(invoice.due_date), 'dd/MM/yyyy')}`, style: 'invoiceInfo' } : null,
              ].filter(Boolean),
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // Customer Info
        {
          text: 'BILL TO:',
          style: 'sectionHeader',
          margin: [0, 0, 0, 5],
        },
        {
          stack: [
            { text: invoice.customer_name, bold: true },
            invoice.customer_address ? { text: invoice.customer_address } : null,
            invoice.customer_phone ? { text: `Phone: ${invoice.customer_phone}` } : null,
            invoice.customer_email ? { text: `Email: ${invoice.customer_email}` } : null,
          ].filter(Boolean),
          style: 'customerInfo',
          margin: [0, 0, 0, 20],
        },

        // Items Table
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'ITEM', style: 'tableHeader' },
                { text: 'QTY', style: 'tableHeader', alignment: 'center' },
                { text: 'UNIT', style: 'tableHeader', alignment: 'center' },
                { text: 'PRICE', style: 'tableHeader', alignment: 'right' },
                { text: 'TOTAL', style: 'tableHeader', alignment: 'right' },
              ],
              ...items.map((item: any) => [
                { text: item.product_name, style: 'tableCell' },
                { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' },
                { text: item.unit || 'pcs', style: 'tableCell', alignment: 'center' },
                { text: formatCurrency(item.unit_price, invoice.currency), style: 'tableCell', alignment: 'right' },
                { text: formatCurrency(item.line_total, invoice.currency), style: 'tableCell', alignment: 'right' },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#000' : '#ddd',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },

        // Totals
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                widths: ['auto', 'auto'],
                body: [
                  invoice.discount_amount > 0 ? [
                    { text: 'Subtotal:', alignment: 'right', border: [false, false, false, false] },
                    {
                      text: formatCurrency(invoice.total_amount + invoice.discount_amount, invoice.currency),
                      alignment: 'right',
                      border: [false, false, false, false],
                    },
                  ] : null,
                  invoice.discount_amount > 0 ? [
                    { text: 'Discount:', alignment: 'right', border: [false, false, false, false] },
                    {
                      text: `-${formatCurrency(invoice.discount_amount, invoice.currency)}`,
                      alignment: 'right',
                      border: [false, false, false, false],
                    },
                  ] : null,
                  [
                    { text: 'Total:', alignment: 'right', bold: true, border: [false, true, false, false] },
                    {
                      text: formatCurrency(invoice.total_amount, invoice.currency),
                      alignment: 'right',
                      bold: true,
                      border: [false, true, false, false],
                    },
                  ],
                  invoice.currency !== 'UGX' ? [
                    { text: 'Total (UGX):', alignment: 'right', bold: true, border: [false, false, false, false] },
                    {
                      text: formatCurrency(invoice.total_amount_ugx, 'UGX'),
                      alignment: 'right',
                      bold: true,
                      border: [false, false, false, false],
                    },
                  ] : null,
                ].filter(Boolean) as any,
              },
              layout: 'noBorders',
            },
          ],
          margin: [0, 20, 0, 0],
        },

        // Payment Status
        invoice.is_quotation ? null : {
          text: [
            { text: 'Payment Status: ', bold: true },
            {
              text: invoice.payment_status,
              color: invoice.payment_status === 'Paid' ? 'green' :
                     invoice.payment_status === 'Partial' ? 'orange' : 'red',
            },
          ],
          margin: [0, 20, 0, 0],
        },

        // Notes
        invoice.notes ? {
          stack: [
            { text: 'Notes:', bold: true, margin: [0, 20, 0, 5] },
            { text: invoice.notes, italics: true },
          ],
        } : null,

        // Terms
        {
          text: 'Thank you for your business!',
          style: 'footer',
          margin: [0, 30, 0, 0],
          alignment: 'center',
        },
      ].filter(Boolean) as Content[],

      footer: (currentPage: number, pageCount: number) => {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          margin: [0, 10, 0, 0],
        };
      },

      styles: {
        companyName: {
          fontSize: 18,
          bold: true,
        },
        documentTitle: {
          fontSize: 20,
          bold: true,
          color: '#1e40af',
        },
        companyInfo: {
          fontSize: 9,
          lineHeight: 1.3,
        },
        invoiceInfo: {
          fontSize: 10,
          lineHeight: 1.3,
          alignment: 'right',
        },
        sectionHeader: {
          fontSize: 11,
          bold: true,
          color: '#1e40af',
        },
        customerInfo: {
          fontSize: 10,
          lineHeight: 1.3,
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          fillColor: '#f3f4f6',
        },
        tableCell: {
          fontSize: 9,
        },
        footer: {
          fontSize: 10,
          italics: true,
        },
      },
    };

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);

    // Save to temp directory
    const outputDir = path.join(app.getPath('temp'), 'hardware-pro-prints');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `invoice_${invoice.invoice_number.replace(/\//g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);

    return new Promise((resolve) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        fs.writeFileSync(filePath, buffer);
        resolve({ success: true, filePath });
      });
    });
  } catch (error: any) {
    console.error('Failed to generate invoice PDF:', error);
    return {
      success: false,
      error: { code: 'PDF_GENERATION_ERROR', message: error.message },
    };
  }
}

/**
 * Generate PDF for purchase invoice
 */
export async function generatePurchaseInvoicePDF(invoiceId: number): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    // Get purchase invoice data
    const invoice = queryOne<any>(
      `SELECT pi.*, s.name as supplier_name, s.phone as supplier_phone,
              s.email as supplier_email, s.address as supplier_address
       FROM purchase_invoices pi
       JOIN suppliers s ON pi.supplier_id = s.id
       WHERE pi.id = ?`,
      [invoiceId]
    );

    if (!invoice) {
      return { success: false, error: { code: 'INVOICE_NOT_FOUND', message: 'Purchase invoice not found' } };
    }

    // Get purchase invoice items
    const items = query(
      `SELECT pii.*, p.name as product_name, p.unit
       FROM purchase_invoice_items pii
       JOIN products p ON pii.product_id = p.id
       WHERE pii.invoice_id = ?
       ORDER BY pii.id`,
      [invoiceId]
    );

    const company = getCompanyInfo();
    const settings = getPrinterSettings();

    // Build PDF content
    const docDefinition: TDocumentDefinitions = {
      pageSize: settings.a4_paper_size,
      pageOrientation: settings.a4_orientation,
      pageMargins: [40, 60, 40, 60],

      header: (currentPage: number, pageCount: number) => {
        return {
          margin: [40, 20, 40, 0],
          columns: [
            {
              width: '*',
              text: company.name,
              style: 'companyName',
            },
            {
              width: 'auto',
              text: 'PURCHASE INVOICE',
              style: 'documentTitle',
              alignment: 'right',
            },
          ],
        };
      },

      content: [
        // Company Info
        {
          columns: [
            {
              width: '60%',
              stack: [
                { text: company.name, style: 'companyInfo', bold: true },
                company.address ? { text: company.address, style: 'companyInfo' } : null,
                company.phone ? { text: `Phone: ${company.phone}`, style: 'companyInfo' } : null,
                company.email ? { text: `Email: ${company.email}`, style: 'companyInfo' } : null,
                company.tin ? { text: `TIN: ${company.tin}`, style: 'companyInfo' } : null,
              ].filter(Boolean),
            },
            {
              width: '40%',
              stack: [
                { text: `Purchase #: ${invoice.purchase_number}`, style: 'invoiceInfo' },
                { text: `Date: ${format(new Date(invoice.purchase_date), 'dd/MM/yyyy')}`, style: 'invoiceInfo' },
              ],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // Supplier Info
        {
          text: 'SUPPLIER:',
          style: 'sectionHeader',
          margin: [0, 0, 0, 5],
        },
        {
          stack: [
            { text: invoice.supplier_name, bold: true },
            invoice.supplier_address ? { text: invoice.supplier_address } : null,
            invoice.supplier_phone ? { text: `Phone: ${invoice.supplier_phone}` } : null,
            invoice.supplier_email ? { text: `Email: ${invoice.supplier_email}` } : null,
          ].filter(Boolean),
          style: 'customerInfo',
          margin: [0, 0, 0, 20],
        },

        // Items Table
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'ITEM', style: 'tableHeader' },
                { text: 'QTY', style: 'tableHeader', alignment: 'center' },
                { text: 'UNIT', style: 'tableHeader', alignment: 'center' },
                { text: 'PRICE', style: 'tableHeader', alignment: 'right' },
                { text: 'TOTAL', style: 'tableHeader', alignment: 'right' },
              ],
              ...items.map((item: any) => [
                { text: item.product_name, style: 'tableCell' },
                { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' },
                { text: item.unit || 'pcs', style: 'tableCell', alignment: 'center' },
                { text: formatCurrency(item.unit_cost, invoice.currency), style: 'tableCell', alignment: 'right' },
                { text: formatCurrency(item.line_total, invoice.currency), style: 'tableCell', alignment: 'right' },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#000' : '#ddd',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },

        // Totals
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                widths: ['auto', 'auto'],
                body: [
                  [
                    { text: 'Total:', alignment: 'right', bold: true, border: [false, true, false, false] },
                    {
                      text: formatCurrency(invoice.total_amount, invoice.currency),
                      alignment: 'right',
                      bold: true,
                      border: [false, true, false, false],
                    },
                  ],
                  invoice.currency !== 'UGX' ? [
                    { text: 'Total (UGX):', alignment: 'right', bold: true, border: [false, false, false, false] },
                    {
                      text: formatCurrency(invoice.total_amount_ugx, 'UGX'),
                      alignment: 'right',
                      bold: true,
                      border: [false, false, false, false],
                    },
                  ] : null,
                ].filter(Boolean) as any,
              },
              layout: 'noBorders',
            },
          ],
          margin: [0, 20, 0, 0],
        },

        // Notes
        invoice.notes ? {
          stack: [
            { text: 'Notes:', bold: true, margin: [0, 20, 0, 5] },
            { text: invoice.notes, italics: true },
          ],
        } : null,
      ].filter(Boolean) as Content[],

      styles: {
        companyName: { fontSize: 18, bold: true },
        documentTitle: { fontSize: 16, bold: true, color: '#333' },
        companyInfo: { fontSize: 9, margin: [0, 2, 0, 0] },
        invoiceInfo: { fontSize: 10, margin: [0, 2, 0, 0] },
        sectionHeader: { fontSize: 11, bold: true, color: '#333' },
        customerInfo: { fontSize: 9, margin: [0, 2, 0, 0] },
        tableHeader: { fontSize: 10, bold: true, fillColor: '#f3f4f6', margin: [0, 5, 0, 5] },
        tableCell: { fontSize: 9, margin: [0, 3, 0, 3] },
      },
    };

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);

    // Get temp directory
    const tempDir = app.getPath('temp');
    const fileName = `purchase_${invoice.purchase_number.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);

    // Write to file
    await new Promise<void>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        fs.writeFile(filePath, buffer, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    console.log('Purchase invoice PDF generated:', filePath);

    return {
      success: true,
      filePath,
    };
  } catch (error: any) {
    console.error('Failed to generate purchase invoice PDF:', error);
    return {
      success: false,
      error: { code: 'PDF_GENERATION_ERROR', message: error.message },
    };
  }
}

/**
 * Generate industry-standard thermal receipt for 3-inch (80mm) thermal printer
 * Optimized for ESC/POS thermal printers with 48 characters per line
 */
export async function generateThermalReceipt(invoiceId: number): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    // Get invoice data
    const invoice = queryOne<any>(
      `SELECT si.*, c.name as customer_name, c.phone as customer_phone
       FROM sales_invoices si
       JOIN customers c ON si.customer_id = c.id
       WHERE si.id = ?`,
      [invoiceId]
    );

    if (!invoice) {
      return { success: false, error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found' } };
    }

    // Get invoice items
    const items = query(
      `SELECT sii.*, p.name as product_name, p.unit
       FROM sales_invoice_items sii
       JOIN products p ON sii.product_id = p.id
       WHERE sii.invoice_id = ?
       ORDER BY sii.id`,
      [invoiceId]
    );

    const company = getCompanyInfo();

    // Helper function to format text for thermal printer (48 chars per line)
    const formatLine = (left: string, right: string, width: number = 48): string => {
      const spacesNeeded = width - left.length - right.length;
      return left + ' '.repeat(Math.max(0, spacesNeeded)) + right;
    };

    const centerText = (text: string, width: number = 48): string => {
      const padding = Math.floor((width - text.length) / 2);
      return ' '.repeat(Math.max(0, padding)) + text;
    };

    const separator = '='.repeat(48);
    const dashedLine = '-'.repeat(48);

    // Build thermal receipt content with industry-standard formatting
    const docDefinition: TDocumentDefinitions = {
      pageSize: {
        width: 226.77, // 80mm in points (80 * 2.83465)
        height: 'auto',
      },
      pageMargins: [8, 8, 8, 8],

      defaultStyle: {
        font: 'Courier', // Monospace font for proper alignment
        fontSize: 10,
        lineHeight: 1.2,
      },

      content: [
        // Company Header - Centered and Bold
        {
          text: company.name.toUpperCase(),
          fontSize: 12,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 2],
        },
        company.address ? {
          text: company.address,
          fontSize: 9,
          alignment: 'center',
        } : null,
        company.phone ? {
          text: `Tel: ${company.phone}`,
          fontSize: 9,
          alignment: 'center',
        } : null,
        company.tin ? {
          text: `TIN: ${company.tin}`,
          fontSize: 9,
          alignment: 'center',
          margin: [0, 0, 0, 2],
        } : null,

        // Main Separator
        {
          text: separator,
          fontSize: 10,
          margin: [0, 3, 0, 3],
        },

        // Receipt Title
        {
          text: invoice.is_quotation ? 'QUOTATION' : 'SALES RECEIPT',
          fontSize: 11,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 3],
        },

        // Transaction Details
        {
          text: formatLine('Invoice No:', invoice.invoice_number),
          fontSize: 9,
        },
        {
          text: formatLine('Date:', format(new Date(invoice.invoice_date), 'dd/MM/yyyy HH:mm')),
          fontSize: 9,
        },
        {
          text: formatLine('Customer:', invoice.customer_name),
          fontSize: 9,
          margin: [0, 0, 0, 2],
        },

        // Items Separator
        {
          text: dashedLine,
          fontSize: 10,
          margin: [0, 2, 0, 2],
        },

        // Column Headers
        {
          text: 'Item                    Qty   Price   Total',
          fontSize: 9,
          bold: true,
          margin: [0, 0, 0, 2],
        },

        {
          text: dashedLine,
          fontSize: 10,
          margin: [0, 0, 0, 2],
        },

        // Items - Each on two lines for clarity
        ...items.map((item: any) => {
          const productName = item.product_name.length > 48
            ? item.product_name.substring(0, 45) + '...'
            : item.product_name;

          const qty = item.quantity.toString();
          const price = formatCurrency(item.unit_price, invoice.currency);
          const total = formatCurrency(item.line_total, invoice.currency);

          // Format: Qty x Price = Total (right-aligned)
          const qtyPriceTotal = `${qty} x ${price} = ${total}`;

          return [
            {
              text: productName,
              fontSize: 9,
            },
            {
              text: qtyPriceTotal,
              fontSize: 9,
              alignment: 'right',
              margin: [0, 0, 0, 3],
            },
          ];
        }).flat(),

        // Totals Separator
        {
          text: separator,
          fontSize: 10,
          margin: [0, 2, 0, 2],
        },

        // Subtotal (if discount exists)
        invoice.discount_amount > 0 ? {
          text: formatLine('Subtotal:', formatCurrency(invoice.total_amount + invoice.discount_amount, invoice.currency)),
          fontSize: 10,
        } : null,

        // Discount
        invoice.discount_amount > 0 ? {
          text: formatLine('Discount:', `-${formatCurrency(invoice.discount_amount, invoice.currency)}`),
          fontSize: 10,
        } : null,

        // Grand Total - Bold and larger
        {
          text: formatLine('TOTAL:', formatCurrency(invoice.total_amount, invoice.currency)),
          fontSize: 11,
          bold: true,
          margin: [0, 2, 0, 0],
        },

        // Total in UGX if different currency
        invoice.currency !== 'UGX' ? {
          text: formatLine('(UGX):', formatCurrency(invoice.total_amount_ugx, 'UGX')),
          fontSize: 10,
          margin: [0, 0, 0, 2],
        } : null,

        // Payment Status (if not quotation)
        invoice.is_quotation ? null : {
          text: separator,
          fontSize: 10,
          margin: [0, 3, 0, 2],
        },

        invoice.is_quotation ? null : {
          text: formatLine('Payment Status:', invoice.payment_status),
          fontSize: 9,
          margin: [0, 0, 0, 2],
        },

        // Footer
        {
          text: separator,
          fontSize: 10,
          margin: [0, 3, 0, 2],
        },

        {
          text: 'THANK YOU FOR YOUR BUSINESS!',
          fontSize: 10,
          bold: true,
          alignment: 'center',
          margin: [0, 2, 0, 1],
        },

        {
          text: 'Please come again',
          fontSize: 9,
          alignment: 'center',
          margin: [0, 0, 0, 3],
        },

        // Powered by (optional)
        {
          text: centerText('Powered by Hardware POS'),
          fontSize: 7,
          alignment: 'center',
          color: '#666666',
        },
      ].filter(Boolean) as Content[],
    };

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);

    // Save to temp directory
    const outputDir = path.join(app.getPath('temp'), 'hardware-pro-prints');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `thermal_receipt_${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);

    return new Promise((resolve) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        fs.writeFileSync(filePath, buffer);
        resolve({ success: true, filePath });
      });
    });
  } catch (error: any) {
    console.error('Failed to generate thermal receipt:', error);
    return {
      success: false,
      error: { code: 'PDF_GENERATION_ERROR', message: error.message },
    };
  }
}

/**
 * Generate thermal receipt (80mm or 58mm)
 */
export async function generateReceiptPDF(data: any, printerName?: string): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    const company = getCompanyInfo();
    const settings = getPrinterSettings();
    const paperWidth = settings.thermal_paper_width;

    // Build receipt content
    const docDefinition: TDocumentDefinitions = {
      pageSize: {
        width: paperWidth * 2.83465, // mm to points
        height: 'auto',
      },
      pageMargins: [10, 10, 10, 10],

      content: [
        // Company Name
        {
          text: company.name,
          style: 'receiptHeader',
          alignment: 'center',
        },
        company.address ? {
          text: company.address,
          style: 'receiptInfo',
          alignment: 'center',
        } : null,
        company.phone ? {
          text: company.phone,
          style: 'receiptInfo',
          alignment: 'center',
        } : null,

        // Separator
        { text: '─'.repeat(40), alignment: 'center', margin: [0, 5, 0, 5] },

        // Receipt details
        {
          text: 'RECEIPT',
          style: 'receiptTitle',
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },

        // Transaction info
        {
          columns: [
            { text: 'Date:', width: 'auto', style: 'receiptInfo' },
            { text: data.date || format(new Date(), 'dd/MM/yyyy HH:mm'), width: '*', style: 'receiptInfo', alignment: 'right' },
          ],
        },
        data.invoiceNumber ? {
          columns: [
            { text: 'Invoice:', width: 'auto', style: 'receiptInfo' },
            { text: data.invoiceNumber, width: '*', style: 'receiptInfo', alignment: 'right' },
          ],
        } : null,
        data.customerName ? {
          columns: [
            { text: 'Customer:', width: 'auto', style: 'receiptInfo' },
            { text: data.customerName, width: '*', style: 'receiptInfo', alignment: 'right' },
          ],
          margin: [0, 0, 0, 5],
        } : null,

        // Separator
        { text: '─'.repeat(40), alignment: 'center', margin: [0, 5, 0, 5] },

        // Items
        ...(data.items || []).map((item: any) => [
          {
            text: item.name,
            style: 'receiptItem',
          },
          {
            columns: [
              { text: `${item.quantity} × ${formatCurrency(item.price, data.currency)}`, width: '*', style: 'receiptInfo' },
              { text: formatCurrency(item.total, data.currency), width: 'auto', style: 'receiptInfo', alignment: 'right' },
            ],
            margin: [0, 0, 0, 5],
          },
        ]).flat(),

        // Separator
        { text: '─'.repeat(40), alignment: 'center', margin: [0, 5, 0, 5] },

        // Total
        {
          columns: [
            { text: 'TOTAL:', width: '*', style: 'receiptTotal', bold: true },
            { text: formatCurrency(data.total, data.currency), width: 'auto', style: 'receiptTotal', bold: true, alignment: 'right' },
          ],
          margin: [0, 5, 0, 5],
        },

        data.paid ? {
          columns: [
            { text: 'Paid:', width: '*', style: 'receiptInfo' },
            { text: formatCurrency(data.paid, data.currency), width: 'auto', style: 'receiptInfo', alignment: 'right' },
          ],
        } : null,

        data.change ? {
          columns: [
            { text: 'Change:', width: '*', style: 'receiptInfo' },
            { text: formatCurrency(data.change, data.currency), width: 'auto', style: 'receiptInfo', alignment: 'right' },
          ],
        } : null,

        // Footer
        { text: '─'.repeat(40), alignment: 'center', margin: [0, 10, 0, 5] },
        {
          text: 'Thank you for your business!',
          style: 'receiptFooter',
          alignment: 'center',
        },
        company.tin ? {
          text: `TIN: ${company.tin}`,
          style: 'receiptFooter',
          alignment: 'center',
        } : null,
      ].filter(Boolean) as Content[],

      styles: {
        receiptHeader: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 5],
        },
        receiptTitle: {
          fontSize: 12,
          bold: true,
        },
        receiptInfo: {
          fontSize: 9,
          lineHeight: 1.3,
        },
        receiptItem: {
          fontSize: 10,
          bold: true,
        },
        receiptTotal: {
          fontSize: 11,
        },
        receiptFooter: {
          fontSize: 8,
          lineHeight: 1.3,
        },
      },
    };

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);

    // Save to temp directory
    const outputDir = path.join(app.getPath('temp'), 'hardware-pro-prints');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `receipt_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);

    return new Promise((resolve) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        fs.writeFileSync(filePath, buffer);
        resolve({ success: true, filePath });
      });
    });
  } catch (error: any) {
    console.error('Failed to generate receipt PDF:', error);
    return {
      success: false,
      error: { code: 'PDF_GENERATION_ERROR', message: error.message },
    };
  }
}

/**
 * Generate delivery note PDF
 */
export async function generateDeliveryNotePDF(
  deliveryNoteId: number,
  showPrices: boolean
): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    // Get delivery note data (from sales invoice)
    const invoice = queryOne<any>(
      `SELECT si.*, c.name as customer_name, c.phone as customer_phone,
              c.address as customer_address
       FROM sales_invoices si
       JOIN customers c ON si.customer_id = c.id
       WHERE si.id = ?`,
      [deliveryNoteId]
    );

    if (!invoice) {
      return { success: false, error: { code: 'DELIVERY_NOTE_NOT_FOUND', message: 'Delivery note not found' } };
    }

    // Get items
    const items = query(
      `SELECT sii.*, p.name as product_name, p.unit
       FROM sales_invoice_items sii
       JOIN products p ON sii.product_id = p.id
       WHERE sii.invoice_id = ?
       ORDER BY sii.id`,
      [deliveryNoteId]
    );

    const company = getCompanyInfo();
    const settings = getPrinterSettings();

    // Build PDF content
    const docDefinition: TDocumentDefinitions = {
      pageSize: settings.a4_paper_size,
      pageOrientation: settings.a4_orientation,
      pageMargins: [40, 60, 40, 60],

      header: (currentPage: number, pageCount: number) => {
        return {
          margin: [40, 20, 40, 0],
          columns: [
            {
              width: '*',
              text: company.name,
              style: 'companyName',
            },
            {
              width: 'auto',
              text: 'DELIVERY NOTE',
              style: 'documentTitle',
              alignment: 'right',
            },
          ],
        };
      },

      content: [
        // Company & Delivery Info
        {
          columns: [
            {
              width: '60%',
              stack: [
                { text: company.name, style: 'companyInfo', bold: true },
                company.address ? { text: company.address, style: 'companyInfo' } : null,
                company.phone ? { text: `Phone: ${company.phone}`, style: 'companyInfo' } : null,
              ].filter(Boolean),
            },
            {
              width: '40%',
              stack: [
                { text: `DN #: ${invoice.invoice_number}`, style: 'invoiceInfo' },
                { text: `Date: ${format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}`, style: 'invoiceInfo' },
                { text: `Ref Invoice: ${invoice.invoice_number}`, style: 'invoiceInfo' },
              ],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // Customer Info
        {
          text: 'DELIVER TO:',
          style: 'sectionHeader',
          margin: [0, 0, 0, 5],
        },
        {
          stack: [
            { text: invoice.customer_name, bold: true },
            invoice.customer_address ? { text: invoice.customer_address } : null,
            invoice.customer_phone ? { text: `Phone: ${invoice.customer_phone}` } : null,
          ].filter(Boolean),
          style: 'customerInfo',
          margin: [0, 0, 0, 20],
        },

        // Items Table
        {
          table: {
            headerRows: 1,
            widths: showPrices ? ['*', 'auto', 'auto', 'auto', 'auto'] : ['*', 'auto', 'auto'],
            body: [
              showPrices ? [
                { text: 'ITEM', style: 'tableHeader' },
                { text: 'QTY', style: 'tableHeader', alignment: 'center' },
                { text: 'UNIT', style: 'tableHeader', alignment: 'center' },
                { text: 'PRICE', style: 'tableHeader', alignment: 'right' },
                { text: 'TOTAL', style: 'tableHeader', alignment: 'right' },
              ] : [
                { text: 'ITEM', style: 'tableHeader' },
                { text: 'QTY', style: 'tableHeader', alignment: 'center' },
                { text: 'UNIT', style: 'tableHeader', alignment: 'center' },
              ],
              ...items.map((item: any) => showPrices ? [
                { text: item.product_name, style: 'tableCell' },
                { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' },
                { text: item.unit || 'pcs', style: 'tableCell', alignment: 'center' },
                { text: formatCurrency(item.unit_price, invoice.currency), style: 'tableCell', alignment: 'right' },
                { text: formatCurrency(item.line_total, invoice.currency), style: 'tableCell', alignment: 'right' },
              ] : [
                { text: item.product_name, style: 'tableCell' },
                { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' },
                { text: item.unit || 'pcs', style: 'tableCell', alignment: 'center' },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#000' : '#ddd',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },

        // Signature Section
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Received By:', margin: [0, 40, 0, 5] },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                { text: 'Name & Signature', fontSize: 8, margin: [0, 5, 0, 0] },
              ],
            },
            {
              width: '50%',
              stack: [
                { text: 'Delivered By:', margin: [0, 40, 0, 5] },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                { text: 'Name & Signature', fontSize: 8, margin: [0, 5, 0, 0] },
              ],
            },
          ],
          margin: [0, 40, 0, 0],
        },
      ],

      footer: (currentPage: number, pageCount: number) => {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          margin: [0, 10, 0, 0],
        };
      },

      styles: {
        companyName: {
          fontSize: 18,
          bold: true,
        },
        documentTitle: {
          fontSize: 20,
          bold: true,
          color: '#1e40af',
        },
        companyInfo: {
          fontSize: 9,
          lineHeight: 1.3,
        },
        invoiceInfo: {
          fontSize: 10,
          lineHeight: 1.3,
          alignment: 'right',
        },
        sectionHeader: {
          fontSize: 11,
          bold: true,
          color: '#1e40af',
        },
        customerInfo: {
          fontSize: 10,
          lineHeight: 1.3,
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          fillColor: '#f3f4f6',
        },
        tableCell: {
          fontSize: 9,
        },
      },
    };

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);

    // Save to temp directory
    const outputDir = path.join(app.getPath('temp'), 'hardware-pro-prints');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `delivery_note_${invoice.invoice_number.replace(/\//g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);

    return new Promise((resolve) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        fs.writeFileSync(filePath, buffer);
        resolve({ success: true, filePath });
      });
    });
  } catch (error: any) {
    console.error('Failed to generate delivery note PDF:', error);
    return {
      success: false,
      error: { code: 'PDF_GENERATION_ERROR', message: error.message },
    };
  }
}

/**
 * Generate thermal receipt directly from sales invoice (80mm optimized for Xprinter)
 */
export async function generateSalesThermalReceipt(invoiceId: number): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    // Get invoice data
    const invoice = queryOne<any>(
      `SELECT si.*, c.name as customer_name, c.phone as customer_phone
       FROM sales_invoices si
       JOIN customers c ON si.customer_id = c.id
       WHERE si.id = ?`,
      [invoiceId]
    );

    if (!invoice) {
      return { success: false, error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found' } };
    }

    // Get invoice items
    const items = query(
      `SELECT sii.*, p.name as product_name
       FROM sales_invoice_items sii
       JOIN products p ON sii.product_id = p.id
       WHERE sii.invoice_id = ?
       ORDER BY sii.id`,
      [invoiceId]
    );

    // Format data for receipt
    const receiptData = {
      date: format(new Date(invoice.invoice_date), 'dd/MM/yyyy HH:mm'),
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      currency: invoice.currency,
      items: items.map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
        total: item.line_total,
      })),
      total: invoice.total_amount,
      paid: invoice.amount_paid,
      change: invoice.amount_paid > invoice.total_amount ? invoice.amount_paid - invoice.total_amount : 0,
    };

    return await generateReceiptPDF(receiptData);
  } catch (error: any) {
    console.error('Failed to generate sales thermal receipt:', error);
    return {
      success: false,
      error: { code: 'THERMAL_RECEIPT_ERROR', message: error.message },
    };
  }
}

/**
 * Get list of available printers
 */
export async function getAvailablePrinters(): Promise<{ success: boolean; printers?: any[]; error?: any }> {
  try {
    // This would normally use node-printer or electron's print API
    // For now, return a mock list
    const printers = [
      {
        name: 'default',
        displayName: 'Default Printer',
        description: 'System default printer',
        status: 'idle',
        isDefault: true,
      },
    ];

    return { success: true, printers };
  } catch (error: any) {
    console.error('Failed to get printers:', error);
    return {
      success: false,
      error: { code: 'PRINTER_LIST_ERROR', message: error.message },
    };
  }
}
