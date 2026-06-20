import { db } from './db';
import type { ChangeLogItem } from '@/lib/types';

const upsertShop = db.prepare(`
  INSERT OR REPLACE INTO shops (id, name, address, category, phone, businessHours, lng, lat, tags, amapPoiId, photos, isDeleted, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const upsertReview = db.prepare(`
  INSERT OR REPLACE INTO reviews (id, shopId, author, rating, content, tags, avgPrice, visitDate, isDeleted, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export function applyChangesToDb(changes: ChangeLogItem[]): number {
  db.transaction(() => {
    for (const change of changes) {
      const s = change.snapshot;
      if (change.entity === 'shop') {
        upsertShop.run(
          s.id,
          s.name || '',
          s.address || '',
          s.category || '',
          s.phone || '',
          s.businessHours || '',
          s.lng ?? null,
          s.lat ?? null,
          JSON.stringify(s.tags || []),
          s.amapPoiId || '',
          JSON.stringify(s.photos || []),
          s.isDeleted ? 1 : 0,
          s.createdAt || new Date().toISOString(),
          s.updatedAt || new Date().toISOString(),
        );
      } else if (change.entity === 'review') {
        upsertReview.run(
          s.id,
          s.shopId,
          s.author || '',
          s.rating ?? 0,
          s.content || '',
          JSON.stringify(s.tags || []),
          s.avgPrice ?? null,
          s.visitDate ?? null,
          s.isDeleted ? 1 : 0,
          s.createdAt || new Date().toISOString(),
          s.updatedAt || new Date().toISOString(),
        );
      }
    }
  })();

  return changes.length;
}
