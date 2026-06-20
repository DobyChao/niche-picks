import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateUser } from '@/lib/server/auth';
import { applyChangesToDb } from '@/lib/server/merge-changes';
import type { ChangeLogItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, authorName, changes }: { token: string; authorName: string; changes: ChangeLogItem[] } = body;

    if (!token) {
      return NextResponse.json({ ok: false, error: '缺少 token' }, { status: 401 });
    }

    const authResult = authenticateUser(token);
    if (!authResult.success) {
      return NextResponse.json({ ok: false, error: '认证失败' }, { status: 401 });
    }

    const syncId = `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const submittedAt = new Date().toISOString();
    const autoApprove = authResult.role === 'trusted';

    db.prepare(
      `INSERT INTO pending_syncs (syncId, userToken, authorName, changesPayload, status, submittedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(syncId, token, authorName, JSON.stringify(changes), autoApprove ? 'approved' : 'pending', submittedAt);

    if (autoApprove && changes.length > 0) {
      applyChangesToDb(changes);
    }

    return NextResponse.json({ ok: true, syncId, autoApproved: autoApprove });
  } catch (error) {
    console.error('[sync/push] error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
