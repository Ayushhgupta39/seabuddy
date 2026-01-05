import express from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, moodLogs } from '../db/index.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, createMoodLogSchema } from '../utils/validation.js';

const router = express.Router();

// Create mood log
router.post(
  '/',
  validate(createMoodLogSchema),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { mood, intensity, notes, clientCreatedAt } = req.body;

    const [moodLog] = await db.insert(moodLogs).values({
      tenantId: req.tenantId!,
      userId: req.userId!,
      mood,
      intensity,
      notes,
      clientCreatedAt: new Date(clientCreatedAt),
      syncedAt: new Date(),
    }).returning();

    const response: ApiResponse = {
      success: true,
      data: moodLog,
      message: 'Mood logged successfully',
    };

    res.status(201).json(response);
  })
);

// Get user's mood logs
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await db.query.moodLogs.findMany({
      where: and(
        eq(moodLogs.tenantId, req.tenantId!),
        eq(moodLogs.userId, req.userId!),
        eq(moodLogs.isDeleted, false)
      ),
      orderBy: [desc(moodLogs.createdAt)],
      limit,
      offset,
    });

    const response: ApiResponse = {
      success: true,
      data: logs,
    };

    res.json(response);
  })
);

// Get specific mood log
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const log = await db.query.moodLogs.findFirst({
      where: and(
        eq(moodLogs.id, req.params.id),
        eq(moodLogs.tenantId, req.tenantId!),
        eq(moodLogs.userId, req.userId!)
      ),
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Mood log not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      data: log,
    };

    res.json(response);
  })
);

// Soft delete mood log
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    await db.update(moodLogs)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(moodLogs.id, req.params.id),
          eq(moodLogs.tenantId, req.tenantId!),
          eq(moodLogs.userId, req.userId!)
        )
      );

    const response: ApiResponse = {
      success: true,
      message: 'Mood log deleted successfully',
    };

    res.json(response);
  })
);

export default router;
