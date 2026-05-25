import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { PendingSync } from '@/lib/types';

const DB_PATH = path.join(process.cwd(), 'data', 'xiaozhong.db');

// Ensure the data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Create singleton database connection
const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables on module load
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    category TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    businessHours TEXT DEFAULT '',
    lng REAL,
    lat REAL,
    tags TEXT DEFAULT '[]',
    amapPoiId TEXT DEFAULT '',
    photos TEXT DEFAULT '[]',
    isDeleted INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    shopId TEXT NOT NULL,
    author TEXT NOT NULL,
    rating INTEGER NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    avgPrice REAL,
    visitDate TEXT,
    isDeleted INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY(shopId) REFERENCES shops(id)
  );

  CREATE TABLE IF NOT EXISTS pending_syncs (
    syncId TEXT PRIMARY KEY,
    userToken TEXT NOT NULL,
    authorName TEXT NOT NULL,
    changesPayload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    submittedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_tokens (
    token TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category);
  CREATE INDEX IF NOT EXISTS idx_reviews_shopId ON reviews(shopId);
  CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_syncs(status);
  CREATE INDEX IF NOT EXISTS idx_pending_token ON pending_syncs(userToken);
`);

// Migration: add remark column to user_tokens
try {
  db.exec('ALTER TABLE user_tokens ADD COLUMN remark TEXT DEFAULT ""');
} catch {
  // Column already exists
}

// Migration: add amapPoiId and photos columns to shops
try {
  db.exec('ALTER TABLE shops ADD COLUMN amapPoiId TEXT DEFAULT ""');
} catch {}
try {
  db.exec('ALTER TABLE shops ADD COLUMN photos TEXT DEFAULT "[]"');
} catch {}

// Type reference for the database instance
export type ServerDB = typeof db;

export { db };
