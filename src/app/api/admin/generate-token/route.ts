import { db } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/auth';
import { cleanShortText } from '@/lib/server/change-validation';
import { consumeRate, getClientIp, json, readJsonBody } from '@/lib/server/security';
import type { UserTokenRole } from '@/lib/types';
import crypto from 'crypto';

function normalizeRole(role: unknown): UserTokenRole | null {
  if (role === 'normal' || role === 'trusted') return role;
  return null;
}

function isUserToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const rows = db
      .prepare('SELECT token, nickname, remark, role, createdAt FROM user_tokens ORDER BY createdAt DESC')
      .all() as { token: string; nickname: string; remark: string; role?: string; createdAt: string }[];

    const tokens = rows.map((row) => ({
      ...row,
      role: row.role === 'trusted' ? 'trusted' : 'normal',
    }));

    return json({ tokens });
  } catch (err) {
    console.error('[admin/generate-token] GET error:', err instanceof Error ? err.message : 'unknown');
    return json({ error: '获取失败' }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;
    if (!consumeRate(`gen-token:${getClientIp(req)}`, 30, 60 * 60 * 1000)) {
      return json({ error: '尝试过于频繁，请稍后再试' }, 429);
    }

    const body = await readJsonBody(req);
    if (!body.ok) return body.response;
    const record = body.value && typeof body.value === 'object' && !Array.isArray(body.value)
      ? body.value as { remark?: unknown; role?: unknown }
      : {};

    const role = normalizeRole(record.role) ?? 'normal';
    const userToken = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO user_tokens (token, nickname, createdAt, remark, role) VALUES (?, ?, ?, ?, ?)'
    ).run(userToken, '', now, cleanShortText(record.remark, 80), role);

    return json({ success: true, token: userToken, role });
  } catch (err) {
    console.error('[admin/generate-token] POST error:', err instanceof Error ? err.message : 'unknown');
    return json({ error: '生成失败' }, 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await readJsonBody(req);
    if (!body.ok) return body.response;
    const record = body.value && typeof body.value === 'object' && !Array.isArray(body.value)
      ? body.value as { userToken?: unknown; role?: unknown }
      : {};

    if (!isUserToken(record.userToken)) {
      return json({ error: '要更新的 token 不能为空' }, 400);
    }
    const role = normalizeRole(record.role);
    if (!role) {
      return json({ error: '无效的身份角色，可选: normal, trusted' }, 400);
    }

    const result = db.prepare('UPDATE user_tokens SET role = ? WHERE token = ?').run(role, record.userToken);
    if (result.changes === 0) {
      return json({ error: 'Token 不存在' }, 404);
    }

    return json({ success: true, role });
  } catch (err) {
    console.error('[admin/generate-token] PATCH error:', err instanceof Error ? err.message : 'unknown');
    return json({ error: '更新失败' }, 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await readJsonBody(req);
    if (!body.ok) return body.response;
    const userToken = body.value && typeof body.value === 'object' && !Array.isArray(body.value)
      ? (body.value as { userToken?: unknown }).userToken
      : undefined;

    if (!isUserToken(userToken)) {
      return json({ error: '要删除的 token 不能为空' }, 400);
    }

    const result = db.prepare('DELETE FROM user_tokens WHERE token = ?').run(userToken);
    if (result.changes === 0) {
      return json({ error: 'Token 不存在' }, 404);
    }

    return json({ success: true });
  } catch (err) {
    console.error('[admin/generate-token] DELETE error:', err instanceof Error ? err.message : 'unknown');
    return json({ error: '删除失败' }, 500);
  }
}
