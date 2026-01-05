import { z } from 'zod';

// Mood Log Validation
export const createMoodLogSchema = z.object({
  mood: z.enum(['great', 'good', 'okay', 'bad', 'terrible']),
  intensity: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
  clientCreatedAt: z.string().datetime(),
});

export const updateMoodLogSchema = createMoodLogSchema.partial();

// Journal Entry Validation
export const createJournalEntrySchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().min(1),
  mood: z.enum(['great', 'good', 'okay', 'bad', 'terrible']).optional(),
  isPrivate: z.boolean().default(true),
  clientCreatedAt: z.string().datetime(),
});

export const updateJournalEntrySchema = createJournalEntrySchema.partial();

// Check-in Validation
export const createCheckInSchema = z.object({
  scheduledFor: z.string().datetime(),
  mood: z.enum(['great', 'good', 'okay', 'bad', 'terrible']).optional(),
  responses: z.record(z.any()).optional(),
  clientCreatedAt: z.string().datetime(),
});

export const updateCheckInSchema = z.object({
  completedAt: z.string().datetime().optional(),
  mood: z.enum(['great', 'good', 'okay', 'bad', 'terrible']).optional(),
  responses: z.record(z.any()).optional(),
  needsAttention: z.boolean().optional(),
});

// Sync Validation
export const syncRequestSchema = z.object({
  deviceId: z.string().uuid(),
  lastSyncAt: z.string().datetime().optional(),
  changes: z.object({
    moodLogs: z.array(z.any()).optional(),
    journalEntries: z.array(z.any()).optional(),
    checkIns: z.array(z.any()).optional(),
  }),
});

// Validation middleware helper
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};
