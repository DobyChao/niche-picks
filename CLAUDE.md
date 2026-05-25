# 小众点评 (Xiaozhong Review)

Private shop review app — a small team shares restaurant/shop discoveries with location-based map, offline-first editing, and admin approval workflow.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4
- **Client DB**: Dexie (IndexedDB) — offline-first, reactive queries via `useLiveQuery`
- **Server DB**: better-sqlite3 (SQLite, WAL mode)
- **Map**: AMap JS API 2.0 (高德地图), proxied through `/_AMapService` rewrite → `/api/amap/proxy/[...path]`
- **Testing**: Playwright E2E
- **Deployment**: systemd service (`xiaozhong-review`) on port 8088, nginx reverse proxy with HTTPS (xzdp.zigzagk.top)

## Commands

```bash
npm run dev        # dev server (port 3000)
npm run build      # production build
npm run start      # production server (port 8088)
npx playwright test # E2E tests
sudo systemctl restart xiaozhong-review  # restart production
sudo journalctl -u xiaozhong-review -f   # production logs
```

## Architecture

### Dual-Bucket Offline-First Sync

All data lives in the browser's IndexedDB via Dexie. There are two "buckets":

- **Bucket A** (`localShops`, `localReviews`): server data clones, replaced wholesale on pull. No sync metadata.
- **Bucket B** (`shopChanges`, `reviewChanges`): local change snapshots. Each row is a full entity snapshot with `status` (draft/pending) and `syncId`.

**Merge reads** (getMergedShops, getMergedShop, etc.) return Bucket B data if present, falling back to Bucket A. Computed fields (avgRating, reviewCount, avgPrice) are aggregated from merged reviews at read time.

**Sync flow**:
1. User edits create/change rows in Bucket B with `status: 'draft'`
2. Push collects all drafts, compares against Bucket A to determine create/update/delete actions, POSTs to `/api/sync/push`, marks changes as `pending`
3. Pull fetches from `/api/sync/pull`, replaces Bucket A entirely, garbage-collects Bucket B entries whose batches are no longer pending
4. Admin reviews pending batches via `/admin`, approves or rejects

### Coordinate System

AMap uses GCJ-02 (国测局坐标). Browser GPS returns WGS-84. The app converts with `AMap.convertFrom(coords, 'gps')` and falls back to `AMap.CitySearch` (IP-based). The AMap proxy detects JSONP requests (`callback` param) and returns `application/javascript` MIME type.

### Key Environment Variables

- `ADMIN_TOKEN` — admin authentication secret
- `AMAP_SECURITY_CODE` — AMap JS API security code (jscode)
- `SYNC_TOKEN` — optional, restricts pull access (not currently used)

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home — map + sidebar (shop list/detail/review/edit)
│   ├── sync/page.tsx         # Sync management — push/pull + change queue
│   ├── admin/page.tsx        # Admin — token management + approval queue
│   ├── identity/page.tsx     # Sync identity setup (token + author name)
│   ├── layout.tsx            # Root layout — NavHeader + main (responsive scroll)
│   ├── globals.css           # Tailwind v4 config + CSS variables
│   └── api/
│       ├── sync/pull/route.ts   # GET — returns shops/reviews/removed syncIds
│       ├── sync/push/route.ts   # POST — receives change batches, stores as pending
│       ├── admin/
│       │   ├── pending/route.ts       # GET pending sync batches
│       │   ├── approve/route.ts       # POST — apply changes to DB, remove pending
│       │   ├── reject/route.ts        # POST — discard pending batch
│       │   └── generate-token/route.ts # GET/POST/DELETE user invite tokens
│       └── amap/proxy/[...path]/route.ts  # AMap API proxy (handles JSONP)
├── components/
│   ├── map/
│   │   ├── MapView.tsx       # AMap init, markers (colored SVG pins), InfoWindow, viewport persistence, geolocation
│   │   ├── ShopMarker.tsx    # Marker icon component (unused if inline SVG)
│   │   ├── MapActionMenu.tsx # Right-click/long-press context menu on map
│   │   ├── MapSearchBox.tsx  # AMap PlaceSearch integration
│   │   └── MapMarkerPopup.tsx # DEPRECATED — replaced by AMap native InfoWindow
│   ├── shop/
│   │   ├── ShopCard.tsx      # Shop list card (category color badge, rating, price)
│   │   ├── ShopForm.tsx      # Add/edit shop modal form
│   │   └── ShopList.tsx      # Searchable shop list with category filter
│   ├── review/
│   │   └── ReviewForm.tsx    # Add/edit review modal form
│   ├── sync/
│   │   ├── SyncPanel.tsx     # Push/pull controls + identity display
│   │   └── ChangeList.tsx    # Change queue with revert action
│   ├── admin/
│   │   └── ApprovalCard.tsx  # Single pending batch card (expand, approve/reject)
│   └── ui/
│       └── ConfirmDialog.tsx # Custom confirm modal (replaces browser confirm())
├── lib/
│   ├── types/index.ts        # All TypeScript interfaces (Server*, Change*, Merged*, PendingSync)
│   ├── db/index.ts           # Dexie DB schema, merge reads, CRUD helpers, reactive hooks
│   ├── utils.ts              # getCategoryColor() — hash-based 8-color palette
│   ├── server/
│   │   ├── db.ts             # SQLite setup, migrations, indexes
│   │   └── auth.ts           # Admin/user token authentication
│   └── sync/
│       ├── pull.ts           # Client-side pull logic
│       ├── push.ts           # Client-side push logic
│       └── auth.ts           # Sync identity (token + author name) in localStorage
```

## Layout Patterns

- **Desktop (lg+)**: `<main overflow-hidden>` → pages fill viewport, panels scroll independently via flex+overflow
- **Mobile**: `<main overflow-y-auto>` → pages use `min-h-full` (not `h-full`), content stacks vertically, whole page scrolls naturally
- Grid pages (sync, admin): `lg:grid-cols-[380px_minmax(0,1fr)]` — single column on mobile, two-column on desktop
- Home page: `flex-col md:flex-row` — map top/sidebar bottom on mobile, side-by-side on desktop

## Conventions

- All text is Chinese (zh-CN) — UI labels, comments, commit messages
- No CSS dark mode — explicit Tailwind colors everywhere, dark media query removed from globals.css
- AMap markers use colored SVG pins via `getCategoryColor()` — consistent colors across markers, cards, and InfoWindow
- Map viewport (center+zoom) persists in localStorage
- Custom `ConfirmDialog` replaces all `confirm()` calls
- Sync badge system: `synced` (Bucket A data only), `draft` (unsent local edit), `pending` (submitted, awaiting admin)
