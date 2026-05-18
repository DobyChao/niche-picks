# 小众点评 — 技术实施计划 (PLAN)

> 对应 SPEC：v1.1
> 
> 适用技术：Next.js, Dexie.js, SQLite, Tailwind CSS v4

## 1. 数据库架构设计

### 1.1 本地存储 (Dexie.js / IndexedDB)

在本地通过三个主表建立离线优先的存储模型。

```
// @lib/db/index.ts
import Dexie, { type Table } from 'dexie';

export interface LocalShop {
  id: string;
  name: string;
  address: string;
  category: string;
  phone: string;
  businessHours: string;
  lng: number | null;
  lat: number | null;
  tags: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // 本地辅助字段
  _syncStatus: 'synced' | 'pending' | 'local_modified';
}

export interface LocalReview {
  id: string;
  shopId: string;
  author: string;
  rating: number;
  content: string;
  tags: string[];
  avgPrice: number | null;
  visitDate: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // 本地辅助字段
  _syncStatus: 'synced' | 'pending' | 'local_modified';
}

export interface LocalChangeLog {
  id?: number; // 增量自增 PK
  entity: 'shop' | 'review';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  snapshot: any;
  timestamp: string;
}

class LocalDB extends Dexie {
  shops!: Table<LocalShop, string>;
  reviews!: Table<LocalReview, string>;
  changelog!: Table<LocalChangeLog, number>;

  constructor() {
    super('XiaozhongReviewDB');
    this.version(1).stores({
      shops: 'id, category, isDeleted, _syncStatus',
      reviews: 'id, shopId, visitDate, isDeleted, _syncStatus',
      changelog: '++id, entity, entityId, timestamp'
    });
  }
}

export const db = new LocalDB();
```

### 1.2 服务端存储 (SQLite)

采用 SQLite 规避并发冲突。服务端需要三张表：`shops`（主数据）、`reviews`（主数据）以及 `pending_syncs`（等待审批的挂起包）。

```
-- 1. 店铺主表
CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    category TEXT,
    phone TEXT,
    businessHours TEXT,
    lng REAL,
    lat REAL,
    tags TEXT, -- JSON 字符串存储 ["标签1", "标签2"]
    isDeleted INTEGER DEFAULT 0, -- 0=false, 1=true
    createdAt TEXT,
    updatedAt TEXT
);

-- 2. 点评主表
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    shopId TEXT NOT NULL,
    author TEXT NOT NULL,
    rating INTEGER,
    content TEXT,
    tags TEXT, -- JSON 字符串
    avgPrice REAL,
    visitDate TEXT,
    isDeleted INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY(shopId) REFERENCES shops(id)
);

-- 3. 挂起审批批次表
CREATE TABLE IF NOT EXISTS pending_syncs (
    syncId TEXT PRIMARY KEY,
    userToken TEXT NOT NULL,
    authorName TEXT NOT NULL,
    changesPayload TEXT NOT NULL, -- 客户端上传的 ChangeLogItem[] JSON
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    submittedAt TEXT
);
```

## 2. 核心同步算法

### 2.1 客户端 Push

```
async function pushLocalChanges(userToken: string, authorName: string) {
  // 1. 获取未同步日志
  const logs = await db.changelog.toArray();
  if (logs.length === 0) return;

  // 2. 提交到后端
  const res = await fetch('/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: userToken, authorName, changes: logs })
  });

  if (res.ok) {
    const { syncId } = await res.json();
    // 3. 将对应数据的本地状态设为 'pending'
    await db.transaction('rw', [db.shops, db.reviews, db.changelog], async () => {
      for (const log of logs) {
        if (log.entity === 'shop') {
          await db.shops.update(log.entityId, { _syncStatus: 'pending' });
        } else {
          await db.reviews.update(log.entityId, { _syncStatus: 'pending' });
        }
      }
      // 4. 清除已被服务器接收的本地变更日志
      await db.changelog.clear();
    });
  }
}
```

### 2.2 客户端 Pull

```
async function pullRemoteData(userToken: string) {
  const lastSyncTime = localStorage.getItem('lastSyncTime') || '1970-01-01T00:00:00Z';

  const res = await fetch(`/api/sync/pull?since=${encodeURIComponent(lastSyncTime)}&token=${userToken}`);
  if (!res.ok) return;

  const { shops, reviews, syncStatuses, serverTime } = await res.json();

  await db.transaction('rw', [db.shops, db.reviews], async () => {
    // 1. 应用服务器下发的最新增量数据 (包含墓碑)
    for (const shop of shops) {
      await db.shops.put({
        ...shop,
        tags: JSON.parse(shop.tags),
        isDeleted: !!shop.isDeleted,
        _syncStatus: 'synced'
      });
    }

    for (const review of reviews) {
      await db.reviews.put({
        ...review,
        tags: JSON.parse(review.tags),
        isDeleted: !!review.isDeleted,
        _syncStatus: 'synced'
      });
    }

    // 2. 检查之前提交批次的审批状态。若为 rejected，强制将对应数据更新为云端同步态（即丢弃本地脏修改）
    for (const status of syncStatuses) {
      if (status.status === 'rejected') {
        const rejectedChanges = JSON.parse(status.changesPayload);
        for (const item of rejectedChanges) {
          if (item.entity === 'shop') {
            // 从云端重新获取或将本地状态重置回 synced，防止卡死在 pending 状态
            await db.shops.update(item.entityId, { _syncStatus: 'synced' });
          } else {
            await db.reviews.update(item.entityId, { _syncStatus: 'synced' });
          }
        }
      }
    }
  });

  localStorage.setItem('lastSyncTime', serverTime);
}
```

## 3. 前端结构与响应式视图

### 3.1 核心组件树

```
components/
├── map/
│   ├── MapView.tsx           # 高德地图 (必须声明 'use client')
│   └── ShopMarker.tsx        # 区分状态（🟢未同步 🔵同步）的 Marker
├── shop/
│   ├── ShopCard.tsx          # 带有绿色/蓝色徽章的店铺卡片
│   ├── ShopList.tsx          # 列表呈现，固定宽 420px
│   └── ShopForm.tsx          # 离线优先添加表单
├── sync/
│   └── SyncPanel.tsx         # 同步操作面板（Pull / Push 触发器）
└── admin/
    └── ApprovalCard.tsx      # 一键通过 / 拒绝审批卡片
```

### 3.2 页面路由图

```
app/
├── page.tsx                  # 首页（地图 + 侧边栏/列表组合）
├── sync/
│   └── page.tsx              # 同步身份配置与 Pull/Push 操作台
└── admin/
    └── page.tsx              # 管理员审批后台（一键整批审批列表）
```

## 4. 开发约定

- **高德地图坐标统一**：所有通过地图采集或存储的坐标，必须默认视为 **GCJ-02 (火星坐标系)**。

- **SQLite 驱动**：服务端使用 `better-sqlite3`（性能最强，同步执行契合无线程锁瓶颈的 Next.js API 运行时）。

- **本地状态更新钩子**：统一采用 Dexie 的 `useLiveQuery` 监听本地库，以保证当用户同步主数据后，地图上的标记和右侧列表能够无缝“静默刷新”，无须手动刷新页面。
