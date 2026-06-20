import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin } from '@/lib/server/auth';
import { applyChangesToDb } from '@/lib/server/merge-changes';
import type { ChangeLogItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, syncId } = body;

    if (!token || !syncId) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
    }

    const batch = db.prepare('SELECT * FROM pending_syncs WHERE syncId = ?').get(syncId) as any;
    if (!batch) {
      return NextResponse.json({ ok: false, error: 'batch_not_found' }, { status: 404 });
    }
    if (batch.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'batch_not_pending' }, { status: 400 });
    }

    const changes: ChangeLogItem[] = JSON.parse(batch.changesPayload);
    const merged = applyChangesToDb(changes);

    db.prepare('UPDATE pending_syncs SET status = ? WHERE syncId = ?').run('approved', syncId);

    return NextResponse.json({ ok: true, merged });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
