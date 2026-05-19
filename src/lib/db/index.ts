import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { LocalShop, LocalReview, LocalChangeLog, ChangeLogItem, SyncStatus } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

class LocalDB extends Dexie {
  shops!: Table<LocalShop, string>;
  reviews!: Table<LocalReview, string>;
  changelog!: Table<LocalChangeLog, number>;

  constructor() {
    super('XiaozhongReviewDB');
    this.version(1).stores({
      shops: 'id, category, isDeleted, _syncStatus',
      reviews: 'id, shopId, visitDate, isDeleted, _syncStatus',
      changelog: '++id, entity, entityId, timestamp',
    });
  }
}

export const db = new LocalDB();

// ─── Shop helpers ──────────────────────────────────────────────────────────────

export async function addShop(
  data: Omit<LocalShop, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt' | '_syncStatus'>,
): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();

  const shop: LocalShop = {
    ...data,
    id,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    _syncStatus: 'local_modified' as SyncStatus,
  };

  const logItem: ChangeLogItem = {
    action: 'create',
    entity: 'shop',
    entityId: id,
    snapshot: shop,
    timestamp: now,
  };

  await db.transaction('rw', db.shops, db.changelog, async () => {
    await db.shops.add(shop);
    await db.changelog.add(logItem);
  });

  return id;
}

export async function updateShop(
  id: string,
  data: Partial<LocalShop>,
): Promise<void> {
  const now = new Date().toISOString();

  const logItem: ChangeLogItem = {
    action: 'update',
    entity: 'shop',
    entityId: id,
    snapshot: data,
    timestamp: now,
  };

  await db.transaction('rw', db.shops, db.changelog, async () => {
    await db.shops.update(id, {
      ...data,
      updatedAt: now,
      _syncStatus: 'local_modified' as SyncStatus,
    });
    await db.changelog.add(logItem);
  });
}

export async function deleteShop(id: string): Promise<void> {
  const now = new Date().toISOString();

  const logItem: ChangeLogItem = {
    action: 'delete',
    entity: 'shop',
    entityId: id,
    snapshot: null,
    timestamp: now,
  };

  await db.transaction('rw', db.shops, db.changelog, async () => {
    await db.shops.update(id, {
      isDeleted: true,
      updatedAt: now,
      _syncStatus: 'local_modified' as SyncStatus,
    });
    await db.changelog.add(logItem);
  });
}

// ─── Review helpers ────────────────────────────────────────────────────────────

export async function addReview(
  data: Omit<LocalReview, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt' | '_syncStatus'>,
): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();

  const review: LocalReview = {
    ...data,
    id,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    _syncStatus: 'local_modified' as SyncStatus,
  };

  const logItem: ChangeLogItem = {
    action: 'create',
    entity: 'review',
    entityId: id,
    snapshot: review,
    timestamp: now,
  };

  await db.transaction('rw', db.reviews, db.changelog, async () => {
    await db.reviews.add(review);
    await db.changelog.add(logItem);
  });

  return id;
}

export async function updateReview(
  id: string,
  data: Partial<LocalReview>,
): Promise<void> {
  const now = new Date().toISOString();

  const logItem: ChangeLogItem = {
    action: 'update',
    entity: 'review',
    entityId: id,
    snapshot: data,
    timestamp: now,
  };

  await db.transaction('rw', db.reviews, db.changelog, async () => {
    await db.reviews.update(id, {
      ...data,
      updatedAt: now,
      _syncStatus: 'local_modified' as SyncStatus,
    });
    await db.changelog.add(logItem);
  });
}

export async function deleteReview(id: string): Promise<void> {
  const now = new Date().toISOString();

  const logItem: ChangeLogItem = {
    action: 'delete',
    entity: 'review',
    entityId: id,
    snapshot: null,
    timestamp: now,
  };

  await db.transaction('rw', db.reviews, db.changelog, async () => {
    await db.reviews.update(id, {
      isDeleted: true,
      updatedAt: now,
      _syncStatus: 'local_modified' as SyncStatus,
    });
    await db.changelog.add(logItem);
  });
}

// ─── Query helpers ─────────────────────────────────────────────────────────────

export async function getActiveShops(): Promise<LocalShop[]> {
  return db.shops.filter((s) => !s.isDeleted).toArray();
}

export async function getActiveReviews(): Promise<LocalReview[]> {
  return db.reviews.filter((r) => !r.isDeleted).toArray();
}

// ─── Re-exports ────────────────────────────────────────────────────────────────

export { useLiveQuery };
