import express from 'express';
import { eq, and, or, isNull, desc } from 'drizzle-orm';
import { db, resources } from '../db/index.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { asyncHandler } from '../middleware/error.js';
import { requireRole } from '../middleware/tenant.js';

const router = express.Router();

// Get all available resources (global + tenant-specific)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const category = req.query.category as string;
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let whereClause = and(
      eq(resources.isPublished, true),
      or(
        eq(resources.tenantId, req.tenantId!),
        isNull(resources.tenantId) // Global resources
      )
    );

    // Add filters if provided
    if (category) {
      whereClause = and(whereClause, eq(resources.category, category));
    }
    if (type) {
      whereClause = and(whereClause, eq(resources.type, type));
    }

    const items = await db.query.resources.findMany({
      where: whereClause,
      orderBy: [desc(resources.createdAt)],
      limit,
      offset,
    });

    const response: ApiResponse = {
      success: true,
      data: items,
    };

    res.json(response);
  })
);

// Get specific resource
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.id, req.params.id),
        eq(resources.isPublished, true),
        or(
          eq(resources.tenantId, req.tenantId!),
          isNull(resources.tenantId)
        )
      ),
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      data: resource,
    };

    res.json(response);
  })
);

// Create resource (admin only)
router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const {
      title,
      description,
      type,
      content,
      url,
      thumbnailUrl,
      category,
      tags,
      offlineAvailable,
      estimatedMinutes,
    } = req.body;

    const [resource] = await db.insert(resources).values({
      tenantId: req.tenantId!,
      title,
      description,
      type,
      content,
      url,
      thumbnailUrl,
      category,
      tags,
      offlineAvailable: offlineAvailable ?? true,
      estimatedMinutes,
      isPublished: true,
    }).returning();

    const response: ApiResponse = {
      success: true,
      data: resource,
      message: 'Resource created successfully',
    };

    res.status(201).json(response);
  })
);

// Update resource (admin only)
router.patch(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const updates = req.body;

    const [updated] = await db.update(resources)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(resources.id, req.params.id),
          eq(resources.tenantId, req.tenantId!)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      data: updated,
      message: 'Resource updated successfully',
    };

    res.json(response);
  })
);

// Delete resource (admin only)
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    await db.delete(resources)
      .where(
        and(
          eq(resources.id, req.params.id),
          eq(resources.tenantId, req.tenantId!)
        )
      );

    const response: ApiResponse = {
      success: true,
      message: 'Resource deleted successfully',
    };

    res.json(response);
  })
);

export default router;
