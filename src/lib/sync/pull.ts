import { db } from '@/lib/db';
import { getSavedSyncIdentity } from '@/lib/sync/auth';

export type AutoPullResult =
  | { status: 'skipped'; reason: 'no-identity' | 'throttled' }
  | { status: 'success'; shopCount: number; reviewCount: number }
  | { status: 'error'; error: string };

export async function pullRemoteData(userToken: string) {
  const res = await fetch(
    `/api/sync/pull?token=${encodeURIComponent(userToken)}&since=1970-01-01T00:00:00Z`,
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `拉取失败 (HTTP ${res.status})`);
  }

  const { shops = [], reviews = [], syncStatuses = [] } = data;

  // 1. 全量覆盖桶 A
  await db.transaction('rw', [db.localShops, db.localReviews], async () => {
    await db.localShops.clear();
    for (const shop of shops) {
      await db.localShops.put({
        ...shop,
        tags: typeof shop.tags === 'string' ? JSON.parse(shop.tags) : shop.tags,
        photos: typeof shop.photos === 'string' ? JSON.parse(shop.photos) : (shop.photos || []),
        isDeleted: !!shop.isDeleted,
      });
    }

    await db.localReviews.clear();
    for (const review of reviews) {
      await db.localReviews.put({
        ...review,
        tags: typeof review.tags === 'string' ? JSON.parse(review.tags) : review.tags,
        isDeleted: !!review.isDeleted,
      });
    }
  });

  // 2. GC 桶 B：删除已 approved/rejected 批次的记录
  const batchStatusMap = new Map<string, string>();
  for (const batch of syncStatuses || []) {
    batchStatusMap.set(batch.syncId, batch.status);
  }

  await db.transaction('rw', [db.shopChanges, db.reviewChanges], async () => {
    const allShopChanges = await db.shopChanges.toArray();
    const allReviewChanges = await db.reviewChanges.toArray();

    for (const c of allShopChanges) {
      if (c.syncId && batchStatusMap.get(c.syncId) !== 'pending') {
        await db.shopChanges.delete(c.id);
      }
    }
    for (const c of allReviewChanges) {
      if (c.syncId && batchStatusMap.get(c.syncId) !== 'pending') {
        await db.reviewChanges.delete(c.id);
      }
    }
  });

  return { success: true, shopCount: shops.length, reviewCount: reviews.length };
}

const AUTO_PULL_THROTTLE_MS = 10_000;
let lastAutoPullAt = 0;

export async function autoPullIfReady(force = false): Promise<AutoPullResult> {
  if (typeof window === 'undefined') {
    return { status: 'skipped', reason: 'no-identity' };
  }

  const { token } = getSavedSyncIdentity();
  if (!token) {
    return { status: 'skipped', reason: 'no-identity' };
  }

  if (!force && Date.now() - lastAutoPullAt < AUTO_PULL_THROTTLE_MS) {
    return { status: 'skipped', reason: 'throttled' };
  }

  try {
    const result = await pullRemoteData(token);
    lastAutoPullAt = Date.now();
    return {
      status: 'success',
      shopCount: result.shopCount,
      reviewCount: result.reviewCount,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
