/**
 * Database Schema
 * Embedded schema to avoid file reading issues in packaged apps
 */

export const SCHEMA_SQL = `
-- Hardware Manager Pro Database Schema
-- SQLite Database for Hardware Shop Management System

-- ============================================================================
-- SETTINGS & CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initial settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate_usd', '3700');
INSERT OR IGNORE INTO settings (key, value) VALUES ('base_currency', 'UGX');

-- ============================================================================
-- COMPANY INFORMATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  tin TEXT,
  logo_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default company
INSERT OR IGNORE INTO companies (id, name, address, phone)
VALUES (1, 'Stuti Hardware SMC Limited', 'Go Down Rd, Arua, Uganda', '+256 777 058557');

-- ============================================================================
-- USERS (For future multi-user support)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- admin, manager, user
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PRODUCTS / INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tally_id TEXT UNIQUE, -- For Tally sync
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT DEFAULT 'PCS', -- Unit of measure
  barcode TEXT UNIQUE,

  -- Pricing in both currencies
  cost_price_ugx REAL DEFAULT 0,
  cost_price_usd REAL DEFAULT 0,
  selling_price_ugx REAL DEFAULT 0,
  selling_price_usd REAL DEFAULT 0,

  -- Stock tracking
  current_stock REAL DEFAULT 0, -- Total physical stock
  reserved_stock REAL DEFAULT 0, -- Stock reserved for "Not Taken" orders ⭐
  reorder_level REAL DEFAULT 0, -- Low stock alert threshold

  -- Status
  is_active INTEGER DEFAULT 1,

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_tally_id ON products(tally_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- ============================================================================
-- STOCK ADJUSTMENTS (Audit trail for stock changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL, -- Positive for increase, negative for decrease
  reason TEXT NOT NULL, -- Physical count, damage, theft, etc.
  notes TEXT,
  approved_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stock_adj_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_date ON stock_adjustments(created_at);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tally_id TEXT UNIQUE, -- For Tally sync
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tin TEXT,

  -- Opening balances (from Tally import)
  opening_balance_ugx REAL DEFAULT 0, -- Positive = customer owes us
  opening_balance_usd REAL DEFAULT 0,

  -- Current balances (calculated from transactions)
  current_balance_ugx REAL DEFAULT 0,
  current_balance_usd REAL DEFAULT 0,

  -- Advances (prepayments)
  advance_balance_ugx REAL DEFAULT 0, -- Negative balance = customer prepaid
  advance_balance_usd REAL DEFAULT 0,

  -- Credit limits
  credit_limit_ugx REAL DEFAULT 0,
  credit_limit_usd REAL DEFAULT 0,
  credit_limit REAL DEFAULT 0, -- General credit limit (backwards compatibility)

  -- Additional fields
  notes TEXT,

  -- Status
  is_active INTEGER DEFAULT 1,
  is_deleted INTEGER DEFAULT 0,

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_tally_id ON customers(tally_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

-- Insert default Walk-in Customer
INSERT OR IGNORE INTO customers (id, name, phone, address, is_active)
VALUES (1, 'Walk-in Customer', '', 'General Sales', 1);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tally_id TEXT UNIQUE, -- For Tally sync
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tin TEXT,
  bank_account TEXT, -- For payments
  payment_terms TEXT, -- e.g., "30 days"

  -- Opening balances (from Tally import)
  opening_balance_ugx REAL DEFAULT 0, -- Positive = we owe supplier
  opening_balance_usd REAL DEFAULT 0,

  -- Current balances (calculated from transactions)
  current_balance_ugx REAL DEFAULT 0,
  current_balance_usd REAL DEFAULT 0,

  -- Status
  is_active INTEGER DEFAULT 1,

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tally_id ON suppliers(tally_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- ============================================================================
-- SALES INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL, -- Auto-generated: INV-YYYYMMDD-0001
  customer_id INTEGER NOT NULL,

  -- Invoice details
  invoice_date DATE NOT NULL,
  is_quotation INTEGER DEFAULT 0, -- 0 = Invoice, 1 = Quotation
  quotation_id INTEGER, -- Link to quotation if converted

  -- Currency and amounts
  currency TEXT NOT NULL DEFAULT 'UGX', -- UGX or USD
  exchange_rate REAL DEFAULT 1, -- USD to UGX rate if currency is USD

  subtotal REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0, -- In original currency
  total_amount_ugx REAL DEFAULT 0, -- Converted to UGX for reporting

  -- Payment tracking
  payment_status TEXT DEFAULT 'Unpaid', -- Paid, Partial, Unpaid
  amount_paid REAL DEFAULT 0,
  payment_method TEXT, -- Cash, Mobile Money, Bank, Credit

  -- Delivery tracking ⭐ KEY FEATURE
  delivery_status TEXT DEFAULT 'Not Taken', -- Not Taken, Partially Taken, Taken
  expected_collection_date DATE,
  collection_notes TEXT,

  -- Tally sync
  exported_to_tally INTEGER DEFAULT 0,
  tally_export_date DATETIME,

  -- Audit
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (quotation_id) REFERENCES sales_invoices(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_inv_number ON sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_status ON sales_invoices(delivery_status);
CREATE INDEX IF NOT EXISTS idx_sales_quotation ON sales_invoices(is_quotation);

-- ============================================================================
-- SALES INVOICE ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,

  -- Item details
  product_name TEXT NOT NULL, -- Snapshot at time of sale
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  tax_percent REAL DEFAULT 0,
  line_total REAL NOT NULL,

  -- Delivery tracking per item ⭐
  delivery_status TEXT DEFAULT 'Not Taken', -- Not Taken, Partially Taken, Taken
  quantity_delivered REAL DEFAULT 0, -- How much has been collected

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sales_items_invoice ON sales_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product ON sales_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_delivery ON sales_invoice_items(delivery_status);

-- ============================================================================
-- PURCHASE INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_number TEXT UNIQUE NOT NULL, -- Auto-generated: PUR-YYYYMMDD-0001
  supplier_id INTEGER NOT NULL,
  supplier_invoice_number TEXT, -- Supplier's bill number

  -- Invoice details
  purchase_date DATE NOT NULL,

  -- Currency and amounts
  currency TEXT NOT NULL DEFAULT 'UGX',
  exchange_rate REAL DEFAULT 1,

  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  total_amount_ugx REAL DEFAULT 0,

  -- Payment tracking
  payment_status TEXT DEFAULT 'Unpaid', -- Paid, Unpaid
  amount_paid REAL DEFAULT 0,
  payment_method TEXT,

  -- Tally sync
  exported_to_tally INTEGER DEFAULT 0,
  tally_export_date DATETIME,

  -- Audit
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_number ON purchase_invoices(purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchase_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_date ON purchase_invoices(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_payment_status ON purchase_invoices(payment_status);

-- ============================================================================
-- PURCHASE INVOICE ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,

  -- Item details
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  tax_percent REAL DEFAULT 0,
  line_total REAL NOT NULL,

  -- Option to update product cost price
  update_cost_price INTEGER DEFAULT 0,

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice ON purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_invoice_items(product_id);

-- ============================================================================
-- DELIVERY NOTES ⭐
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_note_number TEXT UNIQUE NOT NULL, -- Auto-generated
  sales_invoice_id INTEGER NOT NULL,

  -- Delivery details
  delivery_date DATE NOT NULL,
  delivered_by TEXT, -- Staff member or driver
  received_by TEXT, -- Customer representative
  vehicle_number TEXT,
  notes TEXT,

  -- Print options
  show_prices INTEGER DEFAULT 1, -- Show prices on delivery note
  show_totals INTEGER DEFAULT 1, -- Show totals on delivery note

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_number ON delivery_notes(delivery_note_number);
CREATE INDEX IF NOT EXISTS idx_delivery_invoice ON delivery_notes(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_date ON delivery_notes(delivery_date);

-- ============================================================================
-- DELIVERY NOTE ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_note_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_note_id INTEGER NOT NULL,
  sales_invoice_item_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,

  -- Item details
  product_name TEXT NOT NULL,
  quantity_delivered REAL NOT NULL, -- Quantity being delivered now
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL,

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_invoice_item_id) REFERENCES sales_invoice_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_note ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_invoice_item ON delivery_note_items(sales_invoice_item_id);

-- ============================================================================
-- PAYMENTS / RECEIPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_number TEXT UNIQUE NOT NULL,

  -- Type
  payment_type TEXT NOT NULL, -- Receipt (from customer), Payment (to supplier)

  -- Party
  customer_id INTEGER,
  supplier_id INTEGER,

  -- Linked invoice (optional)
  sales_invoice_id INTEGER,
  purchase_invoice_id INTEGER,

  -- Payment details
  payment_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL, -- Cash, Mobile Money, Bank, etc.
  reference_number TEXT, -- Transaction ID, check number, etc.
  notes TEXT,

  -- Tally sync
  exported_to_tally INTEGER DEFAULT 0,

  -- Audit
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),

  CHECK (
    (payment_type = 'Receipt' AND customer_id IS NOT NULL) OR
    (payment_type = 'Payment' AND supplier_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_payments_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================================================
-- CASH TRANSACTIONS (Cash Book)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Transaction details
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL, -- Receipt, Payment, Deposit, Withdrawal
  currency TEXT NOT NULL DEFAULT 'UGX',
  amount REAL NOT NULL,

  -- Description
  description TEXT NOT NULL,
  reference TEXT, -- Link to invoice, payment, etc.

  -- Linked records
  payment_id INTEGER,
  sales_invoice_id INTEGER,
  purchase_invoice_id INTEGER,

  -- Balance tracking (running balance)
  balance REAL, -- Calculated balance after this transaction

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_trans_date ON cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_trans_currency ON cash_transactions(currency);
CREATE INDEX IF NOT EXISTS idx_cash_trans_type ON cash_transactions(transaction_type);

-- ============================================================================
-- SALES RETURNS ⭐ NEW FEATURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_number TEXT UNIQUE NOT NULL, -- Auto-generated: RET-YYYYMMDD-0001
  sales_invoice_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,

  -- Return details
  return_date DATE NOT NULL,
  reason TEXT NOT NULL, -- Damaged, Wrong Item, Customer Request, etc.
  notes TEXT,

  -- Financial details
  currency TEXT NOT NULL DEFAULT 'UGX',
  exchange_rate REAL DEFAULT 1,
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  total_amount_ugx REAL DEFAULT 0,

  -- Refund tracking
  refund_status TEXT DEFAULT 'Pending', -- Pending, Completed, Credit Note
  refund_method TEXT, -- Cash, Credit Note, Exchange
  refund_date DATE,
  refund_amount REAL DEFAULT 0,

  -- Tally sync
  exported_to_tally INTEGER DEFAULT 0,
  tally_export_date DATETIME,

  -- Audit
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_returns_number ON sales_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_invoice ON sales_returns(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_date ON sales_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_returns_status ON sales_returns(refund_status);

-- ============================================================================
-- SALES RETURN ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL,
  sales_invoice_item_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,

  -- Item details
  product_name TEXT NOT NULL,
  quantity_returned REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  tax_percent REAL DEFAULT 0,
  line_total REAL NOT NULL,

  -- Return condition
  condition TEXT, -- Good, Damaged, Defective
  restock INTEGER DEFAULT 1, -- 1 = Add back to stock, 0 = Don't restock (damaged items)

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_invoice_item_id) REFERENCES sales_invoice_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_invoice_item ON sales_return_items(sales_invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON sales_return_items(product_id);

-- ============================================================================
-- DOCUMENT TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_type TEXT UNIQUE NOT NULL, -- invoice, quotation, delivery_note, receipt

  -- Customization
  custom_name TEXT, -- e.g., "Tax Invoice" instead of "Invoice"
  number_prefix TEXT, -- e.g., "INV", "QT", "DN"
  header_text TEXT,
  footer_text TEXT,
  terms_conditions TEXT,

  -- Display options
  show_logo INTEGER DEFAULT 1,
  show_company_details INTEGER DEFAULT 1,

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT OR IGNORE INTO document_templates (document_type, custom_name, number_prefix, terms_conditions) VALUES
('invoice', 'Invoice', 'INV', 'Payment due within 30 days. Late payments subject to interest.'),
('quotation', 'Quotation', 'QT', 'This quotation is valid for 30 days.'),
('delivery_note', 'Delivery Note', 'DN', 'Goods received in good condition.'),
('receipt', 'Receipt', 'RCT', 'Thank you for your payment.');

-- ============================================================================
-- TALLY SYNC LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS tally_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Sync details
  sync_type TEXT NOT NULL, -- Import Masters, Export Vouchers
  sync_date DATETIME NOT NULL,
  file_path TEXT,

  -- Results
  status TEXT NOT NULL, -- Success, Failed, Partial
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_log TEXT, -- JSON array of errors

  -- Summary
  summary TEXT, -- JSON object with detailed summary

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tally_sync_type ON tally_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_tally_sync_date ON tally_sync_log(sync_date);

-- ============================================================================
-- DATABASE VERSION
-- ============================================================================

-- Update schema version
UPDATE settings SET value = '1', updated_at = CURRENT_TIMESTAMP WHERE key = 'schema_version';
`;
