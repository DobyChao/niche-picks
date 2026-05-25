// ─── 桶 A：服务器数据克隆（无同步元数据） ───

export interface ServerShop {
  id: string;
  name: string;
  address: string;
  category: string;
  phone: string;
  businessHours: string;
  lng: number | null;
  lat: number | null;
  tags: string[];
  amapPoiId?: string;
  photos?: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerReview {
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
}

// ─── 桶 B：本地变更快照 ───

export type ChangeStatus = 'draft' | 'pending';

export interface ShopChange extends ServerShop {
  status: ChangeStatus;
  syncId: string | null;
}

export interface ReviewChange extends ServerReview {
  status: ChangeStatus;
  syncId: string | null;
}

// ─── 合并视图（UI 渲染用） ───

export type SyncBadge = 'synced' | 'draft' | 'pending';

export interface MergedShop extends ServerShop {
  _syncBadge: SyncBadge;
  _syncId: string | null;
  avgRating?: number;
  reviewCount: number;
  avgPrice?: number;
}

export interface MergedReview extends ServerReview {
  _syncBadge: SyncBadge;
  _syncId: string | null;
}

// ─── 服务器通信格式（兼容现有 pending_syncs） ───

export interface ChangeLogItem {
  entity: 'shop' | 'review';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  snapshot: any;
  timestamp: string;
}

export interface PendingSync {
  syncId: string;
  userToken: string;
  authorName: string;
  changesPayload: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}
