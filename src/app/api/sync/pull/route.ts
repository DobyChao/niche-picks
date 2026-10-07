import { db } from '@/lib/server/db';
import { authenticateUser } from '@/lib/server/auth';
import {
  getClientIp,
  isLimited,
  json,
  readBearerToken,
  recordHit,
  tooManyRequests,
} from '@/lib/server/security';

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_FAIL_LIMIT = 20;

function normalizeSince(value: string | null): string {
  if (!value || value.length > 40) return '1970-01-01T00:00:00.000Z';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return '1970-01-01T00:00:00.000Z';
  return new Date(time).toISOString();
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const authKey = `authfail:${ip}`;
    if (isLimited(authKey)) return tooManyRequests();

    const token = readBearerToken(request);
    if (!token) {
      recordHit(authKey, AUTH_FAIL_LIMIT, AUTH_WINDOW_MS);
      return json({ ok: false, error: '缺少 token' }, 401);
    }

    const authResult = authenticateUser(token);
    if (!authResult.success) {
      recordHit(authKey, AUTH_FAIL_LIMIT, AUTH_WINDOW_MS);
      return json({ ok: false, error: '认证失败' }, 401);
    }

    const since = normalizeSince(new URL(request.url).searchParams.get('since'));
    const shops = db.prepare('SELECT * FROM shops WHERE updatedAt > ?').all(since);
    const reviews = db.prepare('SELECT * FROM reviews WHERE updatedAt > ?').all(since);
    const pendingBatches = db.prepare(
      'SELECT syncId, status FROM pending_syncs WHERE userToken = ?'
    ).all(token);

    return json({
      ok: true,
      shops,
      reviews,
      syncStatuses: pendingBatches,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[sync/pull] error:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: '服务器错误' }, 500);
  }
}
