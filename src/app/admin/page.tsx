'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ApprovalCard from '@/components/admin/ApprovalCard';

interface PendingItem {
  syncId: string;
  [key: string]: any;
}

interface UserTokenRow {
  token: string;
  nickname: string;
  remark: string;
  createdAt: string;
}

interface FeedbackRow {
  id: number;
  nickname: string;
  contact: string;
  content: string;
  created_at: string;
}

export default function AdminPage() {
  const [token, setToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [pendingList, setPendingList] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Token management state
  const [remark, setRemark] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tokenList, setTokenList] = useState<UserTokenRow[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [deletingToken, setDeletingToken] = useState<string | null>(null);

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackRow[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState<number | null>(null);

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

  // Fetch token list
  const fetchTokens = useCallback(async () => {
    if (!token) return;
    setLoadingTokens(true);
    try {
      const res = await fetch(`/api/admin/generate-token?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '获取 Token 列表失败');
      }
      const data = await res.json();
      setTokenList(data.tokens || []);
    } catch {
      // silently fail
    } finally {
      setLoadingTokens(false);
    }
  }, [token]);

  // Fetch feedback list
  const fetchFeedbacks = useCallback(async () => {
    if (!token) return;
    setLoadingFeedbacks(true);
    try {
      const res = await fetch(`/api/feedback?token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const data = await res.json();
      setFeedbackList(data.feedbacks || []);
    } catch {
      // silently fail
    } finally {
      setLoadingFeedbacks(false);
    }
  }, [token]);

  // Fetch on token change
  useEffect(() => {
    if (token) {
      fetchPending();
      fetchTokens();
      fetchFeedbacks();
    }
  }, [token, fetchPending, fetchTokens, fetchFeedbacks]);

  // Handle token submission
  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    const trimmed = tokenInput.trim();
    setToken(trimmed);
    localStorage.setItem('admin_token', trimmed);
    setTokenInput('');
  };

  // Generate invite token
  const handleGenerateToken = async () => {
    setIsGenerating(true);
    setInviteMsg(null);
    try {
      const res = await fetch('/api/admin/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, remark: remark.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      setInviteMsg({ type: 'success', text: '邀请 Token 已生成' });
      setRemark('');
      fetchTokens();
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.message || '生成失败' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete a token
  const handleDeleteToken = async (userToken: string) => {
    if (!confirm('确定要删除此 Token 吗？')) return;
    setDeletingToken(userToken);
    try {
      const res = await fetch('/api/admin/generate-token', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setInviteMsg({ type: 'success', text: 'Token 已删除' });
      fetchTokens();
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.message || '删除失败' });
    } finally {
      setDeletingToken(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setInviteMsg({ type: 'success', text: '已复制到剪贴板' });
  };

  // Format date
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Show token input if not set
  if (!token) {
    return (
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
        <div className="pt-1 flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">管理审批台</h1>
            <p className="mt-1 text-sm text-gray-500">请输入管理员令牌以继续</p>
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

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-6 space-y-5">
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
      {/* Title row — matches sync page */}
      <div className="pt-1 flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理审批台</h1>
          <p className="mt-1 text-sm text-gray-500">审核待审批的店铺提交</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
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
      </div>

      {/* Message */}
      {inviteMsg && (
        <div
          className={`flex-shrink-0 p-3 rounded-lg text-sm ${
            inviteMsg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {inviteMsg.type === 'success' ? '✓' : '✕'} {inviteMsg.text}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex-shrink-0 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Main grid — matches sync page layout */}
      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Mobile: Feedback card (shown before Token card) */}
        <div className="lg:hidden">
          <FeedbackCard
            feedbackList={feedbackList}
            loadingFeedbacks={loadingFeedbacks}
            deletingFeedback={deletingFeedback}
            formatDate={formatDate}
            onDelete={handleDeleteFeedback}
          />
        </div>

        {/* Left: Token management + Desktop feedback below */}
        <div className="lg:overflow-y-auto flex flex-col gap-5">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">邀请 Token 管理</h2>
              <p className="mt-0.5 text-xs text-gray-500">生成和管理用户邀请令牌</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Generation area */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="备注（可选）"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder-gray-400"
                />
                <button
                  onClick={handleGenerateToken}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg
                             hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors text-sm whitespace-nowrap"
                >
                  {isGenerating ? '生成中...' : '生成 Token'}
                </button>
              </div>

              {/* Token list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3">已生成的 Token</h3>
                {loadingTokens ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full" />
                    <span className="ml-2 text-gray-400 text-sm">加载中...</span>
                  </div>
                ) : tokenList.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">暂无 Token</p>
                ) : (
                  <div className="space-y-2">
                    {tokenList.map((row) => {
                      const label = row.remark || row.nickname || '—';
                      return (
                        <div
                          key={row.token}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700 font-medium shrink-0 truncate max-w-[80px]" title={label}>
                                {label}
                              </span>
                              <span className="text-gray-400 text-xs whitespace-nowrap">
                                {formatDate(row.createdAt)}
                              </span>
                            </div>
                            <code className="block mt-1 font-mono text-gray-600 text-xs break-all">
                              {row.token}
                            </code>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => copyToClipboard(row.token)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300 transition-colors whitespace-nowrap"
                            >
                              复制
                            </button>
                            <button
                              onClick={() => handleDeleteToken(row.token)}
                              disabled={deletingToken === row.token}
                              className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-md hover:bg-red-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {deletingToken === row.token ? '...' : '删除'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: Feedback card below Token management */}
          <div className="hidden lg:block">
            <FeedbackCard
              feedbackList={feedbackList}
              loadingFeedbacks={loadingFeedbacks}
              deletingFeedback={deletingFeedback}
              formatDate={formatDate}
              onDelete={handleDeleteFeedback}
            />
          </div>
        </div>

        {/* Right: Pending approvals — white card with header+scroll, matches sync page */}
        <section className="min-w-0 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col lg:min-h-0">
          <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900">待审批列表</h2>
            <p className="mt-0.5 text-xs text-gray-500">审核用户提交的店铺和点评变更</p>
          </div>
          <div className="p-4 md:p-5 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span className="ml-2 text-gray-500 text-sm">加载中...</span>
              </div>
            ) : pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">暂无待审批</p>
                <p className="text-sm mt-1">所有提交都已处理</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingList.map((item) => {
                  let changes: any[] = [];
                  try {
                    changes = JSON.parse(item.changesPayload || '[]');
                  } catch (_e) {
                    changes = [];
                  }
                  return (
                    <ApprovalCard
                      key={item.syncId}
                      batch={{
                        syncId: item.syncId,
                        authorName: item.authorName || '',
                        submittedAt: new Date(item.submittedAt).getTime(),
                        summary: item.summary || '',
                        changes,
                      }}
                      onAction={(syncId, action) => {
                        if (action === 'approve') handleApprove(syncId);
                        else handleReject(syncId);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  // Approve handler
  async function handleApprove(syncId: string) {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId, token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '审批操作失败');
      }
      fetchPending();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Reject handler
  async function handleReject(syncId: string) {
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId, token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '拒绝操作失败');
      }
      fetchPending();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Delete feedback handler
  async function handleDeleteFeedback(id: number) {
    if (!confirm('确定要删除此反馈吗？')) return;
    setDeletingFeedback(id);
    try {
      const res = await fetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setInviteMsg({ type: 'success', text: '反馈已删除' });
      fetchFeedbacks();
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.message || '删除失败' });
    } finally {
      setDeletingFeedback(null);
    }
  }
}

function FeedbackCard({
  feedbackList,
  loadingFeedbacks,
  deletingFeedback,
  formatDate,
  onDelete,
}: {
  feedbackList: FeedbackRow[];
  loadingFeedbacks: boolean;
  deletingFeedback: number | null;
  formatDate: (iso: string) => string;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">意见箱</h2>
        <p className="mt-0.5 text-xs text-gray-500">用户提交的反馈与建议</p>
      </div>
      <div className="p-5">
        {loadingFeedbacks ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="ml-2 text-gray-400 text-sm">加载中...</span>
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm font-medium">暂无反馈</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((fb) => (
              <div
                key={fb.id}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {fb.nickname && (
                        <span className="font-medium text-gray-700">{fb.nickname}</span>
                      )}
                      {fb.contact && (
                        <span className="text-xs text-gray-400">{fb.contact}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDate(fb.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-gray-600 whitespace-pre-wrap break-words">
                      {fb.content}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(fb.id)}
                    disabled={deletingFeedback === fb.id}
                    className="shrink-0 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-md hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    {deletingFeedback === fb.id ? '...' : '删除'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
