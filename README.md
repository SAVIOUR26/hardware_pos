# Hardware Manager Pro

> **Production-Ready Business Management System for Hardware & Building Materials**

A comprehensive desktop application built with Electron, React, and TypeScript for managing hardware store operations including sales, purchases, inventory, and financial tracking.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-orange.svg)

## 🎉 Project Status: 100% Complete - Production Ready

All core features have been implemented, tested, and are ready for deployment!

## 🚀 Features

### 📊 Enhanced Dashboard
- **Real-time Business Metrics**: Today's sales, monthly trends, growth indicators
- **Not Taken Items Tracking**: Monitor pending deliveries with oldest pending days ⭐
- **Low Stock Alerts**: Automatic notifications for items needing reorder
- **Recent Activity Feeds**: Last 5 sales and purchases at a glance
- **Top Performers**: Best-selling products and top customers this month
- **Quick Actions**: One-click access to common workflows

### 💰 Sales Management
- Complete sales workflow: quotations → invoices → delivery → payment
- Multi-currency support (UGX/USD) with automatic conversion
- Delivery status tracking (Not Taken, Partially Taken, Taken)
- Payment status management (Paid, Partial, Unpaid)
- Customer information and transaction history
- Invoice printing with professional templates

### 📦 Purchase Management
- Purchase order creation and tracking
- Supplier management and purchase history
- Multi-currency purchases with exchange rates
- Payment tracking and accounts payable
- Automatic inventory updates on receipt

### 🏪 Inventory Management
- Real-time stock tracking with reserved stock handling
- Low stock alerts and reorder level management
- Stock reports with valuation
- Category-based organization
- Product search and filtering
- Batch stock adjustments

### 🖨️ Printing System
- **Professional Invoices**: A4 PDFs with company branding
- **Thermal Receipts**: 80mm/58mm receipt printing
- **Delivery Notes**: With optional price display
- Auto-open in default PDF viewer
- Multi-currency support in templates

### 📈 Business Reports
- **Sales Report**: Group by day/product/customer with flexible filters
- **Purchase Report**: Analyze by day/product/supplier
- **Cash Book**: Track all cash inflows and outflows
- **Profit & Loss**: Calculate gross and net profit margins
- Interactive date range selection with quick filters
- Summary statistics with color-coded insights

### 💾 Backup & Restore
- One-click database backup creation
- Export database to custom location
- Import/restore from backup files
- Backup history management (view/restore/delete)
- Database optimization (VACUUM)
- Real-time database statistics
- Automatic safety backups before restore

### 👥 Customer & Supplier Management
- Comprehensive contact information
- Transaction history and outstanding balances
- Credit terms and payment tracking
- Search and filtering capabilities

## 📥 Installation

### 🪟 For Windows Users

#### Option 1: Build in GitHub Codespace (Recommended)

If you're working in GitHub Codespace:

1. **Build the Windows version:**
   ```bash
   npm run build:renderer && npm run build:electron
   cd dist
   zip -r hardware-manager-pro-1.0.0-win-portable.zip win-unpacked/
   ```

2. **Download from Codespace:**
   - In VS Code file explorer, navigate to `dist/` folder
   - Right-click on `hardware-manager-pro-1.0.0-win-portable.zip`
   - Select **"Download"**
   - Save to your Windows PC (133 MB)

3. **Run on Windows:**
   - Extract the ZIP file
   - Open the extracted folder
   - Double-click `hardware-manager-pro.exe`
   - **Done!** No installation needed (portable app)

**Note:** First time you run, Windows may show "Windows protected your PC" warning. Click **"More info"** → **"Run anyway"** (app is not code-signed).

#### Option 2: Build Locally on Windows

```bash
# Clone repository
git clone https://github.com/SAVIOUR26/hardware_pro.git
cd hardware_pro

# Install dependencies
npm install

# Build for Windows
npm run build:renderer && npm run build:electron
cd dist
# The app will be in dist/win-unpacked/hardware-manager-pro.exe
```

### 🐧 For Linux Users

#### Download Pre-built Packages

Download the latest release from the `dist` folder:
- **AppImage** (131 MB): `hardware-manager-pro-1.0.0.AppImage` - Universal Linux
- **Snap** (112 MB): `hardware-manager-pro_1.0.0_amd64.snap` - Ubuntu/Snap-enabled

#### Option 1: AppImage (Recommended)
```bash
# Make executable
chmod +x hardware-manager-pro-1.0.0.AppImage

# Run
./hardware-manager-pro-1.0.0.AppImage
```

#### Option 2: Snap Package
```bash
# Install
sudo snap install hardware-manager-pro_1.0.0_amd64.snap --dangerous

# Run
hardware-manager-pro
```

#### Option 3: Build from Source
```bash
# Clone and build
git clone https://github.com/SAVIOUR26/hardware_pro.git
cd hardware_pro
npm install
npm run build
# Packages will be in dist/ folder
```

### 🗂️ Database Location

**Windows:**
```
C:\Users\YourName\AppData\Roaming\hardware-manager-pro\hardware_manager.db
```

**Linux:**
```
~/.config/hardware-manager-pro/hardware_manager.db
```

### First Run
On first launch, the application will automatically:
- Create the database directory
- Initialize the schema with all required tables
- Load sample data for testing (optional)

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 9+
- Linux development environment

### Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Project Structure
```
hardware_pro/
├── electron/              # Electron main process
│   ├── database/         # SQLite database & schema
│   ├── services/         # Business logic services
│   │   ├── dashboard.service.ts
│   │   ├── printer.service.ts
│   │   ├── reports.service.ts
│   │   └── settings.service.ts
│   └── ipc/              # IPC handlers
├── src/                  # React frontend
│   ├── components/       # Reusable UI components
│   ├── pages/            # Application pages
│   │   ├── Dashboard.tsx
│   │   ├── Settings.tsx
│   │   ├── sales/
│   │   ├── purchase/
│   │   ├── inventory/
│   │   └── reports/
│   ├── types/            # TypeScript type definitions
│   └── router/           # React Router configuration
└── dist/                 # Production builds
```

## 🎯 Quick Start Guide

### Creating Your First Sale
1. Navigate to **Sales** → **New Sale**
2. Select customer (or create new)
3. Add products with quantities and prices
4. Choose currency (UGX/USD)
5. Set delivery terms and expected collection date
6. Save as quotation or invoice
7. Print invoice for customer

### Managing Not Taken Items
1. Dashboard shows **Not Taken** count prominently in blue card
2. Click the card to view all pending deliveries
3. Mark items as taken when collected
4. Track oldest pending delivery in days

### Creating Reports
1. Navigate to **Reports**
2. Select report type (Sales/Purchase)
3. Choose date range (quick filters: This Month, Last Month, This Year)
4. Select grouping option (Day/Product/Customer/Supplier)
5. Click "Generate" to view results

### Backing Up Your Data
1. Go to **Settings** page
2. Click **Create Backup** for automatic backup
3. Or **Export Database** to choose custom location
4. View backup history with restore/delete options
5. Click **Optimize** to reclaim database space

---

## 💻 For GitHub Codespace Users

If you're developing in GitHub Codespace and need the Windows build:

### Quick Build & Download

```bash
# 1. Build the application
npm run build:renderer && npm run build:electron

# 2. Create portable Windows ZIP
cd dist
zip -r hardware-manager-pro-1.0.0-win-portable.zip win-unpacked/

# 3. The ZIP is ready at: dist/hardware-manager-pro-1.0.0-win-portable.zip
```

### Download to Your Windows PC

**Method 1: VS Code File Explorer (Easiest)**
1. Open VS Code file explorer (left sidebar)
2. Navigate to `dist/` folder
3. Right-click `hardware-manager-pro-1.0.0-win-portable.zip`
4. Select **"Download"**
5. Save to your local Windows machine

**Method 2: Terminal Download**
```bash
# In Codespace terminal
cd /home/user/hardware_pro/dist
ls -lh hardware-manager-pro-1.0.0-win-portable.zip
# File is ready - use VS Code download
```

### Extract and Run
1. Extract the downloaded ZIP on your Windows PC
2. Open the `win-unpacked` folder
3. Double-click `hardware-manager-pro.exe`
4. App runs without installation!

**File Size:** 133 MB (portable, includes all dependencies)

---

## 📊 Technical Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Backend**: Electron 28, Node.js
- **Database**: SQLite (better-sqlite3) with WAL mode
- **PDF Generation**: pdfmake
- **UI Icons**: Lucide React
- **Date Handling**: date-fns
- **Notifications**: sonner (toast)
- **Routing**: React Router v6
- **Build**: electron-builder

## 🎨 Key Workflows

### Sales Workflow
```
New Sale → Add Products → Set Currency → Save Invoice → Print →
Mark as Not Taken → Customer Collects → Mark as Taken → Record Payment
```

### Purchase Workflow
```
New Purchase → Add Items → Select Supplier → Set Currency →
Save Invoice → Receive Goods → Update Stock → Record Payment
```

### Inventory Workflow
```
Add Product → Set Prices & Reorder Level → Monitor Stock →
Receive Low Stock Alert → Create Purchase Order
```

### Reporting Workflow
```
Select Report Type → Set Date Range → Choose Grouping →
Apply Filters → Generate Report → Analyze Results
```

## 🔧 Configuration

### Database Location

**Windows:**
```
C:\Users\YourName\AppData\Roaming\hardware-manager-pro\hardware_manager.db
```

**Linux:**
```
~/.config/hardware-manager-pro/hardware_manager.db
```

### Backup Location

**Windows:**
```
C:\Users\YourName\AppData\Roaming\hardware-manager-pro\backups\
```

**Linux:**
```
~/.config/hardware-manager-pro/backups/
```

### PDF Output

**Windows:**
```
C:\Users\YourName\AppData\Local\Temp\hardware-pro-prints\
```

**Linux:**
```
/tmp/hardware-pro-prints/
```

PDFs open automatically in your default PDF viewer

## 🔒 Data Safety Features

- **WAL Mode**: Write-Ahead Logging for better concurrency
- **Foreign Keys**: Referential integrity enforced
- **Transactions**: ACID compliance for data consistency
- **Pre-restore Backups**: Automatic safety backup before restore
- **VACUUM**: Database optimization to reclaim space
- **Timestamped Backups**: Easy identification and management

## 📊 Database Statistics

The Settings page displays real-time statistics:
- Total products, customers, suppliers
- Sales and purchase invoice counts
- Payment records count
- Database file size in MB

## 🐛 Troubleshooting

### Application Won't Start
```bash
# Check permissions
chmod +x hardware-manager-pro-1.0.0.AppImage

# Check database directory
ls -la ~/.config/hardware-manager-pro/
```

### Print Not Working
1. Ensure default PDF viewer is configured
2. Check temp directory permissions: `/tmp/hardware-pro-prints/`
3. Verify disk space availability

### Database Issues
```bash
# View database file
ls -lh ~/.config/hardware-manager-pro/hardware_manager.db

# View backups
ls -lh ~/.config/hardware-manager-pro/backups/

# Use Settings page to optimize database
```

## 📝 Version History

### v1.0.0 (Current - Production Ready)
**New Features:**
- ✅ Enhanced dashboard with real-time business metrics
- ✅ Professional printing system (invoices, receipts, delivery notes)
- ✅ Comprehensive reporting (sales, purchases, cash book, P&L)
- ✅ Complete backup and restore system
- ✅ Database optimization tools
- ✅ Multi-currency support (UGX/USD)
- ✅ Not Taken items workflow
- ✅ Low stock alerts and monitoring
- ✅ Top performers analysis
- ✅ Recent activity feeds

**Technical:**
- Production build: 131 MB (AppImage), 112 MB (Snap)
- Zero build errors
- Full TypeScript type safety
- Optimized bundle size
- WAL mode enabled for better performance

## 🚀 Future Enhancements

- [ ] Multi-user support with role-based access control
- [ ] Email integration for invoice sending
- [ ] Advanced charts and visualizations
- [ ] Tally accounting software integration
- [ ] Mobile companion app (React Native)
- [ ] Cloud sync capabilities
- [ ] Advanced analytics dashboard
- [ ] Custom report templates
- [ ] Barcode scanning support
- [ ] WhatsApp integration for customer notifications

## 🤝 Contributing

This is a proprietary application developed for hardware and building materials businesses. For feature requests or bug reports, please contact the development team.

## 📄 License

Proprietary - All rights reserved

## 💼 Support

For technical support, feature requests, or business inquiries, please contact your system administrator or the development team.

---

**Built with ❤️ for Hardware & Building Materials Businesses**

*Hardware Manager Pro - Your Complete Business Management Solution*

**Current Status**: 🟢 Production Ready | 📦 v1.0.0 | 🚀 Actively Maintained
