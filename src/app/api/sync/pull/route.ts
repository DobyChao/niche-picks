import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateUser } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const since = searchParams.get('since') || '1970-01-01T00:00:00Z';

    if (!token) {
      return NextResponse.json({ ok: false, error: '缺少 token' }, { status: 401 });
    }

    const authResult = authenticateUser(token);
    if (!authResult.success) {
      return NextResponse.json({ ok: false, error: '认证失败' }, { status: 401 });
    }

    const shops = db.prepare('SELECT * FROM shops WHERE updatedAt > ?').all(since);
    const reviews = db.prepare('SELECT * FROM reviews WHERE updatedAt > ?').all(since);
    const pendingBatches = db.prepare('SELECT syncId, status FROM pending_syncs WHERE userToken = ?').all(token);

    return NextResponse.json({
      ok: true,
      shops,
      reviews,
      syncStatuses: pendingBatches,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[sync/pull] error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
