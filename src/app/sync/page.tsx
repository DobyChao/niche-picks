'use client';

import Link from 'next/link';
import SyncPanel from '@/components/sync/SyncPanel';
import ChangeList from '@/components/sync/ChangeList';

export default function SyncPage() {
  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
      <div className="pt-1 flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">同步管理</h1>
          <p className="mt-1 text-sm text-gray-500">处理本机变更、拉取云端数据、查看待审核状态</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <div className="lg:overflow-y-auto">
          <SyncPanel />
        </div>

        <section className="min-w-0 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col lg:min-h-0">
          <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900">变更队列</h2>
            <p className="mt-0.5 text-xs text-gray-500">草稿可回退，已推送内容需等待管理员审核</p>
          </div>
          <div className="p-4 md:p-5 flex-1 overflow-y-auto">
            <ChangeList />
          </div>
        </section>
      </div>
    </div>
  );
}
