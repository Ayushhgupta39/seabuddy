import express from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, journalEntries } from '../db/index.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, createJournalEntrySchema, updateJournalEntrySchema } from '../utils/validation.js';

const router = express.Router();

// Create journal entry
router.post(
  '/',
  validate(createJournalEntrySchema),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { title, content, mood, isPrivate, clientCreatedAt } = req.body;

    const [entry] = await db.insert(journalEntries).values({
      tenantId: req.tenantId!,
      userId: req.userId!,
      title,
      content,
      mood,
      isPrivate: isPrivate ?? true,
      clientCreatedAt: new Date(clientCreatedAt),
      syncedAt: new Date(),
    }).returning();

    const response: ApiResponse = {
      success: true,
      data: entry,
      message: 'Journal entry created successfully',
    };

    res.status(201).json(response);
  })
);

// Get user's journal entries
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const entries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.tenantId, req.tenantId!),
        eq(journalEntries.userId, req.userId!),
        eq(journalEntries.isDeleted, false)
      ),
      orderBy: [desc(journalEntries.createdAt)],
      limit,
      offset,
    });

    const response: ApiResponse = {
      success: true,
      data: entries,
    };

    res.json(response);
  })
);

// Get specific journal entry
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const entry = await db.query.journalEntries.findFirst({
      where: and(
        eq(journalEntries.id, req.params.id),
        eq(journalEntries.tenantId, req.tenantId!),
        eq(journalEntries.userId, req.userId!)
      ),
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      data: entry,
    };

    res.json(response);
  })
);

// Update journal entry
router.patch(
  '/:id',
  validate(updateJournalEntrySchema),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { title, content, mood } = req.body;

    const [updated] = await db.update(journalEntries)
      .set({
        title,
        content,
        mood,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(journalEntries.id, req.params.id),
          eq(journalEntries.tenantId, req.tenantId!),
          eq(journalEntries.userId, req.userId!)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      data: updated,
      message: 'Journal entry updated successfully',
    };

    res.json(response);
  })
);

// Soft delete journal entry
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    await db.update(journalEntries)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(journalEntries.id, req.params.id),
          eq(journalEntries.tenantId, req.tenantId!),
          eq(journalEntries.userId, req.userId!)
        )
      );

    const response: ApiResponse = {
      success: true,
      message: 'Journal entry deleted successfully',
    };

    res.json(response);
  })
);

export default router;
