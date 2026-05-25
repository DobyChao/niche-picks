import { db } from '@/lib/db';
import { validateSyncToken } from '@/lib/sync/auth';
import type { ChangeLogItem } from '@/lib/types';

export async function pushLocalChanges(userToken: string, authorName: string) {
  const draftShopChanges = await db.shopChanges.where('status').equals('draft').toArray();
  const draftReviewChanges = await db.reviewChanges.where('status').equals('draft').toArray();

  if (draftShopChanges.length === 0 && draftReviewChanges.length === 0) {
    await validateSyncToken(userToken);
    return { success: true, message: '没有需要同步的变更' };
  }

  const changes: ChangeLogItem[] = [];
  const now = new Date().toISOString();

  for (const c of draftShopChanges) {
    const { status: _s, syncId: _sid, ...snapshot } = c;
    const existsInBase = await db.localShops.get(c.id);
    changes.push({
      entity: 'shop',
      entityId: c.id,
      action: c.isDeleted ? 'delete' : existsInBase ? 'update' : 'create',
      snapshot,
      timestamp: now,
    });
  }

  for (const c of draftReviewChanges) {
    const { status: _s, syncId: _sid, ...snapshot } = c;
    const existsInBase = await db.localReviews.get(c.id);
    changes.push({
      entity: 'review',
      entityId: c.id,
      action: c.isDeleted ? 'delete' : existsInBase ? 'update' : 'create',
      snapshot,
      timestamp: now,
    });
  }

  const res = await fetch('/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: userToken, authorName, changes }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `同步失败 (HTTP ${res.status})`);
  }

  const { syncId } = await res.json();

  await db.transaction('rw', [db.shopChanges, db.reviewChanges], async () => {
    for (const c of draftShopChanges) {
      await db.shopChanges.update(c.id, { status: 'pending', syncId });
    }
    for (const c of draftReviewChanges) {
      await db.reviewChanges.update(c.id, { status: 'pending', syncId });
    }
  });

  return { success: true, syncId, count: changes.length };
}
