'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import { cn } from '@/lib/cn';

interface ChangeLogItem {
  entity: 'shop' | 'review';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  snapshot: Record<string, any>;
  timestamp: string;
}

interface ApprovalBatch {
  syncId: string;
  authorName: string;
  submittedAt: number;
  summary: string;
  changes: ChangeLogItem[];
}

interface ApprovalCardProps {
  batch: ApprovalBatch;
  onAction: (syncId: string, action: 'approve' | 'reject') => void;
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(ts);
  }
}

const ACTION_LABELS: Record<string, { label: string; variant: 'success' | 'default' | 'warning' }> = {
  create: { label: '新建', variant: 'success' },
  update: { label: '修改', variant: 'default' },
  delete: { label: '删除', variant: 'warning' },
};

function ChangeDetail({ change }: { change: ChangeLogItem }) {
  const s = change.snapshot || {};
  const actionConfig = ACTION_LABELS[change.action] || ACTION_LABELS.update;

  return (
    <div className="py-2.5 px-3 bg-background rounded-[var(--radius-button)] text-sm border border-border/50">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-xs text-muted">{change.entity === 'shop' ? '店铺' : '点评'}</span>
        <Badge variant={actionConfig.variant}>{actionConfig.label}</Badge>
        <span className="text-foreground font-medium truncate">
          {s.name || s.content?.slice(0, 20) || change.entityId}
        </span>
      </div>

      <div className="space-y-0.5 text-xs text-muted">
        {change.entity === 'shop' ? (
          <>
            {s.category && <p>分类：{s.category}</p>}
            {s.address && <p>地址：{s.address}</p>}
            {s.phone && <p>电话：{s.phone}</p>}
            {s.businessHours && <p>营业时间：{s.businessHours}</p>}
            {typeof s.lng === 'number' && typeof s.lat === 'number' && (
              <p>坐标：{s.lng.toFixed(4)}, {s.lat.toFixed(4)}</p>
            )}
            {s.tags && s.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {s.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="muted">{tag}</Badge>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {s.author && <p>作者：{s.author}</p>}
            {s.rating != null && (
              <p className="flex items-center gap-1">
                评分：<StarRating rating={s.rating} />
                <span className="text-foreground ml-1">{s.rating.toFixed(1)}</span>
              </p>
            )}
            {s.content && <p className="whitespace-pre-wrap text-foreground">{s.content}</p>}
            {s.avgPrice != null && <p>人均：¥{s.avgPrice}</p>}
            {s.visitDate && <p>到访：{s.visitDate}</p>}
            {s.tags && s.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {s.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="muted">{tag}</Badge>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ApprovalCard({ batch, onAction }: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = batch.changes && batch.changes.length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm">{batch.authorName}</h3>
            <p className="text-xs text-muted mt-0.5">{formatTimestamp(batch.submittedAt)}</p>
          </div>
          <Badge variant="warning">待审核</Badge>
        </div>

        <p className="text-sm text-muted leading-relaxed">{batch.summary}</p>

        {hasChanges && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? '收起详情' : `查看详情（${batch.changes.length} 条变更）`}
          </button>
        )}
      </div>

      {expanded && hasChanges && (
        <div className="border-t border-border px-4 py-3 space-y-2 bg-background/60">
          {batch.changes.map((change, i) => (
            <ChangeDetail key={`${change.entity}-${change.entityId}-${i}`} change={change} />
          ))}
        </div>
      )}

      <div className="flex gap-2 p-4 pt-0">
        <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => onAction(batch.syncId, 'approve')}>
          ✓ 通过
        </Button>
        <Button variant="danger" className="flex-1" onClick={() => onAction(batch.syncId, 'reject')}>
          ✕ 拒绝
        </Button>
      </div>
    </Card>
  );
}
