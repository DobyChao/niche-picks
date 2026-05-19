import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authenticateAdmin } from '@/lib/server/auth';
import type { ChangeLogItem, PendingSync } from '@/lib/types';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ ok: false, error: '缺少 token' }, { status: 401 });
    }

    const authResult = authenticateAdmin(token);
    if (!authResult.success) {
      return NextResponse.json({ ok: false, error: '认证失败' }, { status: 401 });
    }

    const statusFilter = searchParams.get('status') || 'pending';

    if (!['pending', 'approved', 'rejected'].includes(statusFilter)) {
      return NextResponse.json({ ok: false, error: 'status 参数无效，可选: pending, approved, rejected' }, { status: 400 });
    }

    const rows = db.prepare('SELECT * FROM pending_syncs WHERE status = ?').all(statusFilter) as PendingSync[];

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

    return NextResponse.json({ ok: true, pending });
  } catch (error) {
    console.error('[admin/pending] error:', error);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
