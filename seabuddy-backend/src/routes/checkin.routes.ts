import express from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, checkIns } from '../db/index.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { asyncHandler, AppError } from '../middleware/error.js';
import { requireRole } from '../middleware/tenant.js';
import { validate, createCheckInSchema, updateCheckInSchema } from '../utils/validation.js';

const router = express.Router();

// Create check-in (admin only)
router.post(
  '/',
  requireRole('admin', 'psychologist'),
  validate(createCheckInSchema),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { scheduledFor, mood, responses, clientCreatedAt } = req.body;
    const { userId } = req.query;

    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const [checkIn] = await db.insert(checkIns).values({
      tenantId: req.tenantId!,
      userId: userId as string,
      scheduledFor: new Date(scheduledFor),
      mood,
      responses,
      clientCreatedAt: new Date(clientCreatedAt),
      syncedAt: new Date(),
    }).returning();

    const response: ApiResponse = {
      success: true,
      data: checkIn,
      message: 'Check-in created successfully',
    };

    res.status(201).json(response);
  })
);

// Get check-ins (crew sees their own, admins/psychologists see all)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let whereClause;
    if (req.userRole === 'crew') {
      // Crew can only see their own check-ins
      whereClause = and(
        eq(checkIns.tenantId, req.tenantId!),
        eq(checkIns.userId, req.userId!),
        eq(checkIns.isDeleted, false)
      );
    } else {
      // Admins and psychologists see all check-ins in their tenant
      whereClause = and(
        eq(checkIns.tenantId, req.tenantId!),
        eq(checkIns.isDeleted, false)
      );
    }

    const items = await db.query.checkIns.findMany({
      where: whereClause,
      orderBy: [desc(checkIns.scheduledFor)],
      limit,
      offset,
      with: {
        userId: true, // Include user info for admins
      },
    });

    const response: ApiResponse = {
      success: true,
      data: items,
    };

    res.json(response);
  })
);

// Complete a check-in (crew completing their own)
router.patch(
  '/:id/complete',
  validate(updateCheckInSchema),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { mood, responses } = req.body;

    const [updated] = await db.update(checkIns)
      .set({
        completedAt: new Date(),
        mood,
        responses,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(checkIns.id, req.params.id),
          eq(checkIns.tenantId, req.tenantId!),
          eq(checkIns.userId, req.userId!)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Check-in not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      data: updated,
      message: 'Check-in completed successfully',
    };

    res.json(response);
  })
);

// Review a check-in (psychologist only)
router.patch(
  '/:id/review',
  requireRole('psychologist'),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { needsAttention, reviewNotes } = req.body;

    const [updated] = await db.update(checkIns)
      .set({
        needsAttention,
        reviewNotes,
        reviewedBy: req.userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(checkIns.id, req.params.id),
          eq(checkIns.tenantId, req.tenantId!)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Check-in not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      data: updated,
      message: 'Check-in reviewed successfully',
    };

    res.json(response);
  })
);

export default router;
