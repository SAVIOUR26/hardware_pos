import { AuditFields, Currency, TallySyncType, TallySyncStatus, DateRange } from './common.types';

/**
 * Tally Integration type definitions
 * For Tally Prime 6.2 XML import/export
 */

// ============================================================================
// TALLY MASTERS (Imported from Tally)
// ============================================================================

export interface TallyMaster {
  type: 'Product' | 'Customer' | 'Supplier';
  tally_id: string; // Unique identifier in Tally
  name: string;
  [key: string]: any; // Additional fields vary by type
}

export interface TallyProduct extends TallyMaster {
  type: 'Product';
  description?: string;
  unit?: string;
  opening_balance?: number; // Stock quantity
  opening_value?: number; // Stock value
  cost_price?: number;
  selling_price?: number;
  category?: string;
}

export interface TallyCustomer extends TallyMaster {
  type: 'Customer';
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tin?: string;
  opening_balance_ugx?: number;
  opening_balance_usd?: number;
  credit_limit?: number;
}

export interface TallySupplier extends TallyMaster {
  type: 'Supplier';
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tin?: string;
  opening_balance_ugx?: number;
  opening_balance_usd?: number;
  payment_terms?: string;
}

// ============================================================================
// TALLY VOUCHERS (Exported to Tally)
// ============================================================================

export interface TallyVoucher {
  type: 'Sales' | 'Purchase' | 'Receipt' | 'Payment';
  voucher_number: string;
  date: string;
  party_name: string; // Customer or Supplier
  currency: Currency;
  amount: number;
  items?: TallyVoucherItem[];
  [key: string]: any;
}

export interface TallyVoucherItem {
  item_name: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface TallySalesVoucher extends TallyVoucher {
  type: 'Sales';
  customer_name: string;
  invoice_number: string;
}

export interface TallyPurchaseVoucher extends TallyVoucher {
  type: 'Purchase';
  supplier_name: string;
  supplier_invoice_number?: string;
}

export interface TallyPaymentVoucher extends TallyVoucher {
  type: 'Payment' | 'Receipt';
  payment_method: string;
  reference_number?: string;
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

export interface TallyImportOptions {
  import_products: boolean;
  import_customers: boolean;
  import_suppliers: boolean;
  update_existing: boolean; // If true, update existing records; if false, skip duplicates
  skip_duplicates: boolean;
  import_opening_balances: boolean;
}

export interface TallyImportResult {
  success: boolean;
  summary: {
    products_created: number;
    products_updated: number;
    customers_created: number;
    customers_updated: number;
    suppliers_created: number;
    suppliers_updated: number;
    errors_count: number;
  };
  errors: TallyImportError[];
  file_path: string;
  import_date: string;
}

export interface TallyImportError {
  record_type: 'Product' | 'Customer' | 'Supplier';
  record_name: string;
  error_message: string;
  details?: any;
}

export interface TallyExportOptions {
  export_sales: boolean;
  export_purchases: boolean;
  export_payments: boolean;
  only_non_exported: boolean; // Export only records not yet exported
  date_range?: DateRange;
  voucher_date_mode: 'transaction_date' | 'today'; // Use original date or today's date
}

export interface TallyExportResult {
  success: boolean;
  summary: {
    sales_vouchers: number;
    purchase_vouchers: number;
    payment_vouchers: number;
    total_vouchers: number;
  };
  file_path: string;
  export_date: string;
  errors?: string[];
}

// ============================================================================
// SYNC LOG
// ============================================================================

export interface TallySyncLog extends AuditFields {
  id: number;
  sync_type: TallySyncType; // Import Masters, Export Vouchers
  sync_date: string;
  file_path: string | null;

  // Results
  status: TallySyncStatus; // Success, Failed, Partial
  records_processed: number;
  records_created: number;
  records_updated: number;
  errors_count: number;
  error_log: string | null; // JSON array of errors

  // Summary
  summary: string | null; // JSON object with detailed summary
}

// ============================================================================
// TALLY XML STRUCTURE (For reference)
// ============================================================================

export interface TallyXMLEnvelope {
  HEADER: {
    TALLYREQUEST: string;
  };
  BODY: {
    IMPORTDATA?: {
      REQUESTDATA: {
        TALLYMESSAGE: TallyXMLMessage[];
      };
    };
  };
}

export interface TallyXMLMessage {
  VOUCHER?: TallyXMLVoucher;
  STOCKITEM?: TallyXMLStockItem;
  LEDGER?: TallyXMLLedger;
}

export interface TallyXMLVoucher {
  VCHTYPE: string;
  DATE: string;
  VOUCHERNUMBER: string;
  PARTYLEDGERNAME: string;
  ALLLEDGERENTRIES: {
    LIST: TallyXMLLedgerEntry[];
  };
}

export interface TallyXMLLedgerEntry {
  LEDGERNAME: string;
  AMOUNT: number;
}

export interface TallyXMLStockItem {
  NAME: string;
  OPENINGBALANCE?: number;
  OPENINGVALUE?: number;
  OPENINGRATE?: number;
}

export interface TallyXMLLedger {
  NAME: string;
  PARENT?: string;
  OPENINGBALANCE?: number;
}
