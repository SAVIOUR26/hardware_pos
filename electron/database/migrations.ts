import Database from 'better-sqlite3';
import { getDatabase, queryOne, execute } from './index';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

/**
 * All database migrations
 * Each migration has a version number and an up function
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: 'Initial schema',
    up: (db: Database.Database) => {
      // Schema is already created by schema.sql
      // This migration just ensures version is set
      console.log('Migration 1: Initial schema already applied');
    },
  },
  // Future migrations will be added here
  // Example:
  // {
  //   version: 2,
  //   name: 'Add barcode scanner support',
  //   up: (db: Database.Database) => {
  //     db.exec(`
  //       ALTER TABLE products ADD COLUMN barcode_prefix TEXT;
  //       CREATE INDEX idx_products_barcode_prefix ON products(barcode_prefix);
  //     `);
  //   },
  // },
];

/**
 * Get current database schema version
 */
export function getCurrentVersion(): number {
  try {
    const result = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['schema_version']);

    if (!result) {
      return 0;
    }

    return parseInt(result.value, 10);
  } catch (error) {
    console.error('Error getting schema version:', error);
    return 0;
  }
}

/**
 * Set database schema version
 */
function setVersion(version: number): void {
  execute(
    `INSERT OR REPLACE INTO settings (key, value, updated_at)
     VALUES ('schema_version', ?, CURRENT_TIMESTAMP)`,
    [version.toString()],
  );
}

/**
 * Create a backup before running migrations
 */
async function createBackupBeforeMigration(): Promise<string> {
  const userDataPath = app.getPath('userData');
  const backupDir = path.join(userDataPath, 'backups');

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = path.join(backupDir, `backup_before_migration_${timestamp}.db`);

  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.backup(backupPath)
      .then(() => {
        console.log('Backup created before migration:', backupPath);
        resolve(backupPath);
      })
      .catch((error) => {
        console.error('Failed to create backup:', error);
        reject(error);
      });
  });
}

/**
 * Run pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    const db = getDatabase();
    const currentVersion = getCurrentVersion();

    console.log('Current database version:', currentVersion);

    // Find pending migrations
    const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s)`);

    // Create backup before running migrations
    console.log('Creating backup before running migrations...');
    await createBackupBeforeMigration();

    // Run each migration in a transaction
    for (const migration of pendingMigrations) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);

      try {
        const migrationFn = db.transaction(() => {
          migration.up(db);
          setVersion(migration.version);
        });

        migrationFn();

        console.log(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        throw new Error(`Migration ${migration.version} failed: ${error}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

/**
 * Check if migrations are needed
 */
export function needsMigration(): boolean {
  const currentVersion = getCurrentVersion();
  const latestVersion = migrations.length > 0 ? Math.max(...migrations.map((m) => m.version)) : 0;

  return currentVersion < latestVersion;
}

/**
 * Get migration status
 */
export function getMigrationStatus() {
  const currentVersion = getCurrentVersion();
  const latestVersion = migrations.length > 0 ? Math.max(...migrations.map((m) => m.version)) : 0;
  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  return {
    currentVersion,
    latestVersion,
    needsMigration: currentVersion < latestVersion,
    pendingCount: pendingMigrations.length,
    pendingMigrations: pendingMigrations.map((m) => ({
      version: m.version,
      name: m.name,
    })),
  };
}
