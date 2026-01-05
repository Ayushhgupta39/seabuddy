import * as SQLite from 'expo-sqlite';

const DB_NAME = 'seabuddy.db';

export const db = SQLite.openDatabaseSync(DB_NAME);

/**
 * Initialize the local SQLite database with offline-first schema
 * 
 * Critical fields for offline sync:
 * - localId: UUID generated on device
 * - serverId: UUID from backend (nullable until synced)
 * - syncStatus: PENDING | SYNCED | ERROR
 * - createdAt, updatedAt: timestamps for conflict resolution
 * - syncedAt: when last synced to server
 */
export const initDatabase = () => {
  console.log('🗄️  Initializing local database...');

  // Mood Logs table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS mood_logs (
      localId TEXT PRIMARY KEY NOT NULL,
      serverId TEXT,
      mood TEXT NOT NULL,
      intensity INTEGER,
      notes TEXT,
      syncStatus TEXT NOT NULL DEFAULT 'PENDING',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncedAt TEXT,
      isDeleted INTEGER DEFAULT 0
    );
  `);

  // Journal Entries table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      localId TEXT PRIMARY KEY NOT NULL,
      serverId TEXT,
      title TEXT,
      content TEXT NOT NULL,
      mood TEXT,
      isPrivate INTEGER NOT NULL DEFAULT 1,
      syncStatus TEXT NOT NULL DEFAULT 'PENDING',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncedAt TEXT,
      isDeleted INTEGER DEFAULT 0
    );
  `);

  // Resources table (read-only from server)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      content TEXT,
      url TEXT,
      thumbnailUrl TEXT,
      category TEXT,
      tags TEXT,
      offlineAvailable INTEGER NOT NULL DEFAULT 1,
      estimatedMinutes INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Check-ins table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS check_ins (
      localId TEXT PRIMARY KEY NOT NULL,
      serverId TEXT,
      scheduledFor TEXT NOT NULL,
      completedAt TEXT,
      mood TEXT,
      responses TEXT,
      needsAttention INTEGER NOT NULL DEFAULT 0,
      syncStatus TEXT NOT NULL DEFAULT 'PENDING',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncedAt TEXT,
      isDeleted INTEGER DEFAULT 0
    );
  `);

  // Sync metadata table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      tableName TEXT PRIMARY KEY NOT NULL,
      lastSyncedAt TEXT NOT NULL,
      deviceId TEXT
    );
  `);

  // Indexes for performance
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_mood_logs_sync ON mood_logs(syncStatus);
    CREATE INDEX IF NOT EXISTS idx_journal_sync ON journal_entries(syncStatus);
    CREATE INDEX IF NOT EXISTS idx_checkins_sync ON check_ins(syncStatus);
    CREATE INDEX IF NOT EXISTS idx_mood_logs_created ON mood_logs(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_journal_created ON journal_entries(createdAt DESC);
  `);

  console.log('✅ Database initialized');
};

// Clear all data (for testing/debugging)
export const clearDatabase = () => {
  db.execSync('DROP TABLE IF EXISTS mood_logs;');
  db.execSync('DROP TABLE IF EXISTS journal_entries;');
  db.execSync('DROP TABLE IF EXISTS resources;');
  db.execSync('DROP TABLE IF EXISTS check_ins;');
  db.execSync('DROP TABLE IF EXISTS sync_metadata;');
  initDatabase();
  console.log('🗑️  Database cleared and reinitialized');
};

export default db;
