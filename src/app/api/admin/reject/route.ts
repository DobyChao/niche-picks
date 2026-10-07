import { db } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/auth';
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
      return json({ ok: false, error: '缺少 syncId' }, 400);
    }

    const result = db.prepare(
      'UPDATE pending_syncs SET status = ? WHERE syncId = ? AND status = ?'
    ).run('rejected', syncId, 'pending');
    if (result.changes === 0) {
      return json({ ok: false, error: '批次不存在或已处理' }, 404);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('[admin/reject] error:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: '服务器错误' }, 500);
  }
}
