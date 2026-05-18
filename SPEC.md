# 小众点评 — 产品规格说明书

> 版本：v1.0  
> 最后更新：2026-05-18  
> 状态：Draft → Ready for Implementation

---

## 1. 产品定位

私人 / 小圈子的探店日记应用。记录真实的探店体验，数据本地优先，按需同步共享。

**核心价值**：不用大众点评，自己记、朋友看、管理员审。

---

## 2. 数据模型

### 2.1 店铺 (Shop)

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `string` | PK, UUID v4 | 自动生成 | 店铺唯一标识 |
| `name` | `string` | NOT NULL, ≤100 字 | — | 店铺名称 |
| `address` | `string` | ≤300 字 | `""` | 详细地址 |
| `category` | `string` | ≤50 字 | `""` | 分类（如"日料""咖啡"） |
| `phone` | `string` | ≤30 字 | `""` | 联系电话 |
| `businessHours` | `string` | ≤200 字 | `""` | 营业时间描述 |
| `lng` | `number` | 经度范围 [-180, 180] | `null` | Geo 坐标 - 经度 |
| `lat` | `number` | 纬度范围 [-90, 90] | `null` | Geo 坐标 - 纬度 |
| `tags` | `string[]` | 每项 ≤20 字, ≤10 项 | `[]` | 特色标签/关键词 |
| `coverUrl` | `string \| null` | 合法 URL | `null` | 封面图 URL（v2 图床预留） |
| `createdAt` | `string` | ISO 8601 | 自动生成 | 创建时间 |
| `updatedAt` | `string` | ISO 8601 | 自动更新 | 最后修改时间 |

### 2.2 点评 (Review)

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `string` | PK, UUID v4 | 自动生成 | 点评唯一标识 |
| `shopId` | `string` | FK → Shop.id, NOT NULL | — | 关联店铺 |
| `author` | `string` | NOT NULL, ≤30 字 | 本地昵称 | 作者昵称 |
| `rating` | `number` | [1, 5] 整数 | — | 评分（1-5 星） |
| `content` | `string` | ≤5000 字 | `""` | 文字评价 |
| `tags` | `string[]` | 每项 ≤20 字, ≤10 项 | `[]` | 场景标签 |
| `avgPrice` | `number \| null` | ≥0 | `null` | 人均消费（元） |
| `visitDate` | `string` | ISO 8601 date | `null` | 探店日期 |
| `images` | `string[]` | 合法 URL, ≤9 项 | `[]` | 图片 URL 列表（v2 预留） |
| `createdAt` | `string` | ISO 8601 | 自动生成 | 创建时间 |
| `updatedAt` | `string` | ISO 8601 | 自动更新 | 最后修改时间 |

### 2.3 同步变更记录 (ChangeLog)

用于追踪本地变更，作为同步上传的 payload。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `string` | PK | 本地自增 |
| `entity` | `"shop" \| "review"` | NOT NULL | 变更实体类型 |
| `entityId` | `string` | NOT NULL | 实体 ID |
| `action` | `"create" \| "update" \| "delete"` | NOT NULL | 操作类型 |
| `snapshot` | `object` | — | 操作后的完整数据快照 |
| `timestamp` | `string` | ISO 8601 | 操作时间 |

### 2.4 关系与索引

```
Shop 1 ──→ N Review   (通过 Review.shopId)
Shop.category  → 索引（分类筛选）
Shop.lng/lat   → 联合索引（地图视口查询）
Review.shopId  → 索引（店铺下的点评列表）
Review.visitDate → 索引（时间线排序）
```

---

## 3. API 接口设计

所有 API 路由前缀：`/api`

### 3.1 本地 CRUD（客户端 IndexedDB，无需网络）

本地操作通过 **Dexie.js** 直接读写 IndexedDB，无后端 API。每次写操作同步写入 ChangeLog 表。

### 3.2 远程 API（服务端 Next.js Route Handlers）

#### 3.2.1 同步相关

| 方法 | 路由 | 说明 | Auth |
|---|---|---|---|
| `POST` | `/api/sync/push` | 提交本地变更到服务端 | User Token |
| `GET` | `/api/sync/pull` | 拉取远端全量/增量数据 | User Token |
| `GET` | `/api/sync/pending` | 获取待审核的变更列表 | Admin Token |

**POST /api/sync/push**

```jsonc
// Request
{
  "token": "usr_xxx",
  "changes": [
    {
      "entity": "shop",
      "entityId": "uuid-xxx",
      "action": "create",
      "snapshot": { /* Shop 完整字段 */ },
      "timestamp": "2026-05-18T10:00:00Z"
    }
  ]
}

// Response 200
{
  "ok": true,
  "syncId": "sync-uuid-xxx",
  "message": "已提交，等待管理员审核"
}

// Response 401
{
  "ok": false,
  "error": "invalid_token"
}
```

**GET /api/sync/pull?since=<ISO8601>**

```jsonc
// Response 200
{
  "ok": true,
  "shops": [ /* Shop[] */ ],
  "reviews": [ /* Review[] */ ],
  "serverTime": "2026-05-18T12:00:00Z"
}
```

#### 3.2.2 管理审核相关

| 方法 | 路由 | 说明 | Auth |
|---|---|---|---|
| `GET` | `/api/admin/changes` | 获取待审核变更列表 | Admin Token |
| `GET` | `/api/admin/changes/:syncId` | 获取单个同步提交的详情（含 diff） | Admin Token |
| `POST` | `/api/admin/merge` | 合并通过审核的变更 | Admin Token |
| `POST` | `/api/admin/reject` | 拒绝变更 | Admin Token |

**GET /api/admin/changes/:syncId**

```jsonc
// Response 200
{
  "ok": true,
  "syncId": "sync-uuid-xxx",
  "submittedBy": "nickname",
  "submittedAt": "2026-05-18T10:00:00Z",
  "changes": [
    {
      "entity": "shop",
      "entityId": "uuid-xxx",
      "action": "create",
      "snapshot": { /* Shop 完整字段 */ },
      "timestamp": "2026-05-18T10:00:00Z",
      "diff": {
        "field": "name",
        "oldValue": null,        // null 表示新增
        "newValue": "某某日料店"
      }
    }
  ]
}
```

**POST /api/admin/merge**

```jsonc
// Request
{
  "token": "adm_xxx",
  "syncId": "sync-uuid-xxx",
  "approvedChanges": ["uuid-1", "uuid-2"]  // 按 change 粒度 cherry-pick，空=全部通过
}

// Response 200
{
  "ok": true,
  "merged": 2,
  "skipped": 0
}
```

**POST /api/admin/reject**

```jsonc
// Request
{
  "token": "adm_xxx",
  "syncId": "sync-uuid-xxx",
  "reason": "信息有误"
}

// Response 200
{
  "ok": true
}
```

#### 3.2.3 店铺 & 点评查询（远端）

| 方法 | 路由 | 说明 | Auth |
|---|---|---|---|
| `GET` | `/api/shops` | 获取远端店铺列表 | User Token |
| `GET` | `/api/shops/:id` | 获取单个远端店铺详情 | User Token |
| `GET` | `/api/shops/:id/reviews` | 获取店铺下的远端点评 | User Token |

### 3.3 服务端数据存储

服务端使用 **JSON 文件**（初期）存储已审核合并的数据，避免引入数据库依赖：

```
server-data/
  shops.json        # { "shops": [...] }
  reviews.json      # { "reviews": [...] }
  pending/
    <syncId>.json   # 待审核的同步提交
```

> 后期可根据需要迁移至 SQLite（如使用 better-sqlite3）。

---

## 4. 同步与合并机制

### 4.1 整体流程

```
┌─────────┐    push     ┌─────────┐   review    ┌─────────┐   merge    ┌─────────┐
│  本地    │ ──────────→ │  远端    │ ──────────→ │  管理员  │ ──────────→ │  远端    │
│ IndexedDB│   changes  │ pending │   diff view │  审核    │  approved  │  主数据  │
└─────────┘             └─────────┘             └─────────┘             └─────────┘
```

### 4.2 详细步骤

#### Step 1：本地变更记录

- 用户进行任何 CRUD 操作时，同时向 `ChangeLog` 表插入一条记录
- `snapshot` 字段保存操作后的完整实体数据（delete 操作 snapshot 为 `{ id, _deleted: true }`）
- `ChangeLog` 记录在成功 push 后清除

#### Step 2：用户提交同步 (Push)

1. 用户输入邀请 Token
2. 客户端读取所有未同步的 `ChangeLog` 记录
3. 调用 `POST /api/sync/push`，将 changes 数组发送到服务端
4. 服务端将提交存为 `pending/<syncId>.json`，状态为 `pending`
5. 返回 `syncId`，客户端清除已提交的 `ChangeLog` 记录

#### Step 3：管理员审核 (Diff View)

1. 管理员通过 Admin Token 登录审核页面
2. 调用 `GET /api/admin/changes` 查看待审核列表
3. 点击某条提交，调用 `GET /api/admin/changes/:syncId` 查看详情
4. 服务端计算 diff：
   - **新增 (create)**：整个 snapshot 作为新增展示
   - **修改 (update)**：将 snapshot 与远端当前数据逐字段比较，生成 `{ field, oldValue, newValue }[]`
   - **删除 (delete)**：展示待删除实体信息
5. 管理员逐条勾选要接受的变更（cherry-pick），或全部通过/拒绝

#### Step 4：合并 (Merge)

1. 管理员确认，调用 `POST /api/admin/merge`
2. 服务端将 approved 的变更写入主数据文件（`shops.json` / `reviews.json`）
3. 对于冲突情况（如远端数据已被其他人修改）：
   - 策略：**管理员选择覆盖**，diff 视图中明确标注冲突字段
   - 初期不实现自动合并，完全由管理员人工决策
4. 合并完成后删除 `pending/<syncId>.json`

#### Step 5：用户拉取 (Pull)

1. 用户点击"同步"或应用启动时，调用 `GET /api/sync/pull?since=<上次同步时间>`
2. 服务端返回该时间点之后所有已合并的数据
3. 客户端将远端数据合入本地 IndexedDB：
   - 远端有、本地无 → 插入
   - 远端有、本地有 → 以 `updatedAt` 较新者为准
   - 远端已删除、本地仍有 → 本地标记删除（软删除）
4. 更新本地 `lastSyncTime`

### 4.3 冲突处理策略

| 场景 | 策略 |
|---|---|
| 本地修改 vs 远端未变 | 直接采用本地版本（push 后管理员审核） |
| 本地修改 vs 远端已修改 | 管理员在 diff 视图中看到两个版本，人工选择 |
| 同一实体被多人修改 | 后提交的变更独立生成 pending，管理员逐一审核 |

---

## 5. 数据来源切换

### 5.1 合并视图规则

用户在主界面看到的是 **本地 + 远端合并后的统一视图**。合并规则：

- 同一实体（相同 `id`）只出现一次
- 如果本地和远端都有，取 `updatedAt` 更新的版本展示
- 每条数据旁显示来源标识：`🟢 本地` / `🔵 远端` / `🟣 已合并`

### 5.2 交互细节

**列表/卡片视图：**
- 每条店铺/点评卡片右上角显示来源标签
- 点击来源标签 → 展开对比面板，显示本地版本和远端版本并排对比
- 对比面板中高亮差异字段（类似 git diff 的红色删除/绿色新增样式）

**筛选控制：**
- 顶部提供数据来源筛选器：`全部 | 仅本地 | 仅远端`
- 默认显示"全部"（合并视图）

**地图视图：**
- 地图上不同来源的标记使用不同颜色区分
- 点击标记弹出简要信息窗口，显示来源标识

### 5.3 来源状态定义

| 状态 | 含义 | 标识颜色 |
|---|---|---|
| `local-only` | 仅存在于本地 | 绿色 |
| `remote-only` | 仅存在于远端 | 蓝色 |
| `synced` | 本地与远端一致 | 灰色 |
| `conflict` | 本地与远端存在差异 | 橙色（需注意） |

---

## 6. Token 机制与用户系统

### 6.1 用户身份

- 本地使用：输入昵称即可，存于 localStorage
- 同步使用：需提供邀请 Token

### 6.2 Token 类型

| 类型 | 格式 | 用途 | 生成方式 |
|---|---|---|---|
| User Token | `usr_<random32>` | 发起同步 push/pull | 管理员手动生成，分发给成员 |
| Admin Token | `adm_<random32>` | 审核合并操作 | 环境变量配置，仅管理员持有 |

### 6.3 Token 存储

- Token 存储在服务端 `server-data/tokens.json`
- 初期支持多个 User Token，仅一个 Admin Token
- 管理员可通过简单配置文件管理 Token

```jsonc
// server-data/tokens.json
{
  "adminToken": "adm_xxx",
  "userTokens": [
    { "token": "usr_aaa", "nickname": "小明", "createdAt": "2026-05-18" },
    { "token": "usr_bbb", "nickname": "小红", "createdAt": "2026-05-19" }
  ]
}
```

---

## 7. 前端页面与组件结构

### 7.1 页面路由

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | 主页 | 地图 + 列表视图 |
| `/shops/[id]` | 店铺详情 | 店铺信息 + 点评列表 |
| `/shops/new` | 新增店铺 | 表单页 |
| `/shops/[id]/edit` | 编辑店铺 | 表单页 |
| `/reviews/new?shopId=` | 新增点评 | 表单页 |
| `/reviews/[id]/edit` | 编辑点评 | 表单页 |
| `/sync` | 同步管理 | Token 输入 + 同步状态 |
| `/admin` | 管理审核 | 变更列表 + Diff 视图 |
| `/settings` | 设置 | 昵称 + 数据源筛选偏好 |

### 7.2 组件结构

```
components/
├── layout/
│   ├── AppShell.tsx          # 全局布局壳
│   ├── Header.tsx            # 顶部导航栏
│   └── BottomNav.tsx         # 底部导航（移动端）
├── map/
│   ├── MapView.tsx           # 高德地图容器
│   ├── ShopMarker.tsx        # 店铺地图标记
│   └── MapPopup.tsx          # 地图信息弹窗
├── shop/
│   ├── ShopCard.tsx          # 店铺卡片
│   ├── ShopList.tsx          # 店铺列表
│   ├── ShopForm.tsx          # 店铺新增/编辑表单
│   └── ShopDetail.tsx        # 店铺详情展示
├── review/
│   ├── ReviewCard.tsx        # 点评卡片
│   ├── ReviewList.tsx        # 点评列表
│   ├── ReviewForm.tsx        # 点评表单
│   └── StarRating.tsx        # 星级评分组件
├── sync/
│   ├── SyncPanel.tsx         # 同步操作面板
│   ├── SourceBadge.tsx       # 数据来源标识
│   ├── SourceFilter.tsx      # 来源筛选器
│   └── DiffViewer.tsx        # Diff 对比视图
├── common/
│   ├── SearchBar.tsx         # 搜索栏
│   ├── TagList.tsx           # 标签列表/输入
│   ├── EmptyState.tsx        # 空状态提示
│   └── LoadingSpinner.tsx    # 加载指示器
└── admin/
    ├── PendingList.tsx       # 待审核列表
    ├── ChangeDetail.tsx      # 单条变更详情
    └── MergeAction.tsx       # 审核操作按钮组
```

### 7.3 布局响应式规则

```
移动端 (<768px)                桌面端 (≥768px)
┌──────────────┐              ┌─────────────────────┬──────────────┐
│   Header     │              │                     │   Header     │
├──────────────┤              │                     ├──────────────┤
│  SearchBar   │              │                     │  SearchBar   │
├──────────────┤              │                     ├──────────────┤
│              │              │                     │  ShopList /  │
│  MapView     │              │    MapView          │  ReviewList  │
│  (高度 40vh) │              │    (flex-1)         │  (w-1/4)     │
├──────────────┤              │                     │              │
│  ShopList /  │              │                     │              │
│  Timeline    │              │                     │              │
│  (可滚动)    │              │                     │              │
├──────────────┤              │                     │              │
│  BottomNav   │              └─────────────────────┴──────────────┘
└──────────────┘
```

---

## 8. 目录结构 (Next.js App Router)

```
xiaozhong-review/
├── app/
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页（地图 + 列表）
│   ├── shops/
│   │   ├── new/
│   │   │   └── page.tsx          # 新增店铺
│   │   └── [id]/
│   │       ├── page.tsx          # 店铺详情
│   │       └── edit/
│   │           └── page.tsx      # 编辑店铺
│   ├── reviews/
│   │   ├── new/
│   │   │   └── page.tsx          # 新增点评
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx      # 编辑点评
│   ├── sync/
│   │   └── page.tsx              # 同步管理
│   ├── admin/
│   │   └── page.tsx              # 管理审核
│   ├── settings/
│   │   └── page.tsx              # 设置
│   └── api/
│       ├── sync/
│       │   ├── push/
│       │   │   └── route.ts      # POST /api/sync/push
│       │   ├── pull/
│       │   │   └── route.ts      # GET /api/sync/pull
│       │   └── pending/
│       │       └── route.ts      # GET /api/sync/pending
│       ├── admin/
│       │   ├── changes/
│       │   │   ├── route.ts      # GET 待审核列表
│       │   │   └── [syncId]/
│       │   │       └── route.ts  # GET 单条详情
│       │   ├── merge/
│       │   │   └── route.ts      # POST 合并
│       │   └── reject/
│       │       └── route.ts      # POST 拒绝
│       ├── shops/
│       │   ├── route.ts          # GET 店铺列表
│       │   └── [id]/
│       │       ├── route.ts      # GET 店铺详情
│       │       └── reviews/
│       │           └── route.ts  # GET 店铺下点评
│       └── health/
│           └── route.ts          # GET 健康检查
├── components/                   # （见 7.2 组件结构）
├── lib/
│   ├── db/
│   │   ├── index.ts              # Dexie 初始化 + schema
│   │   ├── shops.ts              # Shop CRUD 操作封装
│   │   ├── reviews.ts            # Review CRUD 操作封装
│   │   └── changelog.ts          # ChangeLog 操作封装
│   ├── sync/
│   │   ├── push.ts               # 客户端 push 逻辑
│   │   ├── pull.ts               # 客户端 pull & merge 逻辑
│   │   └── merger.ts             # 本地-远端数据合并算法
│   ├── server/
│   │   ├── store.ts              # 服务端 JSON 文件读写
│   │   ├── auth.ts               # Token 校验
│   │   └── diff.ts               # Diff 计算工具
│   ├── hooks/
│   │   ├── useShops.ts           # 店铺数据 hook
│   │   ├── useReviews.ts         # 点评数据 hook
│   │   ├── useSync.ts            # 同步状态 hook
│   │   └── useSourceFilter.ts    # 来源筛选 hook
│   └── types/
│       └── index.ts              # TypeScript 类型定义
├── server-data/                  # 服务端数据存储（gitignore）
│   ├── shops.json
│   ├── reviews.json
│   ├── tokens.json
│   └── pending/
├── public/
│   └── favicon.ico
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
└── SPEC.md                       # 本文档
```

---

## 9. 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 框架 | Next.js (App Router) | 全栈框架 |
| 地图 | 高德地图 JS API 2.0 + @amap/amap-jsapi-loader | 地图渲染 |
| 本地存储 | Dexie.js v4 | IndexedDB 封装，支持 useLiveQuery |
| 样式 | Tailwind CSS v4 | 原子化 CSS |
| 语言 | TypeScript | 类型安全 |
| 服务端存储 | JSON 文件 | 初期零依赖，后期可迁移 SQLite |
| 部署 | Node.js / Vercel | 单实例部署即可 |

---

## 10. v1 范围定义

### v1 Must Have

- [ ] 店铺 CRUD（本地 IndexedDB）
- [ ] 点评 CRUD（本地 IndexedDB）
- [ ] 高德地图展示店铺位置
- [ ] 响应式布局（移动端 + 桌面端）
- [ ] 搜索与分类筛选
- [ ] 数据来源标识与切换
- [ ] Token 认证机制
- [ ] 本地变更 push 到服务端
- [ ] 管理员 diff 审核界面
- [ ] 管理员 merge 操作
- [ ] 用户 pull 远端数据
- [ ] 本地-远端数据合并

### v1 Won't Have

- 图片上传 / 图床
- 多语言
- 多管理员
- 实时协作
- 自动同步（需用户手动触发）

---

## 11. v2 路线图

### Phase 1：图片支持

| 特性 | 说明 |
|---|---|
| 图片上传接口 | 统一的 `/api/upload` 接口，接收 multipart/form-data |
| 图床集成 | 优先考虑：Cloudflare R2 / 阿里 OSS / 七牛，按成本和维护简便性选择 |
| 图片压缩 | 客户端上传前压缩（使用 browser-image-compression），限制单张 ≤2MB |
| 图片展示 | 店铺封面图 + 点评多图，支持预览轮播 |
| 存储配置 | 通过环境变量配置图床 provider 和凭证 |

### Phase 2：体验增强

| 特性 | 说明 |
|---|---|
| 离线 PWA | Service Worker 缓存，离线可用 |
| 导出功能 | 导出为 JSON / CSV 备份 |
| 时间线视图 | 按探店日期的时间线展示 |
| 地图聚合 | 大量标记时使用点聚合 |
| 搜索增强 | 全文搜索（考虑 Fuse.js 本地模糊搜索） |

### Phase 3：协作增强

| 特性 | 说明 |
|---|---|
| 多管理员 | 支持多个 Admin Token，审核日志 |
| 实时通知 | WebSocket / SSE 通知审核结果 |
| 评论系统 | 对点评的追加评论 |
| 收藏/足迹 | 标记想去的店 / 已去的店 |
| 分享链接 | 生成店铺或点评的只读分享链接 |

---

## 12. 开发约定

### 12.1 本地开发

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建
npm run lint         # ESLint 检查
npm run typecheck    # TypeScript 类型检查
```

### 12.2 环境变量

```env
# 高德地图
NEXT_PUBLIC_AMAP_KEY=your_amap_key
NEXT_PUBLIC_AMAP_SECRET=your_amap_secret

# 管理员 Token
ADMIN_TOKEN=adm_xxx

# 图床（v2）
# IMAGE_STORAGE_PROVIDER=r2
# R2_BUCKET=xxx
# R2_ACCESS_KEY=xxx
# R2_SECRET_KEY=xxx
```

### 12.3 Git 规范

- 提交格式：`type(scope): description`，如 `feat(shop): add shop CRUD`
- 分支策略：`main` 保护分支，开发在 `dev` 或 feature 分支
- `server-data/` 目录在 `.gitignore` 中排除

---

*本文档随项目迭代持续更新。*
