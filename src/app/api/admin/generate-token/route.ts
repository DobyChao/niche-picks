import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin, extractToken, clientIp, isAuthBlocked, recordAuthFailure } from '@/lib/server/auth';
import type { UserTokenRole } from '@/lib/types';
import crypto from 'crypto';

function normalizeRole(role: unknown): UserTokenRole | null {
  if (role === 'normal' || role === 'trusted') return role;
  return null;
}

function authBlockedResponse() {
  return NextResponse.json({ error: '尝试过于频繁，请稍后再试' }, { status: 429 });
}

// GET — list all user tokens
export async function GET(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (isAuthBlocked(ip)) {
      return authBlockedResponse();
    }

    const token = extractToken(req);

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: '管理员 token 不能为空' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ error: '管理员认证失败' }, { status: 401 });
    }

    const rows = db
      .prepare(
        'SELECT token, nickname, remark, role, createdAt FROM user_tokens ORDER BY createdAt DESC'
      )
      .all() as { token: string; nickname: string; remark: string; role?: string; createdAt: string }[];

    const tokens = rows.map((row) => ({
      ...row,
      role: row.role === 'trusted' ? 'trusted' : 'normal',
    }));

    return NextResponse.json({ tokens });
  } catch (err) {
    console.error('[admin/generate-token] GET error:', err);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST — generate a new user token
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (isAuthBlocked(ip)) {
      return authBlockedResponse();
    }

    const body = await req.json();
    const { token, remark, role: roleInput } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: '管理员 token 不能为空' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ error: '管理员认证失败' }, { status: 401 });
    }

    const role = normalizeRole(roleInput) ?? 'normal';
    const userToken = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO user_tokens (token, nickname, createdAt, remark, role) VALUES (?, ?, ?, ?, ?)'
    ).run(userToken, '', now, String(remark || '').slice(0, 200), role);

    return NextResponse.json({ success: true, token: userToken, role });
  } catch (err) {
    console.error('[admin/generate-token] POST error:', err);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}

// PATCH — update token role
export async function PATCH(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (isAuthBlocked(ip)) {
      return authBlockedResponse();
    }

    const body = await req.json();
    const { token, userToken, role: roleInput } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: '管理员 token 不能为空' }, { status: 400 });
    }
    if (!userToken || typeof userToken !== 'string') {
      return NextResponse.json({ error: '要更新的 token 不能为空' }, { status: 400 });
    }

    const role = normalizeRole(roleInput);
    if (!role) {
      return NextResponse.json({ error: '无效的身份角色，可选: normal, trusted' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ error: '管理员认证失败' }, { status: 401 });
    }

    const result = db.prepare('UPDATE user_tokens SET role = ? WHERE token = ?').run(role, userToken);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Token 不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error('[admin/generate-token] PATCH error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE — remove a user token
export async function DELETE(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (isAuthBlocked(ip)) {
      return authBlockedResponse();
    }

    const body = await req.json();
    const { token, userToken } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: '管理员 token 不能为空' }, { status: 400 });
    }
    if (!userToken || typeof userToken !== 'string') {
      return NextResponse.json({ error: '要删除的 token 不能为空' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ error: '管理员认证失败' }, { status: 401 });
    }

    const result = db.prepare('DELETE FROM user_tokens WHERE token = ?').run(userToken);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Token 不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/generate-token] DELETE error:', err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
