'use client';

import { useMemo, useState, useCallback } from 'react';
import { useAllChanges, revertChange } from '@/lib/db';
import type { ChangeEntry } from '@/lib/db';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const ACTION_CONFIG = {
  create: { label: '新建', variant: 'success' as const },
  update: { label: '修改', variant: 'default' as const },
  delete: { label: '删除', variant: 'warning' as const },
};

function ChangeItem({ entry, typeLabel, onRevert }: { entry: ChangeEntry; typeLabel: string; onRevert: () => void }) {
  const actionConfig = ACTION_CONFIG[entry.action];

  return (
    <div className="flex items-center gap-3 py-3 px-3 bg-surface rounded-[var(--radius-button)] border border-border hover:border-primary/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="muted">{typeLabel}</Badge>
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{entry.name}</p>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span>{new Date(entry.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          {entry.entity === 'review' && entry.shopName && <span className="truncate">关联：{entry.shopName}</span>}
        </div>
      </div>
      <Badge variant={actionConfig.variant}>{actionConfig.label}</Badge>
      {entry.status === 'draft' && (
        <Button variant="ghost" size="sm" onClick={onRevert} className="text-muted hover:text-red-600 hover:bg-red-50">
          回退
        </Button>
      )}
    </div>
  );
}

interface TreeGroup {
  id: string;
  name: string;
  status: ChangeEntry['status'];
  updatedAt: string;
  shopChange?: ChangeEntry;
  reviews: ChangeEntry[];
}

function buildTree(changes: ChangeEntry[]): TreeGroup[] {
  const shopEntries = changes.filter((c) => c.entity === 'shop');
  const reviewEntries = changes.filter((c) => c.entity === 'review');
  const groups = new Map<string, TreeGroup>();

  function ensureGroup(id: string, name: string, status: ChangeEntry['status'], updatedAt: string) {
    const existing = groups.get(id);
    if (existing) {
      if (updatedAt > existing.updatedAt) existing.updatedAt = updatedAt;
      return existing;
    }
    const group: TreeGroup = { id, name, status, updatedAt, reviews: [] };
    groups.set(id, group);
    return group;
  }

  for (const shop of shopEntries) {
    const group = ensureGroup(shop.id, shop.name || '未命名店铺', shop.status, shop.updatedAt);
    group.shopChange = shop;
    group.name = shop.name || group.name;
  }

  for (const r of reviewEntries) {
    const groupId = r.shopId || r.id;
    const groupName = r.shopName || '未知店铺';
    const group = ensureGroup(groupId, groupName, r.status, r.updatedAt);
    group.reviews.push(r);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      reviews: group.reviews.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function ChangeGroup({ group, onRequestRevert }: { group: TreeGroup; onRequestRevert: (entry: ChangeEntry) => void }) {
  const [open, setOpen] = useState(true);
  const itemCount = (group.shopChange ? 1 : 0) + group.reviews.length;
  const hasDraft = group.shopChange?.status === 'draft' || group.reviews.some((review) => review.status === 'draft');

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary-muted/30 transition-colors"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-muted text-xs font-semibold text-primary">
          店
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
            {hasDraft && <Badge variant="success">可提交</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {itemCount} 条变更 · {group.shopChange ? '含店铺资料' : '仅点评记录'}
          </p>
        </div>
        <Badge variant="muted">{group.reviews.length ? `${group.reviews.length} 评` : '无点评'}</Badge>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border bg-background/60 p-3">
          {group.shopChange && (
            <section>
              <p className="mb-2 px-1 text-xs font-medium text-muted">店铺资料</p>
              <ChangeItem entry={group.shopChange} typeLabel="资料" onRevert={() => onRequestRevert(group.shopChange!)} />
            </section>
          )}
          {group.reviews.length > 0 && (
            <section>
              <p className="mb-2 px-1 text-xs font-medium text-muted">点评记录</p>
              <div className="space-y-2">
                {group.reviews.map((review) => (
                  <ChangeItem key={review.id} entry={review} typeLabel="点评" onRevert={() => onRequestRevert(review)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}

function ChangeTree({ changes, onRequestRevert }: { changes: ChangeEntry[]; onRequestRevert: (entry: ChangeEntry) => void }) {
  const groups = useMemo(() => buildTree(changes), [changes]);
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <ChangeGroup key={group.id} group={group} onRequestRevert={onRequestRevert} />
      ))}
    </div>
  );
}

export default function ChangeList() {
  const changes = useAllChanges();
  const [confirmState, setConfirmState] = useState<{ onConfirm: () => void } | null>(null);

  const handleRequestRevert = useCallback((entry: ChangeEntry) => {
    setConfirmState({
      onConfirm: async () => {
        setConfirmState(null);
        await revertChange(entry.entity, entry.id);
      },
    });
  }, []);

  if (changes === undefined) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-border border-t-primary" />
        <span className="ml-3 text-muted text-sm">加载中</span>
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <EmptyState
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="暂无变更"
        description="本机没有等待提交或审核的内容"
        className="border border-dashed border-border rounded-[var(--radius-card)] bg-background/60 py-20"
      />
    );
  }

  const drafts = changes.filter((c) => c.status === 'draft');
  const pendings = changes.filter((c) => c.status === 'pending');

  return (
    <div className="space-y-6">
      {drafts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">未提交</h3>
            <Badge variant="muted">{drafts.length}</Badge>
          </div>
          <ChangeTree changes={drafts} onRequestRevert={handleRequestRevert} />
        </div>
      )}

      {pendings.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">审核中</h3>
            <Badge variant="muted">{pendings.length}</Badge>
          </div>
          <ChangeTree changes={pendings} onRequestRevert={handleRequestRevert} />
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title="回退变更"
        message="确定要回退此变更吗？回退后将恢复为原始数据。"
        confirmText="回退"
        variant="danger"
        onConfirm={confirmState?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
