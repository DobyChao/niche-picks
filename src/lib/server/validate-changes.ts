import type { ChangeLogItem } from '@/lib/types';

// Server-side validation for pushed/approved change batches. The client is
// untrusted: snapshots are written into SQLite as-is, so every field needs a
// type check and a size cap before it reaches the DB.

export const MAX_CHANGES_PER_BATCH = 200;
// Trusted tokens auto-approve on push; a batch dominated by deletes gets
// demoted to the normal approval queue even for them.
export const TRUSTED_DELETE_DEMOTION_THRESHOLD = 20;

const MAX_ID_LEN = 100;
const MAX_SHORT_STR = 200;
const MAX_ADDRESS_LEN = 500;
const MAX_CONTENT_LEN = 5000;
const MAX_TAG_COUNT = 20;
const MAX_TAG_LEN = 50;
const MAX_PHOTO_COUNT = 20;
const MAX_PHOTO_LEN = 1000;
const MAX_TIMESTAMP_LEN = 40;

export type ValidationResult =
  | { ok: true; changes: ChangeLogItem[] }
  | { ok: false; error: string };

function isPlainString(v: unknown, maxLen: number): v is string {
  return typeof v === 'string' && v.length <= maxLen;
}

function isOptionalString(v: unknown, maxLen: number): boolean {
  if (v === undefined || v === null || v === '') return true;
  return isPlainString(v, maxLen);
}

function isValidTags(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (!Array.isArray(v) || v.length > MAX_TAG_COUNT) return false;
  return v.every((t) => isPlainString(t, MAX_TAG_LEN));
}

function isValidPhotos(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (!Array.isArray(v) || v.length > MAX_PHOTO_COUNT) return false;
  return v.every((p) => isPlainString(p, MAX_PHOTO_LEN));
}

function isValidCoord(v: unknown, min: number, max: number): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  return v >= min && v <= max;
}

function isValidTimestamp(v: unknown): boolean {
  return v === undefined || v === null || isPlainString(v, MAX_TIMESTAMP_LEN);
}

function validateShopSnapshot(snapshot: Record<string, unknown>): string | null {
  if (!isPlainString(snapshot.id, MAX_ID_LEN)) return 'shop.id 无效';
  if (!isOptionalString(snapshot.name, MAX_SHORT_STR)) return 'shop.name 过长';
  if (!isOptionalString(snapshot.address, MAX_ADDRESS_LEN)) return 'shop.address 过长';
  if (!isOptionalString(snapshot.category, MAX_SHORT_STR)) return 'shop.category 过长';
  if (!isOptionalString(snapshot.phone, MAX_SHORT_STR)) return 'shop.phone 过长';
  if (!isOptionalString(snapshot.businessHours, MAX_SHORT_STR)) return 'shop.businessHours 过长';
  if (!isValidCoord(snapshot.lng, -180, 180)) return 'shop.lng 超出范围';
  if (!isValidCoord(snapshot.lat, -90, 90)) return 'shop.lat 超出范围';
  if (!isValidTags(snapshot.tags)) return 'shop.tags 无效';
  if (!isValidPhotos(snapshot.photos)) return 'shop.photos 无效';
  if (!isOptionalString(snapshot.amapPoiId, MAX_SHORT_STR)) return 'shop.amapPoiId 过长';
  if (snapshot.isDeleted !== undefined && typeof snapshot.isDeleted !== 'boolean') return 'shop.isDeleted 无效';
  if (!isValidTimestamp(snapshot.createdAt)) return 'shop.createdAt 无效';
  if (!isValidTimestamp(snapshot.updatedAt)) return 'shop.updatedAt 无效';
  return null;
}

function validateReviewSnapshot(snapshot: Record<string, unknown>): string | null {
  if (!isPlainString(snapshot.id, MAX_ID_LEN)) return 'review.id 无效';
  if (!isPlainString(snapshot.shopId, MAX_ID_LEN)) return 'review.shopId 无效';
  if (!isOptionalString(snapshot.author, MAX_SHORT_STR)) return 'review.author 过长';
  // rating may be absent — applyChangesToDb defaults it to 0
  if (
    snapshot.rating !== undefined &&
    snapshot.rating !== null &&
    (typeof snapshot.rating !== 'number' || !Number.isFinite(snapshot.rating) || snapshot.rating < 0 || snapshot.rating > 5)
  ) {
    return 'review.rating 必须是 0-5 之间的数字';
  }
  if (!isOptionalString(snapshot.content, MAX_CONTENT_LEN)) return 'review.content 过长';
  if (!isValidTags(snapshot.tags)) return 'review.tags 无效';
  if (snapshot.avgPrice !== undefined && snapshot.avgPrice !== null) {
    if (typeof snapshot.avgPrice !== 'number' || !Number.isFinite(snapshot.avgPrice) || snapshot.avgPrice < 0 || snapshot.avgPrice > 10_000_000) {
      return 'review.avgPrice 无效';
    }
  }
  if (!isOptionalString(snapshot.visitDate, MAX_TIMESTAMP_LEN)) return 'review.visitDate 无效';
  if (snapshot.isDeleted !== undefined && typeof snapshot.isDeleted !== 'boolean') return 'review.isDeleted 无效';
  if (!isValidTimestamp(snapshot.createdAt)) return 'review.createdAt 无效';
  if (!isValidTimestamp(snapshot.updatedAt)) return 'review.updatedAt 无效';
  return null;
}

export function validateChanges(input: unknown): ValidationResult {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'changes 必须是数组' };
  }
  if (input.length === 0) {
    return { ok: false, error: 'changes 不能为空' };
  }
  if (input.length > MAX_CHANGES_PER_BATCH) {
    return { ok: false, error: `单次最多提交 ${MAX_CHANGES_PER_BATCH} 条变更` };
  }

  for (const change of input) {
    if (typeof change !== 'object' || change === null) {
      return { ok: false, error: '变更项格式不正确' };
    }
    const c = change as Record<string, unknown>;
    if (c.entity !== 'shop' && c.entity !== 'review') {
      return { ok: false, error: 'entity 必须是 shop 或 review' };
    }
    if (c.action !== 'create' && c.action !== 'update' && c.action !== 'delete') {
      return { ok: false, error: 'action 必须是 create / update / delete' };
    }
    if (!isPlainString(c.entityId, MAX_ID_LEN)) {
      return { ok: false, error: 'entityId 无效' };
    }
    if (typeof c.snapshot !== 'object' || c.snapshot === null || Array.isArray(c.snapshot)) {
      return { ok: false, error: 'snapshot 格式不正确' };
    }

    const snapshotError =
      c.entity === 'shop'
        ? validateShopSnapshot(c.snapshot as Record<string, unknown>)
        : validateReviewSnapshot(c.snapshot as Record<string, unknown>);
    if (snapshotError) {
      return { ok: false, error: snapshotError };
    }
  }

  return { ok: true, changes: input as ChangeLogItem[] };
}
