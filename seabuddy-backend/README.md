# SeaBuddy Backend

Multi-tenant crew well-being app backend with offline-first architecture for ships.

## Features

- **Multi-tenant isolation**: Complete data separation between shipping companies
- **Offline-first sync**: Last-write-wins conflict resolution for unreliable internet
- **Full feature suite**:
  - Mood tracking
  - Private journal entries
  - Mental health resources library
  - Scheduled check-ins with psychologist review
  - Bidirectional sync for offline data
- **Type-safe**: Built with TypeScript and Drizzle ORM
- **Secure**: Row-level tenant isolation, role-based access control
- **Production-ready**: Error handling, validation, health checks

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **Dev Tools**: tsx for hot-reload development

## Project Structure

```
src/
├── db/
│   ├── schema.ts       # Database schema (7 tables)
│   ├── index.ts        # Database connection
│   └── migrate.ts      # Migration runner
├── middleware/
│   ├── tenant.ts       # Multi-tenant isolation & RBAC
│   └── error.ts        # Error handling
├── routes/
│   ├── mood.routes.ts      # Mood tracking endpoints
│   ├── journal.routes.ts   # Journal entry endpoints
│   ├── checkin.routes.ts   # Check-in endpoints
│   ├── resources.routes.ts # Mental health resources
│   └── sync.routes.ts      # Offline sync endpoint
├── types/
│   └── index.ts        # TypeScript types
├── utils/
│   └── validation.ts   # Zod validation schemas
├── app.ts              # Express app setup
└── server.ts           # Server entry point
```

## Database Schema

### Core Tables

1. **tenants** - Shipping companies
2. **users** - Crew members, admins, psychologists (with roles)
3. **mood_logs** - Mood tracking entries
4. **journal_entries** - Private journal entries
5. **resources** - Mental health resources (articles, videos, exercises)
6. **check_ins** - Scheduled wellness checks
7. **sync_metadata** - Tracks sync state per device

All tables include offline-first fields:
- `clientCreatedAt` - when created on device
- `syncedAt` - when synced to server
- `isDeleted` - soft delete for sync
- `updatedAt` - for last-write-wins conflict resolution

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/seabuddy
```

### 3. Set up PostgreSQL Database

Create a new PostgreSQL database:

```bash
# Using psql
psql -U postgres
CREATE DATABASE seabuddy;
\q

# Or using Docker
docker run --name seabuddy-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=seabuddy \
  -p 5432:5432 \
  -d postgres:16
```

### 4. Run Migrations

Generate and run database migrations:

```bash
# Generate migrations (already done)
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:4000`

## API Endpoints

### Health Check

```
GET /health
```

### Mood Tracking

```
POST   /api/moods          # Create mood log
GET    /api/moods          # Get user's mood logs
GET    /api/moods/:id      # Get specific mood log
DELETE /api/moods/:id      # Delete mood log (soft delete)
```

### Journal Entries

```
POST   /api/journal        # Create journal entry
GET    /api/journal        # Get user's journal entries
GET    /api/journal/:id    # Get specific entry
PATCH  /api/journal/:id    # Update entry
DELETE /api/journal/:id    # Delete entry (soft delete)
```

### Check-ins

```
POST   /api/checkins                  # Create check-in (admin/psychologist)
GET    /api/checkins                  # Get check-ins
PATCH  /api/checkins/:id/complete     # Complete check-in (crew)
PATCH  /api/checkins/:id/review       # Review check-in (psychologist)
```

### Resources

```
GET    /api/resources        # Get all resources
GET    /api/resources/:id    # Get specific resource
POST   /api/resources        # Create resource (admin)
PATCH  /api/resources/:id    # Update resource (admin)
DELETE /api/resources/:id    # Delete resource (admin)
```

### Sync (Offline-first)

```
POST   /api/sync          # Bidirectional sync
GET    /api/sync/status   # Get sync status for device
```

## Sync API Usage

The sync endpoint handles offline-first synchronization:

### Request

```json
POST /api/sync
{
  "deviceId": "uuid-of-device",
  "lastSyncAt": "2024-01-01T00:00:00Z", // optional
  "changes": {
    "moodLogs": [/* logs created offline */],
    "journalEntries": [/* entries created offline */],
    "checkIns": [/* check-ins completed offline */]
  }
}
```

### Response

```json
{
  "success": true,
  "serverChanges": {
    "moodLogs": [/* new logs from server */],
    "journalEntries": [/* new entries from server */],
    "checkIns": [/* new check-ins from server */],
    "resources": [/* new resources from server */]
  },
  "conflicts": [],
  "lastSyncAt": "2024-01-01T12:00:00Z"
}
```

## Authentication (Coming Soon)

Currently uses hardcoded tenant/user IDs for development. Production will use:

- JWT-based authentication
- Tokens extracted from `Authorization: Bearer <token>` header
- Tenant and user info extracted from JWT payload
- Password hashing with bcrypt
- Refresh token rotation

## Role-Based Access Control

Three user roles:

1. **crew** - Can manage their own mood logs, journal entries, complete check-ins
2. **admin** - Can create resources, schedule check-ins, view analytics
3. **psychologist** - Can review check-ins, access crew data with consent

## Multi-Tenancy

All data is isolated by `tenant_id`:

- Every table has a `tenant_id` column
- Middleware automatically filters all queries by tenant
- No cross-tenant data access possible
- Each shipping company is completely isolated

## Offline-First Architecture

### Conflict Resolution: Last-Write-Wins

When syncing:
1. Client sends changes made offline
2. Server compares `updatedAt` timestamps
3. Most recent change wins
4. Server sends back any newer data
5. Sync metadata tracks what's been synced per device

### Soft Deletes

Records are never hard-deleted, only marked `isDeleted = true`:
- Enables sync of deletions made offline
- Client can purge old deleted records periodically

## Development

### Run in Development Mode

```bash
npm run dev
```

Uses `tsx watch` for hot-reload on file changes.

### Build for Production

```bash
npm run build
npm start
```

### Database Tools

```bash
# Generate new migrations after schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Next Steps

1. **Set up PostgreSQL** and run migrations
2. **Test endpoints** using the health check
3. **Implement JWT authentication** (replace hardcoded tenant middleware)
4. **Connect to frontend** (React Native app)
5. **Deploy to production** (consider using Cloudflare Workers for API Gateway)
6. **Add data encryption at rest** for sensitive mental health data
7. **Implement rate limiting** and security headers
8. **Set up monitoring** and logging

## Security Considerations

- [ ] Implement JWT authentication
- [ ] Hash sensitive data before storage
- [ ] Enable HTTPS in production
- [ ] Add rate limiting
- [ ] Implement CSRF protection
- [ ] Add security headers (helmet)
- [ ] Set up data encryption at rest
- [ ] Implement audit logging
- [ ] Regular security audits
- [ ] GDPR/HIPAA compliance for mental health data

## License

Proprietary - All rights reserved
