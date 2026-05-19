import { db } from '@/lib/db';

export async function pushLocalChanges(userToken: string, authorName: string) {
  // 1. Get all unsynced changelog entries
  const logs = await db.changelog.toArray();
  if (logs.length === 0) return { success: true, message: '没有需要同步的变更' };

  // 2. POST to /api/sync/push
  const res = await fetch('/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: userToken, authorName, changes: logs }),
  });

  if (!res.ok) {
    const err = await res.json();
    return { success: false, message: err.error || '同步失败' };
  }

  const { syncId } = await res.json();

  // 3. Update local sync status to 'pending' for affected entities
  await db.transaction('rw', [db.shops, db.reviews, db.changelog], async () => {
    for (const log of logs) {
      if (log.entity === 'shop') {
        await db.shops.update(log.entityId, { _syncStatus: 'pending' as const });
      } else {
        await db.reviews.update(log.entityId, { _syncStatus: 'pending' as const });
      }
    }
    // 4. Clear changelog after successful push
    await db.changelog.clear();
  });

  return { success: true, syncId, count: logs.length };
}
