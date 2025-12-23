import ExcelJS from 'exceljs';
import { query, queryOne } from '../database';
import { format } from 'date-fns';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

/**
 * Export sales vouchers to Excel in Tally Prime format
 * Format based on Sales_112602.xlsx structure
 */
export async function exportSalesVouchersToExcel(filters?: {
  startDate?: string;
  endDate?: string;
  customer_id?: number;
}): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    // Build query with filters
    let whereClauses: string[] = ['si.is_quotation = 0']; // Only invoices, not quotations
    const params: any[] = [];

    if (filters?.startDate && filters?.endDate) {
      whereClauses.push('si.invoice_date >= ? AND si.invoice_date <= ?');
      params.push(filters.startDate, filters.endDate);
    }

    if (filters?.customer_id) {
      whereClauses.push('si.customer_id = ?');
      params.push(filters.customer_id);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get sales invoices with items
    const invoices = query(
      `SELECT
        si.*,
        c.name as customer_name,
        c.address as customer_address,
        c.pincode as customer_pincode
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      ${whereClause}
      ORDER BY si.invoice_date ASC, si.id ASC`,
      params
    );

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accounting Voucher');

    // Define columns based on Tally Prime format
    worksheet.columns = [
      { header: 'Voucher Date', key: 'voucherDate', width: 15 },
      { header: 'Voucher Type Name', key: 'voucherTypeName', width: 20 },
      { header: 'Voucher Number', key: 'voucherNumber', width: 20 },
      { header: 'Buyer/Supplier - Address', key: 'buyerAddress', width: 30 },
      { header: 'Buyer/Supplier - Pincode', key: 'buyerPincode', width: 15 },
      { header: 'Ledger Name', key: 'ledgerName', width: 25 },
      { header: 'Ledger Amount', key: 'ledgerAmount', width: 15 },
      { header: 'Ledger Amount Dr/Cr', key: 'ledgerDrCr', width: 15 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Billed Quantity', key: 'billedQuantity', width: 15 },
      { header: 'Item Rate', key: 'itemRate', width: 15 },
      { header: 'Item Rate per', key: 'itemRatePer', width: 10 },
      { header: 'Item Amount', key: 'itemAmount', width: 15 },
      { header: 'Change Mode ', key: 'changeMode', width: 15 },
    ];

    // Format header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

    // Add data rows for each invoice
    for (const invoice of invoices) {
      // Get invoice items
      const items = query(
        `SELECT sii.*, p.name as product_name, p.unit
         FROM sales_invoice_items sii
         JOIN products p ON sii.product_id = p.id
         WHERE sii.invoice_id = ?
         ORDER BY sii.id`,
        [invoice.id]
      );

      const voucherDate = format(new Date(invoice.invoice_date), 'dd-MMM-yyyy');
      const voucherTypeName = 'Sales';
      const voucherNumber = invoice.invoice_number;
      const buyerAddress = invoice.customer_address || invoice.customer_name;
      const buyerPincode = invoice.customer_pincode || '';

      // Convert amounts to UGX if needed
      const totalInUgx = invoice.currency === 'USD'
        ? invoice.total_amount * invoice.exchange_rate
        : invoice.total_amount;

      // Add rows for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemAmountInCurrency = item.line_total;
        const itemRateInCurrency = item.unit_price;

        // Convert to UGX if needed
        const itemAmount = invoice.currency === 'USD'
          ? itemAmountInCurrency * invoice.exchange_rate
          : itemAmountInCurrency;

        const itemRate = invoice.currency === 'USD'
          ? itemRateInCurrency * invoice.exchange_rate
          : itemRateInCurrency;

        worksheet.addRow({
          voucherDate: i === 0 ? voucherDate : '',
          voucherTypeName: i === 0 ? voucherTypeName : '',
          voucherNumber: i === 0 ? voucherNumber : '',
          buyerAddress: i === 0 ? buyerAddress : '',
          buyerPincode: i === 0 ? buyerPincode : '',
          ledgerName: i === 0 ? invoice.customer_name : '',
          ledgerAmount: i === 0 ? totalInUgx : '',
          ledgerDrCr: i === 0 ? 'Dr' : '',
          itemName: item.product_name,
          billedQuantity: `${item.quantity} ${item.unit || 'pcs'}`,
          itemRate: itemRate.toFixed(2),
          itemRatePer: item.unit || 'pcs',
          itemAmount: itemAmount.toFixed(2),
          changeMode: '',
        });
      }

      // Add summary ledger entry (Sales Account - Credit)
      worksheet.addRow({
        voucherDate: '',
        voucherTypeName: '',
        voucherNumber: '',
        buyerAddress: '',
        buyerPincode: '',
        ledgerName: 'Sales Account',
        ledgerAmount: totalInUgx,
        ledgerDrCr: 'Cr',
        itemName: '',
        billedQuantity: '',
        itemRate: '',
        itemRatePer: '',
        itemAmount: '',
        changeMode: '',
      });

      // Add empty row between invoices
      worksheet.addRow({});
    }

    // Save file
    const outputDir = path.join(app.getPath('downloads'), 'Hardware-Manager-Exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `Sales_Vouchers_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    const filePath = path.join(outputDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    return { success: true, filePath };
  } catch (error: any) {
    console.error('Failed to export sales vouchers:', error);
    return {
      success: false,
      error: { code: 'EXPORT_ERROR', message: error.message },
    };
  }
}
