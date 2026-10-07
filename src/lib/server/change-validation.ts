import type { ChangeLogItem } from '../types';

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CHANGES = 100;

function clip(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string') return '';
  const stripped = value.replace(
    multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g,
    '',
  );
  return stripped.trim().slice(0, max);
}

function asBool(value: unknown): boolean {
  return value === true || value === 1;
}

function asCoord(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => clip(tag, 30))
    .filter(Boolean);
}

function asPhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const photos: string[] = [];
  for (const item of value.slice(0, 9)) {
    if (typeof item !== 'string') continue;
    const url = item.trim();
    if (!/^https:\/\/.{1,480}$/i.test(url)) continue;
    photos.push(url);
  }
  return photos;
}

function asCreatedAt(value: unknown, now: string): string {
  if (typeof value !== 'string' || value.length > 40) return now;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return now;
  if (time < Date.parse('2000-01-01T00:00:00Z') || time > Date.now() + 24 * 60 * 60 * 1000) return now;
  return new Date(time).toISOString();
}

function asRating(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 5) return null;
  return Math.round(value * 10) / 10;
}

function asPrice(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1_000_000) return null;
  return value;
}

export function cleanAuthorName(value: unknown): string {
  const name = clip(value, 40);
  return name || '匿名';
}

export function cleanShortText(value: unknown, max: number, multiline = false): string {
  return clip(value, max, multiline);
}

export type ChangeValidation =
  | { ok: true; changes: ChangeLogItem[] }
  | { ok: false; error: string };

export function validateChanges(input: unknown, now = new Date().toISOString()): ChangeValidation {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_CHANGES) {
    return { ok: false, error: '变更数据不合法' };
  }

  const changes: ChangeLogItem[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') return { ok: false, error: '变更数据不合法' };
    const raw = item as Record<string, unknown>;
    if (raw.entity !== 'shop' && raw.entity !== 'review') return { ok: false, error: '变更数据不合法' };
    if (raw.action !== 'create' && raw.action !== 'update' && raw.action !== 'delete') {
      return { ok: false, error: '变更数据不合法' };
    }
    if (typeof raw.entityId !== 'string' || !ID_RE.test(raw.entityId)) {
      return { ok: false, error: '变更数据不合法' };
    }
    const snapshot = raw.snapshot;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return { ok: false, error: '变更数据不合法' };
    }
    const s = snapshot as Record<string, unknown>;
    if (s.id !== raw.entityId) return { ok: false, error: '变更数据不合法' };

    if (raw.entity === 'shop') {
      changes.push({
        entity: 'shop',
        entityId: raw.entityId,
        action: raw.action,
        timestamp: now,
        snapshot: {
          id: raw.entityId,
          name: clip(s.name, 80),
          address: clip(s.address, 200),
          category: clip(s.category, 40),
          phone: clip(s.phone, 40),
          businessHours: clip(s.businessHours, 80),
          lng: asCoord(s.lng, -180, 180),
          lat: asCoord(s.lat, -90, 90),
          tags: asTags(s.tags),
          amapPoiId: clip(s.amapPoiId, 64),
          photos: asPhotos(s.photos),
          isDeleted: asBool(s.isDeleted),
          createdAt: asCreatedAt(s.createdAt, now),
          updatedAt: now,
        },
      });
      continue;
    }

    if (typeof s.shopId !== 'string' || !ID_RE.test(s.shopId)) {
      return { ok: false, error: '变更数据不合法' };
    }
    const rating = asRating(s.rating);
    if (rating == null) return { ok: false, error: '变更数据不合法' };
    changes.push({
      entity: 'review',
      entityId: raw.entityId,
      action: raw.action,
      timestamp: now,
      snapshot: {
        id: raw.entityId,
        shopId: s.shopId,
        author: clip(s.author, 40) || '匿名',
        rating,
        content: clip(s.content, 2000, true),
        tags: asTags(s.tags),
        avgPrice: asPrice(s.avgPrice),
        visitDate: s.visitDate == null || s.visitDate === '' ? null : clip(s.visitDate, 40) || null,
        isDeleted: asBool(s.isDeleted),
        createdAt: asCreatedAt(s.createdAt, now),
        updatedAt: now,
      },
    });
  }

  return { ok: true, changes };
}
