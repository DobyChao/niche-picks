import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin } from '@/lib/server/auth';
import type { UserTokenRole } from '@/lib/types';
import crypto from 'crypto';

function normalizeRole(role: unknown): UserTokenRole | null {
  if (role === 'normal' || role === 'trusted') return role;
  return null;
}

// GET — list all user tokens
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: '管理员 token 不能为空' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '获取失败' },
      { status: 500 }
    );
  }
}

// POST — generate a new user token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, remark, role: roleInput } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: '管理员 token 不能为空' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
      return NextResponse.json({ error: '管理员认证失败' }, { status: 401 });
    }

    const role = normalizeRole(roleInput) ?? 'normal';
    const userToken = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO user_tokens (token, nickname, createdAt, remark, role) VALUES (?, ?, ?, ?, ?)'
    ).run(userToken, '', now, (remark || '').trim(), role);

    return NextResponse.json({ success: true, token: userToken, role });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '生成失败' },
      { status: 500 }
    );
  }
}

// PATCH — update token role
export async function PATCH(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: '管理员认证失败' }, { status: 401 });
    }

    const result = db.prepare('UPDATE user_tokens SET role = ? WHERE token = ?').run(role, userToken);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Token 不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, role });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE — remove a user token
export async function DELETE(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: '管理员认证失败' }, { status: 401 });
    }

    const result = db.prepare('DELETE FROM user_tokens WHERE token = ?').run(userToken);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Token 不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '删除失败' },
      { status: 500 }
    );
  }
}
