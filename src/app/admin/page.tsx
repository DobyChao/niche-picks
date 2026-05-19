'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ApprovalCard from '@/components/admin/ApprovalCard';

interface PendingItem {
  id: string;
  [key: string]: any;
}

export default function AdminPage() {
  const [token, setToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [pendingList, setPendingList] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Fetch pending items
  const fetchPending = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/pending?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || '获取待审批列表失败');
      }
      const data = await res.json();
      setPendingList(Array.isArray(data) ? data : data.pending || []);
    } catch (err: any) {
      setError(err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch on token change
  useEffect(() => {
    if (token) {
      fetchPending();
    }
  }, [token, fetchPending]);

  // Handle token submission
  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    const trimmed = tokenInput.trim();
    setToken(trimmed);
    localStorage.setItem('admin_token', trimmed);
    setTokenInput('');
  };

  // Approve handler
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '审批操作失败');
      }
      // Refresh list after approval
      fetchPending();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Reject handler
  const handleReject = async (id: string) => {
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '拒绝操作失败');
      }
      // Refresh list after rejection
      fetchPending();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Show token input if not set
  if (!token) {
    return (
      <div className="max-w-xl mx-auto p-4 space-y-6">
        <div className="pt-4">
          <h1 className="text-2xl font-bold text-gray-900">管理审批台</h1>
          <p className="mt-1 text-sm text-gray-500">请输入管理员令牌以继续</p>
        </div>

        <form onSubmit={handleTokenSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-token" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Token
            </label>
            <input
              id="admin-token"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="请输入管理员令牌"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            确认
          </button>
        </form>

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

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* Page title */}
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理审批台</h1>
          <p className="mt-1 text-sm text-gray-500">审核待审批的店铺提交</p>
        </div>
        <button
          onClick={() => {
            setToken('');
            localStorage.removeItem('admin_token');
          }}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          title="退出登录"
        >
          退出
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="ml-2 text-gray-500 text-sm">加载中...</span>
        </div>
      )}

      {/* Pending list */}
      {!loading && pendingList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">暂无待审批</p>
          <p className="text-sm mt-1">所有提交都已处理</p>
        </div>
      )}

      {!loading && pendingList.length > 0 && (
        <div className="space-y-4">
          {pendingList.map((item) => (
            <ApprovalCard
              key={item.id}
              batch={{
                syncId: item.id || item.syncId,
                authorName: item.authorName || '',
                submittedAt: new Date(item.submittedAt).getTime(),
                summary: item.summary || '',
              }}
              onAction={(syncId, action) => {
                if (action === 'approve') handleApprove(syncId);
                else handleReject(syncId);
              }}
            />
          ))}
        </div>
      )}

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
