import { Request } from 'express';

// Extend Express Request to include tenant and user info
export interface AuthRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRole?: 'crew' | 'admin' | 'psychologist';
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Sync request payload
export interface SyncRequest {
  deviceId: string;
  lastSyncAt?: string;
  changes: {
    moodLogs?: any[];
    journalEntries?: any[];
    checkIns?: any[];
  };
}

// Sync response payload
export interface SyncResponse {
  success: boolean;
  serverChanges: {
    moodLogs?: any[];
    journalEntries?: any[];
    checkIns?: any[];
    resources?: any[];
  };
  conflicts?: any[];
  lastSyncAt: string;
}
