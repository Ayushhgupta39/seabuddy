import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import type { MoodLog, JournalEntry, Resource, CheckIn, SyncMetadata } from '../types';
import * as ops from '../db/operations';
import syncService from '../sync/service';

interface AppState {
  // Network status
  isOnline: boolean;
  isSyncing: boolean;

  // Data
  moodLogs: MoodLog[];
  journalEntries: JournalEntry[];
  resources: Resource[];
  checkIns: CheckIn[];
  syncStatus: SyncMetadata[];

  // Actions
  initialize: () => void;
  loadMoodLogs: () => void;
  loadJournalEntries: () => void;
  loadResources: () => void;
  loadCheckIns: () => void;
  createMoodLog: (mood: any, intensity?: number, notes?: string) => void;
  createJournalEntry: (content: string, title?: string, mood?: any) => void;
  deleteJournalEntry: (localId: string) => void;
  performSync: () => Promise<void>;
  refreshSyncStatus: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  isOnline: true,
  isSyncing: false,
  moodLogs: [],
  journalEntries: [],
  resources: [],
  checkIns: [],
  syncStatus: [],

  // Initialize app
  initialize: () => {
    // Monitor network status
    NetInfo.addEventListener((state) => {
      set({ isOnline: state.isConnected || false });
    });

    // Load initial data
    get().loadMoodLogs();
    get().loadJournalEntries();
    get().loadResources();
    get().loadCheckIns();
    get().refreshSyncStatus();

    // Start auto-sync
    syncService.startAutoSync();
  },

  // Load mood logs from local DB
  loadMoodLogs: () => {
    const logs = ops.getMoodLogs();
    set({ moodLogs: logs });
  },

  // Load journal entries from local DB
  loadJournalEntries: () => {
    const entries = ops.getJournalEntries();
    set({ journalEntries: entries });
  },

  // Load resources from local DB
  loadResources: () => {
    const resources = ops.getResources();
    set({ resources });
  },

  // Load check-ins from local DB
  loadCheckIns: () => {
    const checkIns = ops.getCheckIns();
    set({ checkIns });
  },

  // Create mood log (offline-first)
  createMoodLog: (mood, intensity, notes) => {
    ops.createMoodLog(mood, intensity, notes);
    get().loadMoodLogs();
    get().refreshSyncStatus();
  },

  // Create journal entry (offline-first)
  createJournalEntry: (content, title, mood) => {
    ops.createJournalEntry(content, title, mood);
    get().loadJournalEntries();
    get().refreshSyncStatus();
  },

  // Delete journal entry
  deleteJournalEntry: (localId) => {
    ops.deleteJournalEntry(localId);
    get().loadJournalEntries();
    get().refreshSyncStatus();
  },

  // Perform manual sync
  performSync: async () => {
    if (get().isSyncing) return;

    set({ isSyncing: true });

    try {
      await syncService.performSync();

      // Reload data after sync
      get().loadMoodLogs();
      get().loadJournalEntries();
      get().loadResources();
      get().loadCheckIns();
      get().refreshSyncStatus();
    } finally {
      set({ isSyncing: false });
    }
  },

  // Refresh sync status
  refreshSyncStatus: () => {
    const status = syncService.getSyncStatus();
    set({ syncStatus: status });
  },
}));
