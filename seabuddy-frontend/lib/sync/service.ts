import NetInfo from '@react-native-community/netinfo';
import db from '../db';
import { api } from '../api/client';
import { getDeviceId } from '../api/config';
import type { MoodLog, JournalEntry, CheckIn, SyncMetadata } from '../types';

/**
 * OFFLINE-FIRST SYNC SERVICE
 *
 * This is the CORE of the offline-first architecture.
 *
 * Flow:
 * 1. Check network connectivity
 * 2. If offline → return (app works fully offline)
 * 3. If online → collect all PENDING records
 * 4. Send to backend in batch
 * 5. Backend responds with server IDs
 * 6. Update local records: serverId + syncStatus = SYNCED
 * 7. Pull server changes and update local DB
 */

class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Start automatic background sync
   * Syncs every 5 minutes when online
   */
  startAutoSync(intervalMs: number = 5 * 60 * 1000) {
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);

    // Also sync on network state change
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isSyncing) {
        console.log('📡 Network connected, triggering sync...');
        this.performSync();
      }
    });

    console.log('🔄 Auto-sync started');
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manual sync trigger
   */
  async performSync(): Promise<{ success: boolean; message: string }> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return { success: false, message: 'No network connection' };
    }

    this.isSyncing = true;

    try {
      console.log('🔄 Starting sync...');

      // 1. PUSH: Collect all pending records
      const pendingMoodLogs = this.getPendingMoodLogs();
      const pendingJournals = this.getPendingJournalEntries();
      const pendingCheckIns = this.getPendingCheckIns();

      console.log(`📤 Pending: ${pendingMoodLogs.length} moods, ${pendingJournals.length} journals, ${pendingCheckIns.length} check-ins`);

      // 2. Get last sync time
      const lastSync = this.getLastSyncTime();

      // 3. Call sync API
      const syncRequest = {
        deviceId: getDeviceId(),
        lastSyncAt: lastSync,
        changes: {
          moodLogs: pendingMoodLogs.map(this.mapToServerFormat),
          journalEntries: pendingJournals.map(this.mapToServerFormat),
          checkIns: pendingCheckIns.map(this.mapToServerFormat),
        },
      };

      console.log('📦 Sync request:', JSON.stringify(syncRequest, null, 2));

      const response = await api.sync(syncRequest);

      if (!response.success) {
        throw new Error('Sync failed on server');
      }

      // 4. PUSH: Update local records with server IDs
      this.updateSyncedRecords('mood_logs', pendingMoodLogs, response.serverChanges.moodLogs || []);
      this.updateSyncedRecords('journal_entries', pendingJournals, response.serverChanges.journalEntries || []);
      this.updateSyncedRecords('check_ins', pendingCheckIns, response.serverChanges.checkIns || []);

      // 5. PULL: Save server changes to local DB
      this.saveServerChanges(response.serverChanges);

      // 6. Update sync metadata
      this.updateSyncMetadata(response.lastSyncAt);

      console.log('✅ Sync completed successfully');

      return { success: true, message: 'Sync completed' };
    } catch (error: any) {
      console.error('❌ Sync failed:', error.message);
      console.error('Error details:', error.response?.data || error);
      return { success: false, message: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get pending mood logs from local DB
   */
  private getPendingMoodLogs(): any[] {
    const result = db.getAllSync<any>(
      `SELECT * FROM mood_logs WHERE syncStatus = 'PENDING' AND isDeleted = 0`
    );
    return result;
  }

  /**
   * Get pending journal entries from local DB
   */
  private getPendingJournalEntries(): any[] {
    const result = db.getAllSync<any>(
      `SELECT * FROM journal_entries WHERE syncStatus = 'PENDING' AND isDeleted = 0`
    );
    return result;
  }

  /**
   * Get pending check-ins from local DB
   */
  private getPendingCheckIns(): any[] {
    const result = db.getAllSync<any>(
      `SELECT * FROM check_ins WHERE syncStatus = 'PENDING' AND isDeleted = 0`
    );
    return result;
  }

  /**
   * Map local record to server format
   */
  private mapToServerFormat(record: any) {
    return {
      id: record.serverId || record.localId, // Use serverId if exists, else localId
      mood: record.mood,
      intensity: record.intensity,
      notes: record.notes,
      title: record.title,
      content: record.content,
      isPrivate: record.isPrivate === 1,
      clientCreatedAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Update local records after successful sync
   * CRITICAL: This links local records to server records
   */
  private updateSyncedRecords(tableName: string, localRecords: any[], serverRecords: any[]) {
    localRecords.forEach((localRecord) => {
      // Find matching server record (by localId initially)
      const serverRecord = serverRecords.find(
        (sr: any) => sr.id === localRecord.serverId || sr.clientCreatedAt === localRecord.createdAt
      );

      if (serverRecord) {
        const query = `UPDATE ${tableName} SET serverId = ?, syncStatus = 'SYNCED', syncedAt = ? WHERE localId = ?`;
        db.runSync(query, [serverRecord.id, new Date().toISOString(), localRecord.localId]);
      }
    });
  }

  /**
   * Save server changes to local database
   */
  private saveServerChanges(serverChanges: any) {
    // Save mood logs
    if (serverChanges.moodLogs) {
      serverChanges.moodLogs.forEach((log: any) => {
        this.upsertMoodLog(log);
      });
    }

    // Save journal entries
    if (serverChanges.journalEntries) {
      serverChanges.journalEntries.forEach((entry: any) => {
        this.upsertJournalEntry(entry);
      });
    }

    // Save resources
    if (serverChanges.resources) {
      serverChanges.resources.forEach((resource: any) => {
        this.upsertResource(resource);
      });
    }

    // Save check-ins
    if (serverChanges.checkIns) {
      serverChanges.checkIns.forEach((checkIn: any) => {
        this.upsertCheckIn(checkIn);
      });
    }
  }

  /**
   * Upsert mood log (update if exists, insert if not)
   */
  private upsertMoodLog(log: any) {
    const existing = db.getFirstSync(`SELECT localId FROM mood_logs WHERE serverId = ?`, [log.id]);

    if (existing) {
      db.runSync(
        `UPDATE mood_logs SET mood = ?, intensity = ?, notes = ?, updatedAt = ?, syncStatus = 'SYNCED' WHERE serverId = ?`,
        [log.mood, log.intensity, log.notes, log.updatedAt, log.id]
      );
    } else {
      db.runSync(
        `INSERT INTO mood_logs (localId, serverId, mood, intensity, notes, syncStatus, createdAt, updatedAt, syncedAt)
         VALUES (?, ?, ?, ?, ?, 'SYNCED', ?, ?, ?)`,
        [log.id, log.id, log.mood, log.intensity, log.notes, log.createdAt, log.updatedAt, new Date().toISOString()]
      );
    }
  }

  /**
   * Upsert journal entry
   */
  private upsertJournalEntry(entry: any) {
    const existing = db.getFirstSync(`SELECT localId FROM journal_entries WHERE serverId = ?`, [entry.id]);

    if (existing) {
      db.runSync(
        `UPDATE journal_entries SET title = ?, content = ?, mood = ?, updatedAt = ?, syncStatus = 'SYNCED' WHERE serverId = ?`,
        [entry.title, entry.content, entry.mood, entry.updatedAt, entry.id]
      );
    } else {
      db.runSync(
        `INSERT INTO journal_entries (localId, serverId, title, content, mood, isPrivate, syncStatus, createdAt, updatedAt, syncedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'SYNCED', ?, ?, ?)`,
        [entry.id, entry.id, entry.title, entry.content, entry.mood, entry.isPrivate ? 1 : 0, entry.createdAt, entry.updatedAt, new Date().toISOString()]
      );
    }
  }

  /**
   * Upsert resource
   */
  private upsertResource(resource: any) {
    db.runSync(
      `INSERT OR REPLACE INTO resources (id, title, description, type, content, url, thumbnailUrl, category, tags, offlineAvailable, estimatedMinutes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resource.id,
        resource.title,
        resource.description,
        resource.type,
        resource.content,
        resource.url,
        resource.thumbnailUrl,
        resource.category,
        JSON.stringify(resource.tags),
        resource.offlineAvailable ? 1 : 0,
        resource.estimatedMinutes,
        resource.createdAt,
        resource.updatedAt,
      ]
    );
  }

  /**
   * Upsert check-in
   */
  private upsertCheckIn(checkIn: any) {
    const existing = db.getFirstSync(`SELECT localId FROM check_ins WHERE serverId = ?`, [checkIn.id]);

    if (existing) {
      db.runSync(
        `UPDATE check_ins SET scheduledFor = ?, completedAt = ?, mood = ?, responses = ?, updatedAt = ?, syncStatus = 'SYNCED' WHERE serverId = ?`,
        [checkIn.scheduledFor, checkIn.completedAt, checkIn.mood, JSON.stringify(checkIn.responses), checkIn.updatedAt, checkIn.id]
      );
    } else {
      db.runSync(
        `INSERT INTO check_ins (localId, serverId, scheduledFor, completedAt, mood, responses, needsAttention, syncStatus, createdAt, updatedAt, syncedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, ?, ?)`,
        [
          checkIn.id,
          checkIn.id,
          checkIn.scheduledFor,
          checkIn.completedAt,
          checkIn.mood,
          JSON.stringify(checkIn.responses),
          checkIn.needsAttention ? 1 : 0,
          checkIn.createdAt,
          checkIn.updatedAt,
          new Date().toISOString(),
        ]
      );
    }
  }

  /**
   * Get last sync time
   */
  private getLastSyncTime(): string | undefined {
    const result = db.getFirstSync<any>(`SELECT lastSyncedAt FROM sync_metadata ORDER BY lastSyncedAt DESC LIMIT 1`);
    return result?.lastSyncedAt;
  }

  /**
   * Update sync metadata
   */
  private updateSyncMetadata(timestamp: string) {
    db.runSync(
      `INSERT OR REPLACE INTO sync_metadata (tableName, lastSyncedAt, deviceId) VALUES ('global', ?, ?)`,
      [timestamp, getDeviceId()]
    );
  }

  /**
   * Get sync status for UI
   */
  getSyncStatus(): SyncMetadata[] {
    const moodCount = db.getFirstSync<any>(`SELECT COUNT(*) as count FROM mood_logs WHERE syncStatus = 'PENDING'`);
    const journalCount = db.getFirstSync<any>(`SELECT COUNT(*) as count FROM journal_entries WHERE syncStatus = 'PENDING'`);
    const checkInCount = db.getFirstSync<any>(`SELECT COUNT(*) as count FROM check_ins WHERE syncStatus = 'PENDING'`);
    const lastSync = this.getLastSyncTime();

    return [
      { tableName: 'mood_logs', lastSyncedAt: lastSync || 'Never', pendingCount: moodCount?.count || 0 },
      { tableName: 'journal_entries', lastSyncedAt: lastSync || 'Never', pendingCount: journalCount?.count || 0 },
      { tableName: 'check_ins', lastSyncedAt: lastSync || 'Never', pendingCount: checkInCount?.count || 0 },
    ];
  }
}

export const syncService = new SyncService();
export default syncService;
