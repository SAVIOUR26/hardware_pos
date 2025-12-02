import { getDatabase, transaction, execute } from './index';
import { format } from 'date-fns';

/**
 * Seed Database with Sample Data
 * Run this to populate the database for testing
 */

export function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');

  return transaction((db) => {
    // 1. Seed Customers
    console.log('Adding customers...');
    const customers = [
      { name: 'ABC Hardware Ltd', phone: '0700123456', email: 'info@abchardware.com', address: 'Plot 23, Industrial Area, Kampala' },
      { name: 'XYZ Construction', phone: '0701234567', email: 'xyz@construction.ug', address: 'Ntinda, Kampala' },
      { name: 'John Doe', phone: '0702345678', email: 'john.doe@gmail.com', address: 'Kololo, Kampala' },
      { name: 'Jane Smith Enterprises', phone: '0703456789', email: 'jane@smithent.com', address: 'Nakawa, Kampala' },
      { name: 'Prime Builders', phone: '0704567890', email: 'contact@primebuilders.ug', address: 'Bugolobi, Kampala' },
      { name: 'Green Valley Farms', phone: '0705678901', email: 'green@valley.ug', address: 'Entebbe Road' },
      { name: 'Tech Solutions Ltd', phone: '0706789012', email: 'tech@solutions.com', address: 'Kampala Road' },
      { name: 'Mega Stores', phone: '0707890123', email: 'mega@stores.ug', address: 'Wandegeya' },
      { name: 'Quality Contractors', phone: '0708901234', email: 'quality@contractors.ug', address: 'Ntinda' },
      { name: 'Swift Logistics', phone: '0709012345', email: 'swift@logistics.com', address: 'Port Bell Road' },
      { name: 'Sarah Nakato', phone: '0751234567', email: 'sarah.n@gmail.com', address: 'Makindye' },
      { name: 'David Okello', phone: '0752345678', email: 'david.okello@yahoo.com', address: 'Nateete' },
      { name: 'Grace Atim', phone: '0753456789', email: 'grace.atim@outlook.com', address: 'Kansanga' },
      { name: 'Michael Wasswa', phone: '0754567890', email: 'mike.w@gmail.com', address: 'Kireka' },
      { name: 'Rose Namuli', phone: '0755678901', email: 'rose.namuli@gmail.com', address: 'Kabalagala' },
    ];

    customers.forEach((customer) => {
      execute(
        'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
        [customer.name, customer.phone, customer.email, customer.address]
      );
    });

    // 2. Seed Suppliers
    console.log('Adding suppliers...');
    const suppliers = [
      { name: 'Global Steel Uganda', phone: '0414123456', email: 'sales@globalsteel.ug', address: 'Namanve Industrial Park' },
      { name: 'Paint Masters Ltd', phone: '0414234567', email: 'info@paintmasters.com', address: 'Kampala' },
      { name: 'Hardware Imports Co', phone: '0414345678', email: 'imports@hardware.ug', address: 'Luzira' },
      { name: 'Cement Suppliers Ltd', phone: '0414456789', email: 'cement@suppliers.ug', address: 'Mukono' },
      { name: 'Tool Wholesalers', phone: '0414567890', email: 'tools@wholesalers.com', address: 'Ntinda' },
    ];

    suppliers.forEach((supplier) => {
      execute(
        'INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)',
        [supplier.name, supplier.phone, supplier.email, supplier.address]
      );
    });

    // 3. Seed Products
    console.log('Adding products...');
    const products = [
      // Cement & Aggregates
      { name: 'Hima Cement 50kg', category: 'Cement', unit: 'Bag', barcode: 'HMC001', cost_ugx: 32000, selling_ugx: 35000, selling_usd: 9.5, stock: 500, reorder: 100 },
      { name: 'Tororo Cement 50kg', category: 'Cement', unit: 'Bag', barcode: 'TRC001', cost_ugx: 31000, selling_ugx: 34000, selling_usd: 9.2, stock: 300, reorder: 100 },
      { name: 'River Sand (Lorry)', category: 'Aggregates', unit: 'Lorry', barcode: 'AGG001', cost_ugx: 380000, selling_ugx: 450000, selling_usd: 120, stock: 20, reorder: 5 },
      { name: 'Machine Cut Stones (Lorry)', category: 'Aggregates', unit: 'Lorry', barcode: 'AGG002', cost_ugx: 420000, selling_ugx: 500000, selling_usd: 135, stock: 15, reorder: 5 },
      { name: 'Hard Core Stones (Lorry)', category: 'Aggregates', unit: 'Lorry', barcode: 'AGG003', cost_ugx: 350000, selling_ugx: 420000, selling_usd: 115, stock: 12, reorder: 5 },

      // Steel & Iron
      { name: 'Y12 Steel Bars 6m', category: 'Steel', unit: 'Piece', barcode: 'STL001', cost_ugx: 28000, selling_ugx: 32000, selling_usd: 8.5, stock: 200, reorder: 50 },
      { name: 'Y16 Steel Bars 6m', category: 'Steel', unit: 'Piece', barcode: 'STL002', cost_ugx: 45000, selling_ugx: 52000, selling_usd: 14, stock: 150, reorder: 40 },
      { name: 'Y10 Steel Bars 6m', category: 'Steel', unit: 'Piece', barcode: 'STL003', cost_ugx: 18000, selling_ugx: 21000, selling_usd: 5.6, stock: 250, reorder: 60 },
      { name: 'Binding Wire 2mm Roll', category: 'Steel', unit: 'Roll', barcode: 'STL004', cost_ugx: 85000, selling_ugx: 95000, selling_usd: 25, stock: 80, reorder: 20 },
      { name: 'G.I Wire 2.5mm Roll', category: 'Steel', unit: 'Roll', barcode: 'STL005', cost_ugx: 120000, selling_ugx: 135000, selling_usd: 36, stock: 50, reorder: 15 },

      // Roofing Materials
      { name: 'Iron Sheets 30 Gauge 10ft', category: 'Roofing', unit: 'Sheet', barcode: 'ROF001', cost_ugx: 32000, selling_ugx: 36000, selling_usd: 9.7, stock: 300, reorder: 100 },
      { name: 'Iron Sheets 28 Gauge 10ft', category: 'Roofing', unit: 'Sheet', barcode: 'ROF002', cost_ugx: 38000, selling_ugx: 43000, selling_usd: 11.5, stock: 250, reorder: 80 },
      { name: 'Box Profile Sheets 10ft', category: 'Roofing', unit: 'Sheet', barcode: 'ROF003', cost_ugx: 45000, selling_ugx: 52000, selling_usd: 14, stock: 150, reorder: 50 },
      { name: 'Ridge Cap 10ft', category: 'Roofing', unit: 'Piece', barcode: 'ROF004', cost_ugx: 18000, selling_ugx: 21000, selling_usd: 5.6, stock: 100, reorder: 30 },
      { name: 'Roofing Nails 3 inch (Kg)', category: 'Roofing', unit: 'Kg', barcode: 'ROF005', cost_ugx: 8500, selling_ugx: 10000, selling_usd: 2.7, stock: 200, reorder: 50 },

      // Timber & Wood
      { name: 'Timber 2x4x12 (Treated)', category: 'Timber', unit: 'Piece', barcode: 'TMB001', cost_ugx: 18000, selling_ugx: 22000, selling_usd: 5.9, stock: 180, reorder: 50 },
      { name: 'Timber 2x3x12 (Treated)', category: 'Timber', unit: 'Piece', barcode: 'TMB002', cost_ugx: 14000, selling_ugx: 17000, selling_usd: 4.5, stock: 200, reorder: 60 },
      { name: 'Timber 4x2x12 (Treated)', category: 'Timber', unit: 'Piece', barcode: 'TMB003', cost_ugx: 35000, selling_ugx: 42000, selling_usd: 11.3, stock: 120, reorder: 40 },
      { name: 'Plywood 8x4 (12mm)', category: 'Timber', unit: 'Sheet', barcode: 'TMB004', cost_ugx: 65000, selling_ugx: 75000, selling_usd: 20, stock: 80, reorder: 20 },
      { name: 'Plywood 8x4 (18mm)', category: 'Timber', unit: 'Sheet', barcode: 'TMB005', cost_ugx: 95000, selling_ugx: 110000, selling_usd: 29.5, stock: 60, reorder: 15 },

      // Paints & Finishes
      { name: 'Sadolin Exterior Paint 20L', category: 'Paint', unit: 'Tin', barcode: 'PNT001', cost_ugx: 180000, selling_ugx: 210000, selling_usd: 56, stock: 40, reorder: 10 },
      { name: 'Sadolin Interior Paint 20L', category: 'Paint', unit: 'Tin', barcode: 'PNT002', cost_ugx: 160000, selling_ugx: 185000, selling_usd: 49.5, stock: 35, reorder: 10 },
      { name: 'Crown Paint White 20L', category: 'Paint', unit: 'Tin', barcode: 'PNT003', cost_ugx: 140000, selling_ugx: 165000, selling_usd: 44, stock: 50, reorder: 15 },
      { name: 'Wood Varnish 4L', category: 'Paint', unit: 'Tin', barcode: 'PNT004', cost_ugx: 45000, selling_ugx: 55000, selling_usd: 14.7, stock: 60, reorder: 20 },
      { name: 'Putty 20kg', category: 'Paint', unit: 'Bag', barcode: 'PNT005', cost_ugx: 25000, selling_ugx: 30000, selling_usd: 8, stock: 80, reorder: 25 },

      // Plumbing
      { name: 'PVC Pipe 4 inch 6m', category: 'Plumbing', unit: 'Pipe', barcode: 'PLM001', cost_ugx: 45000, selling_ugx: 52000, selling_usd: 14, stock: 90, reorder: 30 },
      { name: 'PVC Pipe 3 inch 6m', category: 'Plumbing', unit: 'Pipe', barcode: 'PLM002', cost_ugx: 32000, selling_ugx: 38000, selling_usd: 10.2, stock: 100, reorder: 35 },
      { name: 'PVC Pipe 2 inch 6m', category: 'Plumbing', unit: 'Pipe', barcode: 'PLM003', cost_ugx: 22000, selling_ugx: 26000, selling_usd: 7, stock: 120, reorder: 40 },
      { name: 'PVC Elbow 4 inch', category: 'Plumbing', unit: 'Piece', barcode: 'PLM004', cost_ugx: 3500, selling_ugx: 4500, selling_usd: 1.2, stock: 200, reorder: 50 },
      { name: 'PVC T-Joint 4 inch', category: 'Plumbing', unit: 'Piece', barcode: 'PLM005', cost_ugx: 5000, selling_ugx: 6500, selling_usd: 1.75, stock: 180, reorder: 50 },
      { name: 'PVC Glue 500ml', category: 'Plumbing', unit: 'Bottle', barcode: 'PLM006', cost_ugx: 12000, selling_ugx: 15000, selling_usd: 4, stock: 100, reorder: 30 },

      // Electrical
      { name: 'Electrical Cable 2.5mm 100m', category: 'Electrical', unit: 'Roll', barcode: 'ELC001', cost_ugx: 280000, selling_ugx: 320000, selling_usd: 85.5, stock: 45, reorder: 10 },
      { name: 'Electrical Cable 1.5mm 100m', category: 'Electrical', unit: 'Roll', barcode: 'ELC002', cost_ugx: 180000, selling_ugx: 210000, selling_usd: 56, stock: 50, reorder: 12 },
      { name: 'Circuit Breaker 20A', category: 'Electrical', unit: 'Piece', barcode: 'ELC003', cost_ugx: 15000, selling_ugx: 19000, selling_usd: 5.1, stock: 120, reorder: 30 },
      { name: 'Socket 13A (Square)', category: 'Electrical', unit: 'Piece', barcode: 'ELC004', cost_ugx: 3500, selling_ugx: 5000, selling_usd: 1.35, stock: 200, reorder: 50 },
      { name: 'Light Switch 1-Gang', category: 'Electrical', unit: 'Piece', barcode: 'ELC005', cost_ugx: 2500, selling_ugx: 3500, selling_usd: 0.95, stock: 250, reorder: 60 },

      // Tools
      { name: 'Wheelbarrow Heavy Duty', category: 'Tools', unit: 'Piece', barcode: 'TLS001', cost_ugx: 120000, selling_ugx: 145000, selling_usd: 38.8, stock: 30, reorder: 10 },
      { name: 'Spade/Shovel', category: 'Tools', unit: 'Piece', barcode: 'TLS002', cost_ugx: 25000, selling_ugx: 32000, selling_usd: 8.5, stock: 60, reorder: 20 },
      { name: 'Pickaxe', category: 'Tools', unit: 'Piece', barcode: 'TLS003', cost_ugx: 28000, selling_ugx: 35000, selling_usd: 9.4, stock: 50, reorder: 15 },
      { name: 'Hammer Claw 500g', category: 'Tools', unit: 'Piece', barcode: 'TLS004', cost_ugx: 12000, selling_ugx: 16000, selling_usd: 4.3, stock: 80, reorder: 25 },
      { name: 'Spirit Level 24 inch', category: 'Tools', unit: 'Piece', barcode: 'TLS005', cost_ugx: 18000, selling_ugx: 24000, selling_usd: 6.4, stock: 40, reorder: 15 },
      { name: 'Measuring Tape 5m', category: 'Tools', unit: 'Piece', barcode: 'TLS006', cost_ugx: 8000, selling_ugx: 12000, selling_usd: 3.2, stock: 100, reorder: 30 },

      // Fasteners
      { name: 'Common Nails 3 inch (Kg)', category: 'Fasteners', unit: 'Kg', barcode: 'FST001', cost_ugx: 7500, selling_ugx: 9500, selling_usd: 2.55, stock: 300, reorder: 80 },
      { name: 'Common Nails 2 inch (Kg)', category: 'Fasteners', unit: 'Kg', barcode: 'FST002', cost_ugx: 7500, selling_ugx: 9500, selling_usd: 2.55, stock: 280, reorder: 70 },
      { name: 'Wood Screws 2 inch (Box)', category: 'Fasteners', unit: 'Box', barcode: 'FST003', cost_ugx: 15000, selling_ugx: 19000, selling_usd: 5.1, stock: 150, reorder: 40 },
      { name: 'Bolts & Nuts M12 (Set)', category: 'Fasteners', unit: 'Set', barcode: 'FST004', cost_ugx: 2000, selling_ugx: 3000, selling_usd: 0.8, stock: 500, reorder: 100 },
      { name: 'Anchor Bolts 10mm (Piece)', category: 'Fasteners', unit: 'Piece', barcode: 'FST005', cost_ugx: 1500, selling_ugx: 2200, selling_usd: 0.6, stock: 400, reorder: 100 },

      // Blocks & Bricks
      { name: 'Hollow Blocks 6 inch', category: 'Blocks', unit: 'Piece', barcode: 'BLK001', cost_ugx: 1200, selling_ugx: 1500, selling_usd: 0.4, stock: 2000, reorder: 500 },
      { name: 'Hollow Blocks 9 inch', category: 'Blocks', unit: 'Piece', barcode: 'BLK002', cost_ugx: 1800, selling_ugx: 2200, selling_usd: 0.6, stock: 1500, reorder: 400 },
      { name: 'Red Bricks (Burnt)', category: 'Blocks', unit: 'Piece', barcode: 'BLK003', cost_ugx: 600, selling_ugx: 800, selling_usd: 0.22, stock: 5000, reorder: 1000 },
      { name: 'Interlocking Bricks', category: 'Blocks', unit: 'Piece', barcode: 'BLK004', cost_ugx: 800, selling_ugx: 1100, selling_usd: 0.3, stock: 3000, reorder: 800 },
    ];

    products.forEach((product) => {
      execute(
        `INSERT INTO products (
          name, category, unit, barcode,
          cost_price_ugx, cost_price_usd,
          selling_price_ugx, selling_price_usd,
          current_stock, reorder_level,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          product.name,
          product.category,
          product.unit,
          product.barcode,
          product.cost_ugx,
          product.cost_ugx / 3700, // USD cost (approx exchange rate)
          product.selling_ugx,
          product.selling_usd,
          product.stock,
          product.reorder,
        ]
      );
    });

    // 4. Create some sample sales invoices with "Not Taken" status
    console.log('Adding sample invoices...');
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const twoDaysAgo = format(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const threeDaysAgo = format(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

    // Invoice 1: ABC Hardware - Not Taken (2 days old)
    const inv1Result = execute(
      `INSERT INTO sales_invoices (
        invoice_number, customer_id, invoice_date, is_quotation,
        currency, exchange_rate,
        subtotal, discount_amount, tax_amount, total_amount, total_amount_ugx,
        payment_status, amount_paid, payment_method,
        delivery_status, expected_collection_date, collection_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `INV-${format(new Date(twoDaysAgo), 'yyyyMMdd')}-0001`,
        1, // ABC Hardware
        twoDaysAgo,
        0,
        'UGX',
        1,
        1050000,
        0,
        0,
        1050000,
        1050000,
        'Paid',
        1050000,
        'Cash',
        'Not Taken',
        today,
        'Customer will send truck to collect',
      ]
    );

    execute(
      `INSERT INTO sales_invoice_items (
        sales_invoice_id, product_id, quantity, unit_price,
        discount_percent, tax_percent, line_total,
        delivery_status, quantity_delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv1Result.lastInsertRowid, 1, 30, 35000, 0, 0, 1050000, 'Not Taken', 0]
    );

    // Update stock reservation
    execute('UPDATE products SET reserved_stock = reserved_stock + 30 WHERE id = 1');

    // Invoice 2: XYZ Construction - Partially Taken (3 days old)
    const inv2Result = execute(
      `INSERT INTO sales_invoices (
        invoice_number, customer_id, invoice_date, is_quotation,
        currency, exchange_rate,
        subtotal, discount_amount, tax_amount, total_amount, total_amount_ugx,
        payment_status, amount_paid, payment_method,
        delivery_status, expected_collection_date, collection_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `INV-${format(new Date(threeDaysAgo), 'yyyyMMdd')}-0001`,
        2, // XYZ Construction
        threeDaysAgo,
        0,
        'UGX',
        1,
        1040000,
        0,
        0,
        1040000,
        1040000,
        'Paid',
        1040000,
        'Bank Transfer',
        'Partially Taken',
        yesterday,
        'Collecting in batches',
      ]
    );

    execute(
      `INSERT INTO sales_invoice_items (
        sales_invoice_id, product_id, quantity, unit_price,
        discount_percent, tax_percent, line_total,
        delivery_status, quantity_delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv2Result.lastInsertRowid, 6, 20, 32000, 0, 0, 640000, 'Partially Taken', 10]
    );

    execute(
      `INSERT INTO sales_invoice_items (
        sales_invoice_id, product_id, quantity, unit_price,
        discount_percent, tax_percent, line_total,
        delivery_status, quantity_delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv2Result.lastInsertRowid, 7, 10, 52000, 0, 0, 520000, 'Not Taken', 0]
    );

    // Update stock reservation (10 Y12 bars collected, 10 still reserved + 10 Y16 reserved)
    execute('UPDATE products SET reserved_stock = reserved_stock + 10 WHERE id = 6');
    execute('UPDATE products SET reserved_stock = reserved_stock + 10 WHERE id = 7');

    // Invoice 3: Prime Builders - Taken (completed)
    const inv3Result = execute(
      `INSERT INTO sales_invoices (
        invoice_number, customer_id, invoice_date, is_quotation,
        currency, exchange_rate,
        subtotal, discount_amount, tax_amount, total_amount, total_amount_ugx,
        payment_status, amount_paid, payment_method,
        delivery_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `INV-${format(new Date(yesterday), 'yyyyMMdd')}-0001`,
        5, // Prime Builders
        yesterday,
        0,
        'UGX',
        1,
        750000,
        0,
        0,
        750000,
        750000,
        'Paid',
        750000,
        'Mobile Money',
        'Taken',
      ]
    );

    execute(
      `INSERT INTO sales_invoice_items (
        sales_invoice_id, product_id, quantity, unit_price,
        discount_percent, tax_percent, line_total,
        delivery_status, quantity_delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv3Result.lastInsertRowid, 11, 15, 36000, 0, 0, 540000, 'Taken', 15]
    );

    execute(
      `INSERT INTO sales_invoice_items (
        sales_invoice_id, product_id, quantity, unit_price,
        discount_percent, tax_percent, line_total,
        delivery_status, quantity_delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv3Result.lastInsertRowid, 16, 10, 22000, 0, 0, 220000, 'Taken', 10]
    );

    // 5. Create sample purchase invoices
    console.log('Adding sample purchases...');

    // Purchase 1: Global Steel Uganda - Paid (5 days ago)
    const fiveDaysAgo = format(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const pur1Result = execute(
      `INSERT INTO purchase_invoices (
        purchase_number, supplier_id, supplier_invoice_number, purchase_date,
        currency, exchange_rate,
        subtotal, tax_amount, total_amount, total_amount_ugx,
        payment_status, amount_paid, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `PUR-${format(new Date(fiveDaysAgo), 'yyyyMMdd')}-0001`,
        1, // Global Steel Uganda
        'GSU-2024-1234',
        fiveDaysAgo,
        'UGX',
        1,
        5600000, // 200 Y12 steel bars @ 28000
        0,
        5600000,
        5600000,
        'Paid',
        5600000,
        'Bank Transfer',
      ]
    );

    execute(
      `INSERT INTO purchase_invoice_items (
        invoice_id, product_id, product_name, quantity, unit_price,
        tax_percent, line_total, update_cost_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pur1Result.lastInsertRowid, 6, 'Y12 Steel Bars 6m', 200, 28000, 0, 5600000, 0]
    );

    // Purchase already received, stock was updated by purchase service
    // But for seed data, we manually added stock earlier, so this is just for demonstration

    // Purchase 2: Cement Suppliers Ltd - Unpaid (2 days ago)
    const pur2Result = execute(
      `INSERT INTO purchase_invoices (
        purchase_number, supplier_id, supplier_invoice_number, purchase_date,
        currency, exchange_rate,
        subtotal, tax_amount, total_amount, total_amount_ugx,
        payment_status, amount_paid, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `PUR-${format(new Date(twoDaysAgo), 'yyyyMMdd')}-0002`,
        4, // Cement Suppliers Ltd
        'CSL-INV-5678',
        twoDaysAgo,
        'UGX',
        1,
        1600000, // 50 bags of Hima Cement @ 32000
        0,
        1600000,
        1600000,
        'Unpaid',
        0,
        null,
      ]
    );

    execute(
      `INSERT INTO purchase_invoice_items (
        invoice_id, product_id, product_name, quantity, unit_price,
        tax_percent, line_total, update_cost_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pur2Result.lastInsertRowid, 1, 'Hima Cement 50kg', 50, 32000, 0, 1600000, 0]
    );

    // Purchase 3: Paint Masters Ltd - Paid (USD, yesterday)
    const pur3Result = execute(
      `INSERT INTO purchase_invoices (
        purchase_number, supplier_id, supplier_invoice_number, purchase_date,
        currency, exchange_rate,
        subtotal, tax_amount, total_amount, total_amount_ugx,
        payment_status, amount_paid, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `PUR-${format(new Date(yesterday), 'yyyyMMdd')}-0001`,
        2, // Paint Masters Ltd
        'PM-2024-789',
        yesterday,
        'USD',
        3700,
        680, // 10 tins @ $56 + 5 tins @ $44
        0,
        680,
        2516000, // 680 * 3700
        'Paid',
        680,
        'Bank Transfer',
      ]
    );

    execute(
      `INSERT INTO purchase_invoice_items (
        invoice_id, product_id, product_name, quantity, unit_price,
        tax_percent, line_total, update_cost_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pur3Result.lastInsertRowid, 24, 'Sadolin Exterior Paint 20L', 10, 48.65, 0, 486.5, 0]
    );

    execute(
      `INSERT INTO purchase_invoice_items (
        invoice_id, product_id, product_name, quantity, unit_price,
        tax_percent, line_total, update_cost_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pur3Result.lastInsertRowid, 26, 'Crown Paint White 20L', 5, 37.84, 0, 189.2, 0]
    );

    // Note: In production, the purchase service would automatically update stock
    // For seed data, we already have stock from initial product creation

    console.log('✅ Database seeded successfully!');
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${suppliers.length} suppliers`);
    console.log(`   - ${products.length} products`);
    console.log('   - 3 sample sales invoices (1 Not Taken, 1 Partially Taken, 1 Taken)');
    console.log('   - 3 sample purchase invoices (2 Paid, 1 Unpaid)');
  });
}

// Run if executed directly
if (require.main === module) {
  try {
    getDatabase(); // Initialize database
    seedDatabase();
    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}
