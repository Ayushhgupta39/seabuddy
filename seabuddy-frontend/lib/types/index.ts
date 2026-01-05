// Sync status for offline-first records
export type SyncStatus = 'PENDING' | 'SYNCED' | 'ERROR';

// Base interface for all offline-first records
export interface OfflineRecord {
  localId: string;        // UUID generated on device
  serverId: string | null; // UUID from backend, null until synced
  syncStatus: SyncStatus;
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
  syncedAt: string | null; // ISO timestamp when last synced
}

// Mood Log
export type MoodType = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export interface MoodLog extends OfflineRecord {
  mood: MoodType;
  intensity?: number; // 1-10
  notes?: string;
}

// Journal Entry
export interface JournalEntry extends OfflineRecord {
  title?: string;
  content: string;
  mood?: MoodType;
  isPrivate: boolean;
}

// Resource
export interface Resource {
  id: string; // Always from server
  title: string;
  description?: string;
  type: 'article' | 'video' | 'exercise' | 'audio';
  content?: string;
  url?: string;
  thumbnailUrl?: string;
  category?: string;
  tags?: string[];
  offlineAvailable: boolean;
  estimatedMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

// Check-in
export interface CheckIn extends OfflineRecord {
  scheduledFor: string;
  completedAt?: string;
  mood?: MoodType;
  responses?: Record<string, any>;
  needsAttention: boolean;
}

// Sync metadata
export interface SyncMetadata {
  tableName: string;
  lastSyncedAt: string;
  pendingCount: number;
}

// API types
export interface SyncRequest {
  deviceId: string;
  lastSyncAt?: string;
  changes: {
    moodLogs?: MoodLog[];
    journalEntries?: JournalEntry[];
    checkIns?: CheckIn[];
  };
}

export interface SyncResponse {
  success: boolean;
  serverChanges: {
    moodLogs?: MoodLog[];
    journalEntries?: JournalEntry[];
    checkIns?: CheckIn[];
    resources?: Resource[];
  };
  conflicts?: any[];
  lastSyncAt: string;
}
