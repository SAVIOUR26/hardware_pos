import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schema';

let db: Database.Database | null = null;

/**
 * Get or create the database connection
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  try {
    // Get user data directory
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'hardware_manager.db');

    console.log('Database path:', dbPath);

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create database connection
    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Initialize schema if needed
    initializeSchema(db);

    console.log('Database initialized successfully');

    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Initialize database schema
 * Uses embedded schema SQL to avoid file reading issues in packaged apps
 */
function initializeSchema(database: Database.Database): void {
  try {
    console.log('Initializing database schema...');

    // Execute schema (Better-SQLite3 supports multiple statements)
    // Using embedded schema SQL from schema.ts
    database.exec(SCHEMA_SQL);

    // Run migrations for existing databases
    runMigrations(database);

    console.log('Schema initialized successfully (embedded schema)');
  } catch (error) {
    console.error('Failed to initialize schema:', error);
    throw error;
  }
}

/**
 * Run database migrations
 * Add columns that may not exist in older database versions
 */
function runMigrations(database: Database.Database): void {
  try {
    console.log('Running database migrations...');

    // Migration: Add credit_limit column to customers table
    try {
      database.exec('ALTER TABLE customers ADD COLUMN credit_limit REAL DEFAULT 0');
      console.log('✓ Added credit_limit column to customers');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Migration error (credit_limit):', e.message);
      }
    }

    // Migration: Add notes column to customers table
    try {
      database.exec('ALTER TABLE customers ADD COLUMN notes TEXT');
      console.log('✓ Added notes column to customers');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Migration error (notes):', e.message);
      }
    }

    // Migration: Add is_deleted column to customers table
    try {
      database.exec('ALTER TABLE customers ADD COLUMN is_deleted INTEGER DEFAULT 0');
      console.log('✓ Added is_deleted column to customers');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Migration error (is_deleted):', e.message);
      }
    }

    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    // Don't throw - migrations are non-critical
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
      db = null;
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}

/**
 * Execute a query
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDatabase();
  try {
    const stmt = database.prepare(sql);
    const result = stmt.all(...params);
    return result as T[];
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Execute a query and return first result
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const database = getDatabase();
  try {
    const stmt = database.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Execute an insert/update/delete statement
 */
export function execute(sql: string, params: any[] = []): Database.RunResult {
  const database = getDatabase();
  try {
    const stmt = database.prepare(sql);
    return stmt.run(...params);
  } catch (error) {
    console.error('Execute error:', error);
    throw error;
  }
}

/**
 * Execute multiple statements in a transaction
 */
export function transaction<T>(callback: (db: Database.Database) => T): T {
  const database = getDatabase();
  const transactionFn = database.transaction(callback);
  return transactionFn(database);
}

/**
 * Backup database to specified path
 */
export async function backupDatabase(backupPath: string): Promise<void> {
  const database = getDatabase();

  return new Promise((resolve, reject) => {
    try {
      // Close any open transactions
      database.backup(backupPath)
        .then(() => {
          console.log('Database backup created:', backupPath);
          resolve();
        })
        .catch(reject);
    } catch (error) {
      console.error('Backup error:', error);
      reject(error);
    }
  });
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  const database = getDatabase();

  try {
    // Get table counts
    const tables = [
      'products',
      'customers',
      'suppliers',
      'sales_invoices',
      'purchase_invoices',
      'payments',
      'delivery_notes',
    ];

    const stats: Record<string, number> = {};

    for (const table of tables) {
      const result = database.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
      stats[table] = result.count;
    }

    // Get database file size
    const dbPath = database.name;
    const dbSize = fs.statSync(dbPath).size;

    return {
      ...stats,
      database_size_bytes: dbSize,
      database_size_mb: (dbSize / (1024 * 1024)).toFixed(2),
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}

/**
 * Vacuum database to optimize size
 */
export function vacuumDatabase(): void {
  const database = getDatabase();
  try {
    database.exec('VACUUM');
    console.log('Database vacuumed successfully');
  } catch (error) {
    console.error('Vacuum error:', error);
    throw error;
  }
}

// Export the database getter as default
export default getDatabase;
