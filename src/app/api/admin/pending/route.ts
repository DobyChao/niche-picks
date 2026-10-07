import { db } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/auth';
import { json } from '@/lib/server/security';
import type { ChangeLogItem } from '@/lib/types';

function buildSummary(changes: ChangeLogItem[]): string {
  const counts: Record<string, Record<string, number>> = {};

  for (const change of changes) {
    const entity = change.entity === 'shop' ? '店铺' : change.entity === 'review' ? '点评' : change.entity;
    const action =
      change.action === 'create'
        ? '新增'
        : change.action === 'update'
          ? '修改'
          : change.action === 'delete'
            ? '删除'
            : change.action;

    if (!counts[action]) counts[action] = {};
    counts[action][entity] = (counts[action][entity] || 0) + 1;
  }

  const parts: string[] = [];
  for (const [action, entities] of Object.entries(counts)) {
    for (const [entity, count] of Object.entries(entities)) {
      parts.push(`${action} ${count} 个${entity}`);
    }
  }

  return parts.join(', ') || '无变更';
}

const STATUSES = new Set(['pending', 'approved', 'rejected']);

export async function GET(request: Request) {
  try {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const statusFilter = new URL(request.url).searchParams.get('status') || 'pending';
    if (!STATUSES.has(statusFilter)) {
      return json({ ok: false, error: 'status 参数无效，可选: pending, approved, rejected' }, 400);
    }

    const rows = db.prepare(
      'SELECT syncId, authorName, changesPayload, status, submittedAt FROM pending_syncs WHERE status = ?'
    ).all(statusFilter) as {
      syncId: string;
      authorName: string;
      changesPayload: string;
      status: string;
      submittedAt: string;
    }[];

    const pending = rows.map((row) => {
      let changes: ChangeLogItem[] = [];
      try {
        changes = JSON.parse(row.changesPayload || '[]');
      } catch {
        changes = [];
      }
      return {
        ...row,
        summary: buildSummary(changes),
      };
    });

    return json({ ok: true, pending });
  } catch (error) {
    console.error('[admin/pending] error:', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: '服务器错误' }, 500);
  }
}
