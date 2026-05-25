import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type {
  ServerShop, ServerReview,
  ShopChange, ReviewChange,
  MergedShop, MergedReview,
  ChangeStatus,
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

class LocalDB extends Dexie {
  localShops!: Table<ServerShop, string>;
  localReviews!: Table<ServerReview, string>;
  shopChanges!: Table<ShopChange, string>;
  reviewChanges!: Table<ReviewChange, string>;

  constructor() {
    super('XiaozhongReviewDB_v2');
    this.version(1).stores({
      localShops: 'id, category, isDeleted',
      localReviews: 'id, shopId, visitDate, isDeleted',
      shopChanges: 'id, status, syncId',
      reviewChanges: 'id, shopId, status, syncId',
    });
  }
}

export const db = new LocalDB();

// ─── 合并读取（桶 B 优先，桶 A 兜底） ──────────────────────────────────────────

export async function getMergedShop(id: string): Promise<MergedShop | null> {
  let shopData: Omit<ServerShop, never> | null = null;
  let _syncBadge: ChangeStatus = 'synced' as ChangeStatus;
  let _syncId: string | null = null;

  const change = await db.shopChanges.get(id);
  if (change) {
    const { status, syncId, ...data } = change;
    shopData = data;
    _syncBadge = status;
    _syncId = syncId;
  } else {
    const base = await db.localShops.get(id);
    if (!base) return null;
    shopData = base;
  }

  // Compute review aggregates
  const [reviewBases, reviewChanges] = await Promise.all([
    db.localReviews.where('shopId').equals(id).toArray(),
    db.reviewChanges.where('shopId').equals(id).toArray(),
  ]);
  const rcMap = new Map(reviewChanges.map((c) => [c.id, c]));
  const ratings: number[] = [];
  const prices: number[] = [];
  for (const c of reviewChanges) {
    if (!c.isDeleted) { ratings.push(c.rating); if (c.avgPrice != null) prices.push(c.avgPrice); }
  }
  for (const b of reviewBases) {
    if (!b.isDeleted && !rcMap.has(b.id)) { ratings.push(b.rating); if (b.avgPrice != null) prices.push(b.avgPrice); }
  }

  return {
    ...shopData, _syncBadge, _syncId,
    reviewCount: ratings.length,
    avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined,
    avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : undefined,
  };
}

export async function getMergedShops(): Promise<MergedShop[]> {
  const [bases, changes, reviewBases, reviewChanges] = await Promise.all([
    db.localShops.toArray(),
    db.shopChanges.toArray(),
    db.localReviews.toArray(),
    db.reviewChanges.toArray(),
  ]);
  const changeMap = new Map(changes.map((c) => [c.id, c]));

  // Build merged reviews for aggregation
  const reviewChangeMap = new Map(reviewChanges.map((c) => [c.id, c]));
  const mergedReviews: { shopId: string; rating: number; avgPrice: number | null }[] = [];
  for (const c of reviewChanges) {
    if (!c.isDeleted) mergedReviews.push({ shopId: c.shopId, rating: c.rating, avgPrice: c.avgPrice });
  }
  for (const b of reviewBases) {
    if (!b.isDeleted && !reviewChangeMap.has(b.id)) {
      mergedReviews.push({ shopId: b.shopId, rating: b.rating, avgPrice: b.avgPrice });
    }
  }

  // Aggregate per shop
  const shopReviewMap = new Map<string, { ratings: number[]; prices: number[] }>();
  for (const r of mergedReviews) {
    let entry = shopReviewMap.get(r.shopId);
    if (!entry) { entry = { ratings: [], prices: [] }; shopReviewMap.set(r.shopId, entry); }
    entry.ratings.push(r.rating);
    if (r.avgPrice != null) entry.prices.push(r.avgPrice);
  }

  const result: MergedShop[] = [];

  for (const change of changes) {
    const { status, syncId, ...shopData } = change;
    const agg = shopReviewMap.get(change.id);
    result.push({
      ...shopData, _syncBadge: status, _syncId: syncId,
      reviewCount: agg ? agg.ratings.length : 0,
      avgRating: agg && agg.ratings.length > 0 ? agg.ratings.reduce((a, b) => a + b, 0) / agg.ratings.length : undefined,
      avgPrice: agg && agg.prices.length > 0 ? agg.prices.reduce((a, b) => a + b, 0) / agg.prices.length : undefined,
    });
  }

  for (const base of bases) {
    if (!changeMap.has(base.id)) {
      const agg = shopReviewMap.get(base.id);
      result.push({
        ...base, _syncBadge: 'synced' as const, _syncId: null,
        reviewCount: agg ? agg.ratings.length : 0,
        avgRating: agg && agg.ratings.length > 0 ? agg.ratings.reduce((a, b) => a + b, 0) / agg.ratings.length : undefined,
        avgPrice: agg && agg.prices.length > 0 ? agg.prices.reduce((a, b) => a + b, 0) / agg.prices.length : undefined,
      });
    }
  }

  return result.filter((s) => !s.isDeleted);
}

export async function getMergedReview(id: string): Promise<MergedReview | null> {
  const change = await db.reviewChanges.get(id);
  if (change) {
    const { status, syncId, ...reviewData } = change;
    return { ...reviewData, _syncBadge: status, _syncId: syncId };
  }
  const base = await db.localReviews.get(id);
  if (!base) return null;
  return { ...base, _syncBadge: 'synced' as const, _syncId: null };
}

export async function getMergedReviews(): Promise<MergedReview[]> {
  const [bases, changes] = await Promise.all([
    db.localReviews.toArray(),
    db.reviewChanges.toArray(),
  ]);
  const changeMap = new Map(changes.map((c) => [c.id, c]));
  const result: MergedReview[] = [];

  for (const change of changes) {
    const { status, syncId, ...reviewData } = change;
    result.push({ ...reviewData, _syncBadge: status, _syncId: syncId });
  }

  for (const base of bases) {
    if (!changeMap.has(base.id)) {
      result.push({ ...base, _syncBadge: 'synced' as const, _syncId: null });
    }
  }

  return result.filter((r) => !r.isDeleted);
}

// ─── Shop helpers ──────────────────────────────────────────────────────────────

export async function addShop(
  data: Omit<ServerShop, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.shopChanges.put({
    ...data,
    id,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    syncId: null,
  });
  return id;
}

export async function updateShop(
  id: string,
  data: Partial<ServerShop>,
): Promise<void> {
  const existing = await getMergedShop(id);
  if (!existing) throw new Error('Shop not found');
  const now = new Date().toISOString();
  await db.shopChanges.put({
    ...existing,
    ...data,
    updatedAt: now,
    status: existing._syncBadge === 'pending' ? 'pending' : 'draft',
    syncId: existing._syncId,
  });
}

export async function deleteShop(id: string): Promise<void> {
  const existing = await getMergedShop(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.shopChanges.put({
    ...existing,
    isDeleted: true,
    updatedAt: now,
    status: existing._syncBadge === 'pending' ? 'pending' : 'draft',
    syncId: existing._syncId,
  });
}

// ─── Review helpers ────────────────────────────────────────────────────────────

export async function addReview(
  data: Omit<ServerReview, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.reviewChanges.put({
    ...data,
    id,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    syncId: null,
  });
  return id;
}

export async function updateReview(
  id: string,
  data: Partial<ServerReview>,
): Promise<void> {
  const existing = await getMergedReview(id);
  if (!existing) throw new Error('Review not found');
  const now = new Date().toISOString();
  await db.reviewChanges.put({
    ...existing,
    ...data,
    updatedAt: now,
    status: existing._syncBadge === 'pending' ? 'pending' : 'draft',
    syncId: existing._syncId,
  });
}

export async function deleteReview(id: string): Promise<void> {
  const existing = await getMergedReview(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.reviewChanges.put({
    ...existing,
    isDeleted: true,
    updatedAt: now,
    status: existing._syncBadge === 'pending' ? 'pending' : 'draft',
    syncId: existing._syncId,
  });
}

// ─── 桶 A 原始数据读取 ──────────────────────────────────────────────────────────

export async function getOriginalShop(id: string): Promise<ServerShop | null> {
  return (await db.localShops.get(id)) ?? null;
}

export async function getOriginalReview(id: string): Promise<ServerReview | null> {
  return (await db.localReviews.get(id)) ?? null;
}

// ─── 变更列表与回退 ────────────────────────────────────────────────────────────

export interface ChangeEntry {
  id: string;
  entity: 'shop' | 'review';
  name: string;
  action: 'create' | 'update' | 'delete';
  status: ChangeStatus;
  updatedAt: string;
  shopId?: string;
  shopName?: string;
}

export async function getAllChanges(): Promise<ChangeEntry[]> {
  const [shopChanges, reviewChanges] = await Promise.all([
    db.shopChanges.toArray(),
    db.reviewChanges.toArray(),
  ]);

  const shopNameMap = new Map<string, string>();
  const entries: ChangeEntry[] = [];

  for (const c of shopChanges) {
    const existsInBase = await db.localShops.get(c.id);
    const name = c.name || '(未命名店铺)';
    shopNameMap.set(c.id, name);
    entries.push({
      id: c.id,
      entity: 'shop',
      name,
      action: c.isDeleted ? 'delete' : existsInBase ? 'update' : 'create',
      status: c.status,
      updatedAt: c.updatedAt,
    });
  }

  for (const c of reviewChanges) {
    const existsInBase = await db.localReviews.get(c.id);
    // Resolve shop name from change itself, or from shopNameMap, or bucket A
    let shopName = shopNameMap.get(c.shopId);
    if (!shopName) {
      const baseShop = await db.localShops.get(c.shopId);
      shopName = baseShop?.name;
    }
    entries.push({
      id: c.id,
      entity: 'review',
      name: c.content ? (c.content.length > 20 ? c.content.slice(0, 20) + '...' : c.content) : '(点评)',
      action: c.isDeleted ? 'delete' : existsInBase ? 'update' : 'create',
      status: c.status,
      updatedAt: c.updatedAt,
      shopId: c.shopId,
      shopName,
    });
  }

  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function revertChange(entity: 'shop' | 'review', id: string): Promise<void> {
  if (entity === 'shop') {
    await db.shopChanges.delete(id);
  } else {
    await db.reviewChanges.delete(id);
  }
}

// ─── 响应式 hooks ──────────────────────────────────────────────────────────────

export function useMergedShops() {
  return useLiveQuery(
    async () => {
      try {
        return await getMergedShops();
      } catch {
        return [] as MergedShop[];
      }
    },
    [],
  );
}

export function useMergedReviews(shopId?: string) {
  return useLiveQuery(async () => {
    const all = await getMergedReviews();
    if (shopId) return all.filter((r) => r.shopId === shopId);
    return all;
  }, [shopId]);
}

export function useAllChanges() {
  return useLiveQuery(() => getAllChanges(), []);
}

// ─── Re-exports ────────────────────────────────────────────────────────────────

export { useLiveQuery };
