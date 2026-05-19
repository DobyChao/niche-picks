'use client';

interface ApprovalBatch {
  syncId: string;
  authorName: string;
  submittedAt: number;
  summary: string;
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
  } catch {
    return String(ts);
  }
}

export default function ApprovalCard({ batch, onAction }: ApprovalCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
      {/* Header: Author & Time */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">
            {batch.authorName}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            📅 {formatTimestamp(batch.submittedAt)}
          </p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          待审核
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 leading-relaxed">{batch.summary}</p>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
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
