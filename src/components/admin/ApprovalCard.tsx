'use client';

import { useState } from 'react';

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
    const date = new Date(ts);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_e) {
    return String(ts);
  }
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: '新建', color: 'bg-green-50 text-green-700 border-green-200' },
  update: { label: '修改', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  delete: { label: '删除', color: 'bg-red-50 text-red-700 border-red-200' },
};

function ChangeDetail({ change }: { change: ChangeLogItem }) {
  const s = change.snapshot || {};
  const actionConfig = ACTION_LABELS[change.action] || ACTION_LABELS.update;

  return (
    <div className="py-2.5 px-3 bg-gray-50 rounded-lg text-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-500">
          {change.entity === 'shop' ? '店铺' : '点评'}
        </span>
        <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[11px] font-medium ${actionConfig.color}`}>
          {actionConfig.label}
        </span>
        <span className="text-gray-800 font-medium truncate">
          {s.name || s.content?.slice(0, 20) || change.entityId}
        </span>
      </div>

      <div className="space-y-0.5 text-xs text-gray-600">
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
                  <span key={i} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{tag}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {s.author && <p>作者：{s.author}</p>}
            {s.rating != null && <p>评分：{'★'.repeat(s.rating)}{'☆'.repeat(5 - s.rating)}</p>}
            {s.content && <p className="whitespace-pre-wrap">{s.content}</p>}
            {s.avgPrice != null && <p>人均：¥{s.avgPrice}</p>}
            {s.visitDate && <p>到访：{s.visitDate}</p>}
            {s.tags && s.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {s.tags.map((tag: string, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">{tag}</span>
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      {/* Header: Author & Time */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {batch.authorName}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatTimestamp(batch.submittedAt)}
            </p>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            待审核
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-600 leading-relaxed">{batch.summary}</p>

        {/* Expand toggle */}
        {hasChanges && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
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

      {/* Expanded change details */}
      {expanded && hasChanges && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50/50">
          {batch.changes.map((change, i) => (
            <ChangeDetail key={`${change.entity}-${change.entityId}-${i}`} change={change} />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 p-4 pt-0">
        <button
          onClick={() => onAction(batch.syncId, 'approve')}
          className="flex-1 py-2 px-4 bg-green-600 text-white font-medium rounded-lg
                     hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                     transition-colors duration-200 text-sm"
        >
          ✓ 通过
        </button>
        <button
          onClick={() => onAction(batch.syncId, 'reject')}
          className="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-lg
                     hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                     transition-colors duration-200 text-sm"
        >
          ✕ 拒绝
        </button>
      </div>
    </div>
  );
}
