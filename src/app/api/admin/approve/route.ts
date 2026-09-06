import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin, clientIp, isAuthBlocked, recordAuthFailure } from '@/lib/server/auth';
import { applyChangesToDb } from '@/lib/server/merge-changes';
import { validateChanges } from '@/lib/server/validate-changes';
import type { PendingSync } from '@/lib/types';

const markApproved = db.prepare(`UPDATE pending_syncs SET status = 'approved' WHERE syncId = ?`);

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    if (isAuthBlocked(ip)) {
      return NextResponse.json({ ok: false, error: '尝试过于频繁，请稍后再试' }, { status: 429 });
    }

    const body = await request.json();
    const { token, syncId } = body;

    if (!token || !syncId) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    const auth = authenticateAdmin(token);
    if (!auth.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
    }

    const batch = db.prepare('SELECT * FROM pending_syncs WHERE syncId = ?').get(syncId) as
      | PendingSync
      | undefined;
    if (!batch) {
      return NextResponse.json({ ok: false, error: 'batch_not_found' }, { status: 404 });
    }
    if (batch.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'batch_not_pending' }, { status: 400 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(batch.changesPayload);
    } catch {
      // A corrupt payload used to 500 forever; surface it so the admin can
      // reject the batch instead.
      return NextResponse.json({ ok: false, error: 'batch_payload_corrupt' }, { status: 400 });
    }

    const validated = validateChanges(parsed);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: `batch_failed_validation: ${validated.error}` }, { status: 400 });
    }

    // Apply + mark-approved in one transaction — a partial apply must not
    // mark the batch approved.
    db.transaction(() => {
      applyChangesToDb(validated.changes);
      markApproved.run(syncId);
    })();

    return NextResponse.json({ ok: true, merged: validated.changes.length });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
