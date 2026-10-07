import { randomBytes, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number; limit: number };
const hits = new Map<string, Bucket>();

export function tokensEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last.slice(0, 64);
  }
  return 'unknown';
}

function pruneHits(now: number) {
  if (hits.size < 4000) return;
  for (const [key, bucket] of hits) {
    if (bucket.resetAt <= now) hits.delete(key);
  }
}

export function isLimited(key: string): boolean {
  const now = Date.now();
  const bucket = hits.get(key);
  if (!bucket) return false;
  if (bucket.resetAt <= now) {
    hits.delete(key);
    return false;
  }
  return bucket.count >= bucket.limit;
}

export function recordHit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  pruneHits(now);
  const bucket = hits.get(key);
  if (!bucket || bucket.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs, limit });
    return;
  }
  bucket.count += 1;
  bucket.limit = limit;
}

/** Count this call. Returns false when the call exceeds the limit. */
export function consumeRate(key: string, limit: number, windowMs: number): boolean {
  recordHit(key, limit, windowMs);
  const bucket = hits.get(key);
  return !!bucket && bucket.count <= limit;
}

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return null;
  const token = match[1];
  if (token.length === 0 || token.length > 256) return null;
  return token;
}

export function json(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(extraHeaders || {}),
    },
  });
}

export function tooManyRequests() {
  return json({ ok: false, error: '尝试过于频繁，请稍后再试' }, 429, { 'Retry-After': '60' });
}

export async function readJsonBody(request: Request, maxBytes = 256 * 1024): Promise<
  { ok: true; value: unknown } | { ok: false; response: NextResponse }
> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, response: json({ ok: false, error: '请求体过大' }, 413) };
  }
  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: json({ ok: false, error: '无法读取请求' }, 400) };
  }
  if (raw.length > maxBytes) {
    return { ok: false, response: json({ ok: false, error: '请求体过大' }, 413) };
  }
  if (!raw) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, response: json({ ok: false, error: '请求格式无效' }, 400) };
  }
}

export function newSyncId(): string {
  return `sync_${randomBytes(16).toString('hex')}`;
}
