import type { NextRequest } from 'next/server';

// Per-process fixed-window rate limiter. Single-instance deployment only —
// behind a multi-instance load balancer each instance would keep its own
// counters (still limits per instance, just with a higher total budget).

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

const AUTH_FAIL_LIMIT = 20;
const AUTH_FAIL_WINDOW_MS = 10 * 60_000;

export function rateLimit(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();

  // Opportunistic pruning so long-tail keys cannot grow the map unbounded.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

// Trust the proxy-added hop over client-supplied values: with a single nginx
// in front, the last X-Forwarded-For entry is the address nginx appended
// ($proxy_add_x_forwarded_for), while the first entry is attacker-controllable.
// Requires `proxy_set_header X-Real-IP $remote_addr;` (or equivalent) in nginx;
// otherwise all clients share the 'unknown' bucket, which fails closed.
export function clientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return 'unknown';
}

export function isAuthBlocked(ip: string): boolean {
  const bucket = buckets.get(`authfail:${ip}`);
  return !!bucket && bucket.count >= AUTH_FAIL_LIMIT && bucket.resetAt > Date.now();
}

export function recordAuthFailure(ip: string): void {
  rateLimit(`authfail:${ip}`, AUTH_FAIL_LIMIT, AUTH_FAIL_WINDOW_MS);
}
