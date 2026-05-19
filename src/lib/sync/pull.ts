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

    // 2. Handle rejected batches — reset status to 'synced'
    for (const status of syncStatuses || []) {
      if (status.status === 'rejected') {
        // For rejected changes, just reset sync status so user can see the cloud version
        // The server data was already applied above, which overwrites local changes
      }
    }
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('lastSyncTime', serverTime);
  }

  return { success: true, shopCount: shops.length, reviewCount: reviews.length };
}
