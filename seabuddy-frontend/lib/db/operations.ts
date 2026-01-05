import db from './index';
import type { MoodLog, JournalEntry, Resource, CheckIn, MoodType } from '../types';

/**
 * Database operations with offline-first support
 *
 * ALL writes go to local SQLite with syncStatus = 'PENDING'
 * Sync service will push to server in background
 */

// Generate UUID for localId
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ============== MOOD LOGS ==============

export const createMoodLog = (mood: MoodType, intensity?: number, notes?: string): MoodLog => {
  const now = new Date().toISOString();
  const localId = generateId();

  db.runSync(
    `INSERT INTO mood_logs (localId, mood, intensity, notes, syncStatus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
    [localId, mood, intensity || null, notes || null, now, now]
  );

  return {
    localId,
    serverId: null,
    mood,
    intensity,
    notes,
    syncStatus: 'PENDING',
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  };
};

export const getMoodLogs = (limit: number = 50): MoodLog[] => {
  const rows = db.getAllSync<any>(
    `SELECT * FROM mood_logs WHERE isDeleted = 0 ORDER BY createdAt DESC LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    localId: row.localId,
    serverId: row.serverId,
    mood: row.mood as MoodType,
    intensity: row.intensity,
    notes: row.notes,
    syncStatus: row.syncStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncedAt: row.syncedAt,
  }));
};

export const deleteMoodLog = (localId: string) => {
  db.runSync(`UPDATE mood_logs SET isDeleted = 1, updatedAt = ?, syncStatus = 'PENDING' WHERE localId = ?`, [
    new Date().toISOString(),
    localId,
  ]);
};

// ============== JOURNAL ENTRIES ==============

export const createJournalEntry = (
  content: string,
  title?: string,
  mood?: MoodType,
  isPrivate: boolean = true
): JournalEntry => {
  const now = new Date().toISOString();
  const localId = generateId();

  db.runSync(
    `INSERT INTO journal_entries (localId, title, content, mood, isPrivate, syncStatus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
    [localId, title || null, content, mood || null, isPrivate ? 1 : 0, now, now]
  );

  return {
    localId,
    serverId: null,
    title,
    content,
    mood,
    isPrivate,
    syncStatus: 'PENDING',
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  };
};

export const getJournalEntries = (limit: number = 50): JournalEntry[] => {
  const rows = db.getAllSync<any>(
    `SELECT * FROM journal_entries WHERE isDeleted = 0 ORDER BY createdAt DESC LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    localId: row.localId,
    serverId: row.serverId,
    title: row.title,
    content: row.content,
    mood: row.mood as MoodType | undefined,
    isPrivate: row.isPrivate === 1,
    syncStatus: row.syncStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncedAt: row.syncedAt,
  }));
};

export const updateJournalEntry = (localId: string, content: string, title?: string, mood?: MoodType) => {
  db.runSync(
    `UPDATE journal_entries SET title = ?, content = ?, mood = ?, updatedAt = ?, syncStatus = 'PENDING' WHERE localId = ?`,
    [title || null, content, mood || null, new Date().toISOString(), localId]
  );
};

export const deleteJournalEntry = (localId: string) => {
  db.runSync(`UPDATE journal_entries SET isDeleted = 1, updatedAt = ?, syncStatus = 'PENDING' WHERE localId = ?`, [
    new Date().toISOString(),
    localId,
  ]);
};

// ============== RESOURCES ==============

export const getResources = (limit: number = 50): Resource[] => {
  const rows = db.getAllSync<any>(`SELECT * FROM resources ORDER BY createdAt DESC LIMIT ?`, [limit]);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    content: row.content,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    category: row.category,
    tags: row.tags ? JSON.parse(row.tags) : [],
    offlineAvailable: row.offlineAvailable === 1,
    estimatedMinutes: row.estimatedMinutes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
};

export const getResourceById = (id: string): Resource | null => {
  const row = db.getFirstSync<any>(`SELECT * FROM resources WHERE id = ?`, [id]);

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    content: row.content,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    category: row.category,
    tags: row.tags ? JSON.parse(row.tags) : [],
    offlineAvailable: row.offlineAvailable === 1,
    estimatedMinutes: row.estimatedMinutes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

// ============== CHECK-INS ==============

export const getCheckIns = (limit: number = 50): CheckIn[] => {
  const rows = db.getAllSync<any>(
    `SELECT * FROM check_ins WHERE isDeleted = 0 ORDER BY scheduledFor DESC LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    localId: row.localId,
    serverId: row.serverId,
    scheduledFor: row.scheduledFor,
    completedAt: row.completedAt,
    mood: row.mood as MoodType | undefined,
    responses: row.responses ? JSON.parse(row.responses) : undefined,
    needsAttention: row.needsAttention === 1,
    syncStatus: row.syncStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncedAt: row.syncedAt,
  }));
};

export const completeCheckIn = (localId: string, mood: MoodType, responses?: Record<string, any>) => {
  db.runSync(
    `UPDATE check_ins SET completedAt = ?, mood = ?, responses = ?, updatedAt = ?, syncStatus = 'PENDING' WHERE localId = ?`,
    [new Date().toISOString(), mood, responses ? JSON.stringify(responses) : null, new Date().toISOString(), localId]
  );
};
