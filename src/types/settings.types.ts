import { Currency, DocumentType, AuditFields } from './common.types';

/**
 * Settings and Configuration type definitions
 */

// ============================================================================
// APPLICATION SETTINGS
// ============================================================================

export interface AppSettings {
  // Currency
  base_currency: Currency;
  exchange_rate_usd: number; // Default USD to UGX rate

  // Date and Number Formats
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  number_format: 'comma' | 'space'; // Thousand separator

  // Financial
  financial_year_start_month: number; // 1-12
  default_tax_rate: number; // Percentage

  // Invoicing
  default_payment_terms: string;
  auto_generate_invoice_numbers: boolean;

  // Tally Integration
  tally_auto_sync: boolean;
  tally_sync_frequency: 'manual' | 'daily' | 'weekly';
}

// ============================================================================
// COMPANY INFORMATION
// ============================================================================

export interface CompanySettings extends AuditFields {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tin: string | null;
  logo_path: string | null;
}

export interface CompanyFormData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tin?: string;
  logo?: File; // For logo upload
}

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

export interface DocumentTemplate extends AuditFields {
  id: number;
  document_type: DocumentType;

  // Customization
  custom_name: string | null; // e.g., "Tax Invoice" instead of "Invoice"
  number_prefix: string | null; // e.g., "INV", "QT", "DN"
  header_text: string | null;
  footer_text: string | null;
  terms_conditions: string | null;

  // Display options
  show_logo: number;
  show_company_details: number;
}

export interface DocumentTemplateFormData {
  document_type: DocumentType;
  custom_name?: string;
  number_prefix?: string;
  header_text?: string;
  footer_text?: string;
  terms_conditions?: string;
  show_logo?: boolean;
  show_company_details?: boolean;
}

// ============================================================================
// PRINTER SETTINGS
// ============================================================================

export interface PrinterSettings {
  // Default printers
  thermal_printer_name: string | null; // For receipts (XPrinter)
  a4_printer_name: string | null; // For invoices

  // Thermal printer settings
  thermal_paper_width: 80 | 58; // mm
  thermal_font_size: 'small' | 'medium' | 'large';
  thermal_receipt_copies: 1 | 2;
  thermal_auto_cut: boolean;

  // A4 printer settings
  a4_paper_size: 'A4' | 'Letter';
  a4_margin_top: number; // cm
  a4_margin_bottom: number;
  a4_margin_left: number;
  a4_margin_right: number;
  a4_orientation: 'portrait' | 'landscape';

  // Print behavior
  auto_print_after_save: boolean;
  print_preview_before_printing: boolean;
}

export interface AvailablePrinter {
  name: string;
  displayName: string;
  description?: string;
  status: string;
  isDefault: boolean;
  options?: {
    [key: string]: any;
  };
}

// ============================================================================
// USER SETTINGS (For future multi-user support)
// ============================================================================

export interface UserSettings {
  user_id: number;
  theme: 'light' | 'dark';
  language: 'en' | 'lg' | 'sw'; // English, Luganda, Swahili
  notifications_enabled: boolean;
  default_page: string; // Which page to show on startup
  sidebar_collapsed: boolean;
}

// ============================================================================
// BACKUP SETTINGS
// ============================================================================

export interface BackupSettings {
  auto_backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly';
  backup_location: string; // Folder path
  keep_last_n_backups: number;
  last_backup_date: string | null;
}

export interface BackupInfo {
  file_path: string;
  file_name: string;
  size_bytes: number;
  size_mb: string;
  created_at: string;
}

// ============================================================================
// SETTING KEY-VALUE STORE
// ============================================================================

export interface Setting {
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// NUMBER FORMAT SETTINGS
// ============================================================================

export interface NumberFormatSettings {
  invoice_number_format: {
    prefix: string;
    include_date: boolean;
    date_format: 'YYYYMMDD' | 'YYMMDD' | 'none';
    sequence_padding: number; // e.g., 4 for "0001"
  };
  purchase_number_format: {
    prefix: string;
    include_date: boolean;
    date_format: 'YYYYMMDD' | 'YYMMDD' | 'none';
    sequence_padding: number;
  };
  delivery_note_number_format: {
    prefix: string;
    include_date: boolean;
    date_format: 'YYYYMMDD' | 'YYMMDD' | 'none';
    sequence_padding: number;
  };
  payment_number_format: {
    prefix: string;
    include_date: boolean;
    date_format: 'YYYYMMDD' | 'YYMMDD' | 'none';
    sequence_padding: number;
  };
}
