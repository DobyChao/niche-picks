import { db } from '@/lib/server/db';
import { authenticateUser } from '@/lib/server/auth';
import { applyChangesToDb } from '@/lib/server/merge-changes';
import { cleanAuthorName, validateChanges } from '@/lib/server/change-validation';
import {
  consumeRate,
  getClientIp,
  isLimited,
  json,
  newSyncId,
  readBearerToken,
  readJsonBody,
  recordHit,
  tooManyRequests,
} from '@/lib/server/security';

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_FAIL_LIMIT = 20;

export async function POST(request: Request) {
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
    if (!consumeRate(`push:${ip}`, 30, 10 * 60 * 1000)) return tooManyRequests();

    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    const payload = body.value;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ ok: false, error: '请求格式无效' }, 400);
    }
    const record = payload as { authorName?: unknown; changes?: unknown };

    const validated = validateChanges(record.changes);
    if (!validated.ok) return json({ ok: false, error: validated.error }, 400);

    const authorName = cleanAuthorName(record.authorName);
    const syncId = newSyncId();
    const submittedAt = new Date().toISOString();
    const autoApprove = authResult.role === 'trusted';
    const changesJson = JSON.stringify(validated.changes);

    const insertPending = db.prepare(
      `INSERT INTO pending_syncs (syncId, userToken, authorName, changesPayload, status, submittedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    db.transaction(() => {
      insertPending.run(
        syncId,
        token,
        authorName,
        changesJson,
        autoApprove ? 'approved' : 'pending',
        submittedAt,
      );
      if (autoApprove) applyChangesToDb(validated.changes);
    })();

    return json({ ok: true, syncId, autoApproved: autoApprove });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code.startsWith('SQLITE_CONSTRAINT')) {
      return json({ ok: false, error: '变更无法写入，请确认关联店铺是否存在' }, 400);
    }
    console.error('[sync/push] error:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: '服务器错误' }, 500);
  }
}
