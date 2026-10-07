import { db } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/auth';
import { applyChangesToDb } from '@/lib/server/merge-changes';
import { validateChanges } from '@/lib/server/change-validation';
import { json, readJsonBody } from '@/lib/server/security';

export async function POST(request: Request) {
  try {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    const syncId = body.value && typeof body.value === 'object' && !Array.isArray(body.value)
      ? (body.value as { syncId?: unknown }).syncId
      : undefined;
    if (typeof syncId !== 'string' || syncId.length === 0 || syncId.length > 80) {
      return json({ ok: false, error: 'missing_params' }, 400);
    }

    const batch = db.prepare('SELECT changesPayload, status FROM pending_syncs WHERE syncId = ?').get(syncId) as
      | { changesPayload: string; status: string }
      | undefined;
    if (!batch) return json({ ok: false, error: 'batch_not_found' }, 404);
    if (batch.status !== 'pending') return json({ ok: false, error: 'batch_not_pending' }, 400);

    let parsed: unknown;
    try {
      parsed = JSON.parse(batch.changesPayload);
    } catch {
      return json({ ok: false, error: '变更数据不合法' }, 400);
    }
    const validated = validateChanges(parsed);
    if (!validated.ok) return json({ ok: false, error: validated.error }, 400);

    const updateStatus = db.prepare('UPDATE pending_syncs SET status = ? WHERE syncId = ? AND status = ?');
    db.transaction(() => {
      applyChangesToDb(validated.changes);
      const result = updateStatus.run('approved', syncId, 'pending');
      if (result.changes !== 1) throw new Error('batch_not_pending');
    })();

    return json({ ok: true, merged: validated.changes.length });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code.startsWith('SQLITE_CONSTRAINT')) {
      return json({ ok: false, error: '变更无法写入，请确认关联店铺是否存在' }, 400);
    }
    console.error('[admin/approve] error:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: 'internal_error' }, 500);
  }
}
