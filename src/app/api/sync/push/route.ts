import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateUser, clientIp, isAuthBlocked, recordAuthFailure } from '@/lib/server/auth';
import { applyChangesToDb } from '@/lib/server/merge-changes';
import { validateChanges, TRUSTED_DELETE_DEMOTION_THRESHOLD } from '@/lib/server/validate-changes';

const insertBatch = db.prepare(
  `INSERT INTO pending_syncs (syncId, userToken, authorName, changesPayload, status, submittedAt)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const markApproved = db.prepare(`UPDATE pending_syncs SET status = 'approved' WHERE syncId = ?`);

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    if (isAuthBlocked(ip)) {
      return NextResponse.json({ ok: false, error: '尝试过于频繁，请稍后再试' }, { status: 429 });
    }

    const body = await request.json();
    const { token, authorName, changes }: { token?: string; authorName?: string; changes?: unknown } = body;

    if (!token) {
      return NextResponse.json({ ok: false, error: '缺少 token' }, { status: 401 });
    }

    const authResult = authenticateUser(token);
    if (!authResult.success) {
      recordAuthFailure(ip);
      return NextResponse.json({ ok: false, error: '认证失败' }, { status: 401 });
    }

    const validated = validateChanges(changes);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }
    const validatedChanges = validated.changes;

    const syncId = `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const submittedAt = new Date().toISOString();
    const payload = JSON.stringify(validatedChanges);
    const safeAuthorName = typeof authorName === 'string' ? authorName.slice(0, 100) : '';

    // Bulk deletes always go through review — a single compromised trusted
    // token must not be able to tombstone the whole catalogue in one shot.
    const deleteCount = validatedChanges.filter((c) => c.action === 'delete').length;
    const autoApprove =
      authResult.role === 'trusted' && deleteCount < TRUSTED_DELETE_DEMOTION_THRESHOLD;

    if (autoApprove) {
      // Insert + apply + mark-approved share one transaction, so a failure
      // mid-apply can no longer leave an approved-but-unapplied batch behind.
      db.transaction(() => {
        insertBatch.run(syncId, token, safeAuthorName, payload, 'pending', submittedAt);
        applyChangesToDb(validatedChanges);
        markApproved.run(syncId);
      })();
    } else {
      insertBatch.run(syncId, token, safeAuthorName, payload, 'pending', submittedAt);
    }

    return NextResponse.json({ ok: true, syncId, autoApproved: autoApprove });
  } catch (error) {
    console.error('[sync/push] error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
