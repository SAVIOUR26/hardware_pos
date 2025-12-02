# Logo and Icon Setup

This directory contains the application icon and logo files.

## Application Icon (Windows .exe)

**File**: `icon.ico`

To add your company logo as the Windows application icon:

1. Prepare your logo image (PNG, JPG, or other format)
2. Convert it to `.ico` format using an online converter:
   - https://icoconvert.com/
   - https://convertio.co/png-ico/
   - Recommended sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 pixels
3. Save the `.ico` file as `icon.ico` in this directory (`build/icon.ico`)
4. Rebuild the application using `npm run build:renderer` and package it

## Sidebar Logo (In-App Display)

**File**: `logo.png` or `logo.svg`

To add your company logo to the sidebar:

1. Save your logo image as `build/logo.png` or `build/logo.svg`
   - Recommended size: 200x60 pixels (width x height)
   - Transparent background preferred
   - PNG or SVG format
2. The logo will appear in the sidebar above the company name
3. Rebuild the frontend: `npm run build:renderer`

## Current Configuration

- **Company Name**: Stuti Hardware SMC Limited
- **Application ID**: com.stuti.hardware-manager-pro
- **Product Name**: Hardware Manager Pro

## Quick Setup

1. Add your logo files to this directory:
   ```
   build/
   ├── icon.ico        (Windows application icon)
   └── logo.png        (Sidebar logo - optional)
   ```

2. Rebuild the application:
   ```bash
   npm run build:renderer
   npm run build:electron
   npm run package
   ```

3. Or use GitHub Actions for automated builds (recommended)
