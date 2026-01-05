# SeaBuddy Mobile App 🚢

Offline-first React Native mobile app for crew well-being on ships.

## Quick Start

```bash
# Install dependencies
npm install

# Start backend first (in another terminal)
cd ../seabuddy-backend && npm run dev

# Start mobile app
npm start
```

Then press `i` for iOS or `a` for Android

## Key Features

✅ **Fully Offline-First** - Works without internet, syncs when available
✅ **Mood Tracking** - Quick emoji-based mood logging
✅ **Private Journal** - Secure personal journaling
✅ **Mental Health Resources** - Articles, exercises, and videos
✅ **Auto Sync** - Background sync with visual status indicators

## Architecture Highlights

**Local Database** (SQLite)
- `localId` → generated on device
- `serverId` → from backend (null until synced)
- `syncStatus` → PENDING | SYNCED | ERROR

**Sync Service** (`lib/sync/service.ts`)
- Network detection with auto-sync
- Batch pending changes
- Last-write-wins conflict resolution
- Updates local records with server IDs

**State Management** (Zustand)
- Lightweight, performant
- TypeScript-first
- React hooks integration

## Testing Offline Mode

1. Enable Airplane Mode on device/simulator
2. Create mood logs and journal entries
3. See "Pending" badges appear
4. Disable Airplane Mode
5. Pull to refresh
6. Watch data sync automatically!

## Project Structure

```
lib/
├── db/          # SQLite database + CRUD
├── api/         # Backend API client
├── sync/        # Offline sync service (THE CORE)
├── store/       # Zustand state management
└── types/       # TypeScript definitions

app/(tabs)/
├── index.tsx    # Mood tracking
└── explore.tsx  # Journal & resources
```

## How It Works

```
User Action → SQLite (PENDING) → UI Update
                 ↓
            Network Online?
                 ↓
            Sync Service
                 ↓
            Backend API
                 ↓
        Update serverId → SYNCED
```

See full documentation in comments throughout the codebase!

## License

Proprietary - All rights reserved
