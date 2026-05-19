'use client';

import Link from 'next/link';
import SyncPanel from '@/components/sync/SyncPanel';

export default function SyncPage() {
  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* Page title */}
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">同步管理</h1>
        <p className="mt-1 text-sm text-gray-500">管理数据同步状态与操作</p>
      </div>

      {/* Sync control panel */}
      <SyncPanel />

      {/* Navigation back to home */}
      <div className="pt-4 border-t border-gray-200">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </Link>
      </div>
    </div>
  );
}
