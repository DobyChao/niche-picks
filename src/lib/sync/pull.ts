import { db } from '@/lib/db';

export async function pullRemoteData(userToken: string) {
  const lastSyncTime = typeof window !== 'undefined' 
    ? localStorage.getItem('lastSyncTime') || '1970-01-01T00:00:00Z'
    : '1970-01-01T00:00:00Z';

  const res = await fetch(`/api/sync/pull?token=${encodeURIComponent(userToken)}&since=${encodeURIComponent(lastSyncTime)}`);
  if (!res.ok) return { success: false };

  const { shops, reviews, syncStatuses, serverTime } = await res.json();

  await db.transaction('rw', [db.shops, db.reviews], async () => {
    // 1. Apply server data (including tombstones)
    for (const shop of shops) {
      await db.shops.put({
        ...shop,
        tags: typeof shop.tags === 'string' ? JSON.parse(shop.tags) : shop.tags,
        isDeleted: !!shop.isDeleted,
        _syncStatus: 'synced' as const,
      });
    }

    for (const review of reviews) {
      await db.reviews.put({
        ...review,
        tags: typeof review.tags === 'string' ? JSON.parse(review.tags) : review.tags,
        isDeleted: !!review.isDeleted,
        _syncStatus: 'synced' as const,
      });
    }

    // 2. Handle rejected batches — reset affected entities to local_modified
    for (const batch of syncStatuses || []) {
      if (batch.status === 'rejected') {
        let changes: Array<{ entity: string; entityId: string }> = [];
        try {
          changes = batch.changesPayload ? JSON.parse(batch.changesPayload) : [];
        } catch { /* ignore malformed payload */ }

        for (const change of changes) {
          const table = change.entity === 'shop' ? db.shops : db.reviews;
          const existing = await table.get(change.entityId);
          if (existing) {
            await table.update(change.entityId, { _syncStatus: 'local_modified' as const });
          }
        }
      }
    }
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('lastSyncTime', serverTime);
  }

  return { success: true, shopCount: shops.length, reviewCount: reviews.length };
}
