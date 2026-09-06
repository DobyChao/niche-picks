import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin, clientIp, isAuthBlocked, recordAuthFailure } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    if (isAuthBlocked(ip)) {
      return NextResponse.json({ ok: false, error: '尝试过于频繁，请稍后再试' }, { status: 429 });
    }

    const body = await request.json();
    const { token, syncId }: { token?: string; syncId?: string } = body;

    if (!token) {
      return NextResponse.json({ ok: false, error: '缺少 token' }, { status: 401 });
    }

    const authResult = authenticateAdmin(token);
    if (!authResult.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ ok: false, error: '认证失败' }, { status: 401 });
    }

    if (!syncId) {
      return NextResponse.json({ ok: false, error: '缺少 syncId' }, { status: 400 });
    }

    db.prepare('UPDATE pending_syncs SET status = ? WHERE syncId = ?').run('rejected', syncId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/reject] error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
