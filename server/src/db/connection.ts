import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'email.db');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

let dbInstance: Database.Database | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    logger.info('Created data directory', { path: DATA_DIR });
  }
}

function initializeSchema(db: Database.Database): void {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  logger.info('Database schema initialized');
}

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  ensureDataDir();

  dbInstance = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  dbInstance.pragma('journal_mode = WAL');
  // Enable foreign keys
  dbInstance.pragma('foreign_keys = ON');
  // Set busy timeout to 5 seconds
  dbInstance.pragma('busy_timeout = 5000');
  // Synchronous NORMAL for performance with WAL
  dbInstance.pragma('synchronous = NORMAL');

  initializeSchema(dbInstance);

  logger.info('SQLite database connected', { path: DB_PATH });

  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  closeDb();
});

process.on('SIGTERM', () => {
  closeDb();
});
