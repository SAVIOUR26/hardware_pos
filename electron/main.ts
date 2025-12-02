import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDatabase, closeDatabase } from './database';
import { runMigrations, needsMigration } from './database/migrations';
import { registerAllHandlers } from './ipc';

// Setup error logging
const userDataPath = app.getPath('userData');
const logFile = path.join(userDataPath, 'error.log');

function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
}

function showErrorDialog(title: string, message: string) {
  dialog.showErrorBox(title, message);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Wrapped in try-catch for portable builds where this module may not be available
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (e) {
  // Module not available - continue (normal for portable builds)
  logToFile('Squirrel startup check skipped (portable build)');
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  try {
    logToFile('Creating main window...');

    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Show window when ready to avoid visual flash
    mainWindow.once('ready-to-show', () => {
      logToFile('Window ready to show');
      mainWindow?.show();
    });

    // Load the app
    const indexPath = path.join(__dirname, '../dist/index.html');
    logToFile(`Loading index from: ${indexPath}`);
    logToFile(`__dirname: ${__dirname}`);
    logToFile(`Index exists: ${fs.existsSync(indexPath)}`);

    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      // Open DevTools in development
      mainWindow.webContents.openDevTools();
    } else {
      if (!fs.existsSync(indexPath)) {
        const error = `index.html not found at: ${indexPath}`;
        logToFile(`ERROR: ${error}`);
        showErrorDialog('File Not Found', error);
        app.quit();
        return;
      }
      mainWindow.loadFile(indexPath);
    }

    // Log any load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logToFile(`Failed to load: ${errorCode} - ${errorDescription}`);
    });

    // Log console messages from renderer
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      logToFile(`[Renderer Console] ${message} (${sourceId}:${line})`);
    });

    // Handle window close
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    logToFile('Window created successfully');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logToFile(`ERROR creating window: ${errorMsg}`);
    showErrorDialog('Window Creation Failed', `Failed to create application window: ${errorMsg}\n\nLog file: ${logFile}`);
    throw error;
  }
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    logToFile('=== Application Starting ===');
    logToFile(`Electron version: ${process.versions.electron}`);
    logToFile(`Node version: ${process.versions.node}`);
    logToFile(`User data path: ${userDataPath}`);
    logToFile(`App path: ${app.getAppPath()}`);

    // Initialize database
    logToFile('Initializing database...');
    const db = getDatabase();
    logToFile(`Database initialized at: ${db.name}`);

    // Run migrations if needed
    if (needsMigration()) {
      logToFile('Running database migrations...');
      await runMigrations();
      logToFile('Migrations complete');
    } else {
      logToFile('No migrations needed');
    }

    logToFile('Database ready');

    // Register IPC handlers
    logToFile('Registering IPC handlers...');
    registerAllHandlers();
    logToFile('IPC handlers registered');

    // Create window
    logToFile('Creating application window...');
    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    logToFile('=== Application Started Successfully ===');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    logToFile(`FATAL ERROR during initialization: ${errorMsg}`);
    logToFile(`Stack trace: ${stack}`);

    showErrorDialog(
      'Application Failed to Start',
      `The application failed to initialize:\n\n${errorMsg}\n\nPlease check the error log at:\n${logFile}`
    );

    console.error('Failed to initialize application:', error);
    app.quit();
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logToFile('All windows closed, quitting application');
    app.quit();
  }
});

// Clean up when app is quitting
app.on('before-quit', () => {
  logToFile('Closing database connection...');
  try {
    closeDatabase();
    logToFile('Database closed successfully');
  } catch (error) {
    logToFile(`Error closing database: ${error}`);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  const errorMsg = `Uncaught Exception: ${error.message}`;
  logToFile(errorMsg);
  logToFile(`Stack: ${error.stack}`);
  console.error('Uncaught Exception:', error);
  showErrorDialog('Uncaught Exception', `${errorMsg}\n\nLog file: ${logFile}`);
});

process.on('unhandledRejection', (error) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  logToFile(`Unhandled Rejection: ${errorMsg}`);
  console.error('Unhandled Rejection:', error);
});
