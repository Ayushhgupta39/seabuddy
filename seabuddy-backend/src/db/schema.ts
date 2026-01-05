import { pgTable, text, timestamp, uuid, varchar, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';

// Tenants - Shipping Companies
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User Roles: 'crew', 'admin', 'psychologist'
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('crew'), // crew, admin, psychologist
  shipName: varchar('ship_name', { length: 255 }), // which ship they're on (for crew)
  isActive: boolean('is_active').notNull().default(true),
  lastSyncAt: timestamp('last_sync_at'), // when they last synced
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantEmailIdx: index('users_tenant_email_idx').on(table.tenantId, table.email),
  tenantIdIdx: index('users_tenant_id_idx').on(table.tenantId),
}));

// Mood Logs
export const moodLogs = pgTable('mood_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mood: varchar('mood', { length: 50 }).notNull(), // e.g., 'great', 'good', 'okay', 'bad', 'terrible'
  intensity: integer('intensity'), // 1-10 scale
  notes: text('notes'),
  // Offline sync fields
  clientCreatedAt: timestamp('client_created_at').notNull(), // when created on device
  createdAt: timestamp('created_at').notNull().defaultNow(), // when received by server
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at'), // when synced to server
  isDeleted: boolean('is_deleted').notNull().default(false), // soft delete for sync
}, (table) => ({
  tenantUserIdx: index('mood_logs_tenant_user_idx').on(table.tenantId, table.userId),
  createdAtIdx: index('mood_logs_created_at_idx').on(table.createdAt),
}));

// Journal Entries
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }),
  content: text('content').notNull(),
  mood: varchar('mood', { length: 50 }), // optional mood association
  isPrivate: boolean('is_private').notNull().default(true), // always private unless shared
  // Offline sync fields
  clientCreatedAt: timestamp('client_created_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at'),
  isDeleted: boolean('is_deleted').notNull().default(false),
}, (table) => ({
  tenantUserIdx: index('journal_entries_tenant_user_idx').on(table.tenantId, table.userId),
  createdAtIdx: index('journal_entries_created_at_idx').on(table.createdAt),
}));

// Mental Health Resources (articles, exercises, videos)
export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // null = global resource
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'article', 'video', 'exercise', 'audio'
  content: text('content'), // markdown content for articles
  url: varchar('url', { length: 1000 }), // external URL if applicable
  thumbnailUrl: varchar('thumbnail_url', { length: 1000 }),
  category: varchar('category', { length: 100 }), // 'stress', 'anxiety', 'sleep', 'mindfulness', etc.
  tags: text('tags').array(), // searchable tags
  offlineAvailable: boolean('offline_available').notNull().default(true), // can be downloaded
  estimatedMinutes: integer('estimated_minutes'), // reading/watching time
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('resources_tenant_idx').on(table.tenantId),
  categoryIdx: index('resources_category_idx').on(table.category),
}));

// Check-ins (scheduled wellness checks for crew)
export const checkIns = pgTable('check_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scheduledFor: timestamp('scheduled_for').notNull(), // when the check-in is due
  completedAt: timestamp('completed_at'), // when user completed it
  mood: varchar('mood', { length: 50 }),
  responses: jsonb('responses'), // flexible JSON for questionnaire responses
  needsAttention: boolean('needs_attention').notNull().default(false), // flag for psychologist review
  reviewedBy: uuid('reviewed_by').references(() => users.id), // psychologist who reviewed
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  // Offline sync fields
  clientCreatedAt: timestamp('client_created_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at'),
  isDeleted: boolean('is_deleted').notNull().default(false),
}, (table) => ({
  tenantUserIdx: index('check_ins_tenant_user_idx').on(table.tenantId, table.userId),
  scheduledForIdx: index('check_ins_scheduled_for_idx').on(table.scheduledFor),
  needsAttentionIdx: index('check_ins_needs_attention_idx').on(table.needsAttention),
}));

// Sync Metadata (tracks what data each user has synced)
export const syncMetadata = pgTable('sync_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId: varchar('device_id', { length: 255 }).notNull(), // unique device identifier
  tableName: varchar('table_name', { length: 100 }).notNull(), // which table was synced
  lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
  lastRecordId: uuid('last_record_id'), // last record that was synced
  syncCursor: text('sync_cursor'), // cursor for pagination
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantUserDeviceIdx: index('sync_metadata_tenant_user_device_idx').on(table.tenantId, table.userId, table.deviceId),
}));

// Type exports for TypeScript
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type MoodLog = typeof moodLogs.$inferSelect;
export type NewMoodLog = typeof moodLogs.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;

export type CheckIn = typeof checkIns.$inferSelect;
export type NewCheckIn = typeof checkIns.$inferInsert;

export type SyncMetadata = typeof syncMetadata.$inferSelect;
export type NewSyncMetadata = typeof syncMetadata.$inferInsert;
