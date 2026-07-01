# 小众点评

Private shop review app — discover and share good shops with your team via a location-based map.

## Tech Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4**
- **Dexie** (IndexedDB) — offline-first client DB
- **better-sqlite3** — server DB (SQLite, WAL mode)
- **AMap JS API 2.0** (高德地图) — map, POI search, geocoding
- **Playwright** — E2E testing

## Getting Started

```bash
# Install dependencies
npm install

# Create .env.local with required keys
NEXT_PUBLIC_AMAP_KEY=your_web_js_api_key
AMAP_SECURITY_CODE=your_security_jscode
ADMIN_TOKEN=your_admin_secret

# Development
npm run dev

# Production build & serve
npm run build
npm run start
```

## Features

- **Map-based shop browsing** — colored markers by category, InfoWindow with ratings
- **City switcher** — AUTO mode detects city from map position, or manually pick a city
- **POI search** — `searchNearBy` centered on the distance anchor (or map center when no anchor), dynamic radius based on zoom level, local shops merged into results
- **Shop creation with suggestions** — name input auto-suggests nearby POIs, auto-fills address/category/phone
- **Shop list filter & sort** — search, filter by category / sync status / review presence, and sort by recently updated / created / name / rating / distance; preferences persist to `localStorage`
- **Distance anchor** — a resident map button (⚑) sets a persistent anchor via my location / map center / manual pick / selected shop; the anchor drives both distance sort and POI search center, shows a ★ marker on the map, and persists across sessions
- **Offline-first sync** — dual-bucket architecture (server clones + local changes), admin approval workflow
- **Review system** — ratings, price, comments with real-time aggregation
- **Admin panel** — token management (normal / trusted roles), approval queue for submitted changes; trusted tokens auto-approve on push
- **Responsive layout** — desktop two-column grid, mobile full-page scroll

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home — map + sidebar
│   ├── sync/page.tsx       # Sync management
│   ├── admin/page.tsx      # Admin panel
│   ├── identity/page.tsx   # Sync identity setup
│   └── api/                # API routes (sync, admin, amap proxy)
├── components/
│   ├── map/                # MapView, MapSearchBox, CityPicker, MapActionMenu
│   ├── shop/               # ShopCard, ShopForm, ShopList
│   ├── review/             # ReviewForm
│   ├── sync/               # SyncPanel, ChangeList
│   ├── admin/              # ApprovalCard
│   └── ui/                 # ConfirmDialog
└── lib/
    ├── db/index.ts         # Dexie schema, merge reads, CRUD
    ├── types/index.ts      # TypeScript interfaces
    ├── server/db.ts        # SQLite setup, migrations
    ├── geo.ts              # haversine distance + formatting
    ├── shop-list-prefs.ts  # shop list filter/sort/anchor logic + persistence
    └── sync/               # Client-side push/pull logic
```

## Deployment

Running as a systemd service (`xiaozhong-review`) on port 8088 with nginx reverse proxy (HTTPS via Certbot).

```bash
npm run build
sudo systemctl restart xiaozhong-review
```
