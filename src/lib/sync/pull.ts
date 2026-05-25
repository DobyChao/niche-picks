import { db } from '@/lib/db';

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
