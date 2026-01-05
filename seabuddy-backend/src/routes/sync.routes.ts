import express from 'express';
import { eq, and, gt, or } from 'drizzle-orm';
import { db, moodLogs, journalEntries, checkIns, resources, syncMetadata } from '../db/index.js';
import { AuthRequest, SyncRequest, SyncResponse } from '../types/index.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, syncRequestSchema } from '../utils/validation.js';

const router = express.Router();

/**
 * Sync endpoint - handles bidirectional sync for offline-first architecture
 * 
 * Flow:
 * 1. Client sends changes made offline (creates, updates, deletes)
 * 2. Server applies changes using last-write-wins conflict resolution
 * 3. Server sends back changes client doesn't have yet
 * 4. Update sync metadata to track what's been synced
 */
router.post(
  '/',
  validate(syncRequestSchema),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { deviceId, lastSyncAt, changes } = req.body as SyncRequest;
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Start transaction
    const serverChanges: any = {
      moodLogs: [],
      journalEntries: [],
      checkIns: [],
      resources: [],
    };

    // 1. Apply client changes to server (PUSH)
    
    // Apply mood log changes
    if (changes.moodLogs && changes.moodLogs.length > 0) {
      for (const log of changes.moodLogs) {
        // Check if record exists
        const existing = await db.query.moodLogs.findFirst({
          where: eq(moodLogs.id, log.id),
        });

        if (existing) {
          // Update if client version is newer (last-write-wins)
          const clientDate = new Date(log.updatedAt || log.clientCreatedAt);
          const serverDate = new Date(existing.updatedAt);

          if (clientDate > serverDate) {
            await db.update(moodLogs)
              .set({
                ...log,
                tenantId,
                userId,
                syncedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(moodLogs.id, log.id));
          }
        } else {
          // Insert new record
          await db.insert(moodLogs).values({
            ...log,
            tenantId,
            userId,
            syncedAt: new Date(),
          });
        }
      }
    }

    // Apply journal entry changes
    if (changes.journalEntries && changes.journalEntries.length > 0) {
      for (const entry of changes.journalEntries) {
        const existing = await db.query.journalEntries.findFirst({
          where: eq(journalEntries.id, entry.id),
        });

        if (existing) {
          const clientDate = new Date(entry.updatedAt || entry.clientCreatedAt);
          const serverDate = new Date(existing.updatedAt);

          if (clientDate > serverDate) {
            await db.update(journalEntries)
              .set({
                ...entry,
                tenantId,
                userId,
                syncedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(journalEntries.id, entry.id));
          }
        } else {
          await db.insert(journalEntries).values({
            ...entry,
            tenantId,
            userId,
            syncedAt: new Date(),
          });
        }
      }
    }

    // Apply check-in changes
    if (changes.checkIns && changes.checkIns.length > 0) {
      for (const checkIn of changes.checkIns) {
        const existing = await db.query.checkIns.findFirst({
          where: eq(checkIns.id, checkIn.id),
        });

        if (existing) {
          const clientDate = new Date(checkIn.updatedAt || checkIn.clientCreatedAt);
          const serverDate = new Date(existing.updatedAt);

          if (clientDate > serverDate) {
            await db.update(checkIns)
              .set({
                ...checkIn,
                tenantId,
                userId,
                syncedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(checkIns.id, checkIn.id));
          }
        } else {
          await db.insert(checkIns).values({
            ...checkIn,
            tenantId,
            userId,
            syncedAt: new Date(),
          });
        }
      }
    }

    // 2. Get server changes for client (PULL)
    const syncCutoffDate = lastSyncAt ? new Date(lastSyncAt) : new Date(0);

    // Get mood logs updated since last sync
    serverChanges.moodLogs = await db.query.moodLogs.findMany({
      where: and(
        eq(moodLogs.tenantId, tenantId),
        eq(moodLogs.userId, userId),
        gt(moodLogs.updatedAt, syncCutoffDate)
      ),
    });

    // Get journal entries updated since last sync
    serverChanges.journalEntries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.userId, userId),
        gt(journalEntries.updatedAt, syncCutoffDate)
      ),
    });

    // Get check-ins updated since last sync
    serverChanges.checkIns = await db.query.checkIns.findMany({
      where: and(
        eq(checkIns.tenantId, tenantId),
        eq(checkIns.userId, userId),
        gt(checkIns.updatedAt, syncCutoffDate)
      ),
    });

    // Get resources (global + tenant-specific)
    serverChanges.resources = await db.query.resources.findMany({
      where: and(
        or(
          eq(resources.tenantId, tenantId),
          eq(resources.tenantId, null as any)
        ),
        eq(resources.isPublished, true),
        gt(resources.updatedAt, syncCutoffDate)
      ),
    });

    // 3. Update sync metadata
    const now = new Date();
    
    // Update or create sync metadata for each table
    const tables = ['mood_logs', 'journal_entries', 'check_ins', 'resources'];
    
    for (const tableName of tables) {
      const existing = await db.query.syncMetadata.findFirst({
        where: and(
          eq(syncMetadata.tenantId, tenantId),
          eq(syncMetadata.userId, userId),
          eq(syncMetadata.deviceId, deviceId),
          eq(syncMetadata.tableName, tableName)
        ),
      });

      if (existing) {
        await db.update(syncMetadata)
          .set({
            lastSyncedAt: now,
            updatedAt: now,
          })
          .where(eq(syncMetadata.id, existing.id));
      } else {
        await db.insert(syncMetadata).values({
          tenantId,
          userId,
          deviceId,
          tableName,
          lastSyncedAt: now,
        });
      }
    }

    // 4. Send response
    const response: SyncResponse = {
      success: true,
      serverChanges,
      conflicts: [], // We use last-write-wins, so no conflicts
      lastSyncAt: now.toISOString(),
    };

    res.json(response);
  })
);

// Get sync status for a device
router.get(
  '/status',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId is required',
      });
    }

    const metadata = await db.query.syncMetadata.findMany({
      where: and(
        eq(syncMetadata.tenantId, req.tenantId!),
        eq(syncMetadata.userId, req.userId!),
        eq(syncMetadata.deviceId, deviceId as string)
      ),
    });

    res.json({
      success: true,
      data: metadata,
    });
  })
);

export default router;
