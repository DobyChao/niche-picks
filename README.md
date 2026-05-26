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
- **POI search** — `searchNearBy` with dynamic radius based on zoom level, local shops merged into results
- **Shop creation with suggestions** — name input auto-suggests nearby POIs, auto-fills address/category/phone
- **Offline-first sync** — dual-bucket architecture (server clones + local changes), admin approval workflow
- **Review system** — ratings, price, comments with real-time aggregation
- **Admin panel** — token management, approval queue for submitted changes
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
    └── sync/               # Client-side push/pull logic
```

## Deployment

Running as a systemd service (`xiaozhong-review`) on port 8088 with nginx reverse proxy (HTTPS via Certbot).

```bash
npm run build
sudo systemctl restart xiaozhong-review
```
