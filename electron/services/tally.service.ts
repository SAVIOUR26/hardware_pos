/**
 * Tally Prime XML Integration Service
 * Handles bi-directional sync with Tally Prime via XML
 */

import { getDatabase } from '../database';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

// XML Parser configuration for Tally XML
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
  parseTrueNumberOnly: false,
  arrayMode: false,
};

const parser = new XMLParser(parserOptions);
const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
});

interface ImportResult {
  status: 'Success' | 'Failed' | 'Partial';
  records_processed: number;
  records_created: number;
  records_updated: number;
  errors_count: number;
  errors: string[];
  summary: {
    currencies?: number;
    units?: number;
    customers?: number;
    suppliers?: number;
    products?: number;
  };
}

/**
 * Import masters from Tally XML file
 */
export async function importMastersFromXML(
  filePath: string,
  options?: {
    importCurrencies?: boolean;
    importUnits?: boolean;
    importLedgers?: boolean;
    importProducts?: boolean;
  }
): Promise<ImportResult> {
  const db = getDatabase();
  const result: ImportResult = {
    status: 'Success',
    records_processed: 0,
    records_created: 0,
    records_updated: 0,
    errors_count: 0,
    errors: [],
    summary: {},
  };

  try {
    // Read XML file
    let xmlContent: string;

    // Try UTF-16 first (Tally's default encoding)
    try {
      xmlContent = fs.readFileSync(filePath, 'utf16le');
    } catch (e) {
      // Fallback to UTF-8
      xmlContent = fs.readFileSync(filePath, 'utf-8');
    }

    // Parse XML
    const xmlData = parser.parse(xmlContent);

    if (!xmlData.ENVELOPE || !xmlData.ENVELOPE.BODY) {
      throw new Error('Invalid Tally XML structure');
    }

    const requestData = xmlData.ENVELOPE.BODY.IMPORTDATA?.REQUESTDATA;
    if (!requestData || !requestData.TALLYMESSAGE) {
      throw new Error('No TALLYMESSAGE found in XML');
    }

    // Ensure TALLYMESSAGE is an array
    const messages = Array.isArray(requestData.TALLYMESSAGE)
      ? requestData.TALLYMESSAGE
      : [requestData.TALLYMESSAGE];

    console.log(`Found ${messages.length} Tally messages to process`);

    // Start transaction
    db.exec('BEGIN TRANSACTION');

    try {
      // Process each message
      for (const message of messages) {
        result.records_processed++;

        try {
          // Currency
          if (message.CURRENCY && options?.importCurrencies !== false) {
            await importCurrency(db, message.CURRENCY, result);
          }

          // Unit
          if (message.UNIT && options?.importUnits !== false) {
            await importUnit(db, message.UNIT, result);
          }

          // Ledger (Customer/Supplier)
          if (message.LEDGER && options?.importLedgers !== false) {
            await importLedger(db, message.LEDGER, result);
          }

          // Stock Item (Product)
          if (message.STOCKITEM && options?.importProducts !== false) {
            await importStockItem(db, message.STOCKITEM, result);
          }
        } catch (error: any) {
          result.errors_count++;
          result.errors.push(`Record ${result.records_processed}: ${error.message}`);
          console.error(`Error processing message ${result.records_processed}:`, error);
        }
      }

      // Commit transaction
      db.exec('COMMIT');

      // Log sync to database
      logSync(db, 'Import Masters', filePath, result);

      // Determine final status
      if (result.errors_count === 0) {
        result.status = 'Success';
      } else if (result.records_created > 0 || result.records_updated > 0) {
        result.status = 'Partial';
      } else {
        result.status = 'Failed';
      }
    } catch (error: any) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    result.status = 'Failed';
    result.errors_count++;
    result.errors.push(`Fatal error: ${error.message}`);
    console.error('Import failed:', error);
  }

  return result;
}

/**
 * Import Currency
 */
async function importCurrency(db: any, currency: any, result: ImportResult) {
  // Tally currencies are for reference only, we use UGX/USD primarily
  // Just update exchange rates if needed
  const name = currency['@_NAME'];

  if (!name) return;

  // For now, just count as processed
  result.summary.currencies = (result.summary.currencies || 0) + 1;
}

/**
 * Import Unit
 */
async function importUnit(db: any, unit: any, result: ImportResult) {
  // Units are used in products, we can store common units
  const name = unit['@_NAME'];

  if (!name) return;

  result.summary.units = (result.summary.units || 0) + 1;
}

/**
 * Import Ledger (Customer or Supplier)
 */
async function importLedger(db: any, ledger: any, result: ImportResult) {
  const name = ledger['@_NAME'];
  const guid = ledger.GUID;
  const parent = ledger.PARENT;

  if (!name || !guid) return;

  // Extract address and phone from LEDMAILINGDETAILS or OLDADDRESS
  let address = '';
  let phone = '';

  if (ledger.LEDMAILINGDETAILS && ledger.LEDMAILINGDETAILS['ADDRESS.LIST']) {
    const addresses = ledger.LEDMAILINGDETAILS['ADDRESS.LIST'].ADDRESS;
    if (addresses) {
      const addrArray = Array.isArray(addresses) ? addresses : [addresses];
      address = addrArray[0] || '';
      phone = addrArray[1] || '';
    }
  } else if (ledger['OLDADDRESS.LIST']) {
    const addresses = ledger['OLDADDRESS.LIST'].OLDADDRESS;
    if (addresses) {
      const addrArray = Array.isArray(addresses) ? addresses : [addresses];
      address = addrArray[0] || '';
      phone = addrArray[1] || '';
    }
  }

  // Determine if it's a customer or supplier based on parent
  const isCustomer = parent && parent.toLowerCase().includes('debtor');
  const isSupplier = parent && parent.toLowerCase().includes('creditor');

  if (isCustomer) {
    // Import as Customer
    const existing = db.prepare('SELECT id FROM customers WHERE tally_id = ?').get(guid);

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE customers
        SET name = ?, address = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
        WHERE tally_id = ?
      `).run(name, address || null, phone || null, guid);

      result.records_updated++;
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO customers (tally_id, name, address, phone)
        VALUES (?, ?, ?, ?)
      `).run(guid, name, address || null, phone || null);

      result.records_created++;
    }

    result.summary.customers = (result.summary.customers || 0) + 1;
  } else if (isSupplier) {
    // Import as Supplier
    const existing = db.prepare('SELECT id FROM suppliers WHERE tally_id = ?').get(guid);

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE suppliers
        SET name = ?, address = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
        WHERE tally_id = ?
      `).run(name, address || null, phone || null, guid);

      result.records_updated++;
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO suppliers (tally_id, name, address, phone)
        VALUES (?, ?, ?, ?)
      `).run(guid, name, address || null, phone || null);

      result.records_created++;
    }

    result.summary.suppliers = (result.summary.suppliers || 0) + 1;
  }
}

/**
 * Import Stock Item (Product)
 */
async function importStockItem(db: any, stockItem: any, result: ImportResult) {
  const name = stockItem['@_NAME'];
  const guid = stockItem.GUID;
  const category = stockItem.PARENT || 'General';
  const unit = stockItem.BASEUNITS || 'PCS';

  if (!name || !guid) return;

  // Parse opening balance and rate
  let openingBalance = 0;
  let openingRate = 0;

  if (stockItem.OPENINGBALANCE) {
    const balanceStr = String(stockItem.OPENINGBALANCE).trim();
    const match = balanceStr.match(/([-\d.]+)/);
    if (match) {
      openingBalance = Math.abs(parseFloat(match[1]));
    }
  }

  if (stockItem.OPENINGRATE) {
    const rateStr = String(stockItem.OPENINGRATE).trim();
    const match = rateStr.match(/([-\d.]+)/);
    if (match) {
      openingRate = Math.abs(parseFloat(match[1]));
    }
  }

  // Check if product exists
  const existing = db.prepare('SELECT id FROM products WHERE tally_id = ?').get(guid);

  if (existing) {
    // Update existing
    db.prepare(`
      UPDATE products
      SET name = ?, category = ?, unit = ?, cost_price_ugx = ?,
          current_stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE tally_id = ?
    `).run(name, category, unit, openingRate, openingBalance, guid);

    result.records_updated++;
  } else {
    // Insert new
    db.prepare(`
      INSERT INTO products (tally_id, name, category, unit, cost_price_ugx,
                           selling_price_ugx, current_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(guid, name, category, unit, openingRate, openingRate * 1.2, openingBalance);

    result.records_created++;
  }

  result.summary.products = (result.summary.products || 0) + 1;
}

/**
 * Export vouchers to Tally XML format
 */
export async function exportVouchersToXML(
  dateRange: { from: string; to: string },
  outputPath: string,
  options?: {
    exportSales?: boolean;
    exportPurchases?: boolean;
  }
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const db = getDatabase();

  try {
    const messages: any[] = [];

    // Export Sales as Sales Vouchers
    if (options?.exportSales !== false) {
      const salesInvoices = db
        .prepare(
          `SELECT * FROM sales_invoices
           WHERE invoice_date >= ? AND invoice_date <= ?
           AND exported_to_tally = 0
           ORDER BY invoice_date, id`
        )
        .all(dateRange.from, dateRange.to);

      for (const invoice of salesInvoices) {
        const items = db
          .prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?')
          .all((invoice as any).id);

        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get((invoice as any).customer_id);

        const voucher = buildSalesVoucher(invoice, items, customer);
        messages.push(voucher);
      }
    }

    // Export Purchases as Purchase Vouchers
    if (options?.exportPurchases !== false) {
      const purchaseInvoices = db
        .prepare(
          `SELECT * FROM purchase_invoices
           WHERE purchase_date >= ? AND purchase_date <= ?
           AND exported_to_tally = 0
           ORDER BY purchase_date, id`
        )
        .all(dateRange.from, dateRange.to);

      for (const invoice of purchaseInvoices) {
        const items = db
          .prepare('SELECT * FROM purchase_invoice_items WHERE invoice_id = ?')
          .all((invoice as any).id);

        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get((invoice as any).supplier_id);

        const voucher = buildPurchaseVoucher(invoice, items, supplier);
        messages.push(voucher);
      }
    }

    // Build XML envelope
    const xmlData = {
      ENVELOPE: {
        HEADER: {
          TALLYREQUEST: 'Import Data',
        },
        BODY: {
          IMPORTDATA: {
            REQUESTDESC: {
              REPORTNAME: 'Vouchers',
              STATICVARIABLES: {
                SVCURRENTCOMPANY: 'Stuti Hardware SMC Limited',
              },
            },
            REQUESTDATA: {
              TALLYMESSAGE: messages,
            },
          },
        },
      },
    };

    // Build XML string
    const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(xmlData);

    // Write to file
    fs.writeFileSync(outputPath, xmlString, 'utf-8');

    // Mark invoices as exported
    if (messages.length > 0) {
      db.exec('BEGIN TRANSACTION');

      if (options?.exportSales !== false) {
        db.prepare(`
          UPDATE sales_invoices
          SET exported_to_tally = 1, tally_export_date = CURRENT_TIMESTAMP
          WHERE invoice_date >= ? AND invoice_date <= ? AND exported_to_tally = 0
        `).run(dateRange.from, dateRange.to);
      }

      if (options?.exportPurchases !== false) {
        db.prepare(`
          UPDATE purchase_invoices
          SET exported_to_tally = 1, tally_export_date = CURRENT_TIMESTAMP
          WHERE purchase_date >= ? AND purchase_date <= ? AND exported_to_tally = 0
        `).run(dateRange.from, dateRange.to);
      }

      db.exec('COMMIT');
    }

    // Log export
    const result: ImportResult = {
      status: 'Success',
      records_processed: messages.length,
      records_created: messages.length,
      records_updated: 0,
      errors_count: 0,
      errors: [],
      summary: {},
    };

    logSync(db, 'Export Vouchers', outputPath, result);

    return { success: true, filePath: outputPath };
  } catch (error: any) {
    console.error('Export failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build Sales Voucher in Tally XML format
 */
function buildSalesVoucher(invoice: any, items: any[], customer: any) {
  // Simplified sales voucher structure
  const ledgerEntries: any[] = [];

  // Customer ledger (debit)
  ledgerEntries.push({
    LEDGERNAME: customer?.name || 'Cash Sales',
    ISDEEMEDPOSITIVE: 'Yes',
    AMOUNT: invoice.total_amount,
  });

  // Sales ledger (credit)
  ledgerEntries.push({
    LEDGERNAME: 'Sales',
    ISDEEMEDPOSITIVE: 'No',
    AMOUNT: -invoice.total_amount,
  });

  return {
    '@_xmlns:UDF': 'TallyUDF',
    VOUCHER: {
      DATE: formatTallyDate(invoice.invoice_date),
      VOUCHERTYPENAME: 'Sales',
      VOUCHERNUMBER: invoice.invoice_number,
      'ALLLEDGERENTRIES.LIST': ledgerEntries,
    },
  };
}

/**
 * Build Purchase Voucher in Tally XML format
 */
function buildPurchaseVoucher(invoice: any, items: any[], supplier: any) {
  const ledgerEntries: any[] = [];

  // Purchase ledger (debit)
  ledgerEntries.push({
    LEDGERNAME: 'Purchase',
    ISDEEMEDPOSITIVE: 'Yes',
    AMOUNT: invoice.total_amount,
  });

  // Supplier ledger (credit)
  ledgerEntries.push({
    LEDGERNAME: supplier?.name || 'Cash Purchase',
    ISDEEMEDPOSITIVE: 'No',
    AMOUNT: -invoice.total_amount,
  });

  return {
    '@_xmlns:UDF': 'TallyUDF',
    VOUCHER: {
      DATE: formatTallyDate(invoice.purchase_date),
      VOUCHERTYPENAME: 'Purchase',
      VOUCHERNUMBER: invoice.purchase_number,
      'ALLLEDGERENTRIES.LIST': ledgerEntries,
    },
  };
}

/**
 * Format date for Tally (YYYYMMDD)
 */
function formatTallyDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Log sync operation
 */
function logSync(db: any, syncType: string, filePath: string, result: ImportResult) {
  db.prepare(`
    INSERT INTO tally_sync_log (
      sync_type, sync_date, file_path, status,
      records_processed, records_created, records_updated,
      errors_count, error_log, summary
    ) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    syncType,
    filePath,
    result.status,
    result.records_processed,
    result.records_created,
    result.records_updated,
    result.errors_count,
    JSON.stringify(result.errors),
    JSON.stringify(result.summary)
  );
}

/**
 * Get sync history
 */
export function getSyncHistory(limit = 50) {
  const db = getDatabase();

  const history = db
    .prepare(
      `SELECT * FROM tally_sync_log
       ORDER BY sync_date DESC
       LIMIT ?`
    )
    .all(limit);

  // Parse JSON fields
  return history.map((log: any) => ({
    ...log,
    error_log: log.error_log ? JSON.parse(log.error_log) : [],
    summary: log.summary ? JSON.parse(log.summary) : {},
  }));
}
