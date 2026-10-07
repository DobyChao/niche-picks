'use client';

import { useState, useEffect, useCallback } from 'react';
import ApprovalCard from '@/components/admin/ApprovalCard';
import type { UserTokenRole } from '@/lib/types';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import { bearerAuthHeaders } from '@/lib/sync/auth';

interface PendingItem {
  syncId: string;
  [key: string]: any;
}

interface UserTokenRow {
  token: string;
  nickname: string;
  remark: string;
  role: UserTokenRole;
  createdAt: string;
}

const ROLE_LABELS: Record<UserTokenRole, string> = {
  normal: '普通',
  trusted: '信任（自动审批）',
};

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
  const [updatingRoleToken, setUpdatingRoleToken] = useState<string | null>(null);
  const [newTokenRole, setNewTokenRole] = useState<UserTokenRole>('normal');

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
      const res = await fetch('/api/admin/pending', { headers: bearerAuthHeaders(token) });
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
      const res = await fetch('/api/admin/generate-token', { headers: bearerAuthHeaders(token) });
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
      const res = await fetch('/api/feedback', { headers: bearerAuthHeaders(token) });
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
        headers: { 'Content-Type': 'application/json', ...bearerAuthHeaders(token) },
        body: JSON.stringify({ remark: remark.trim(), role: newTokenRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      setInviteMsg({ type: 'success', text: '邀请 Token 已生成' });
      setRemark('');
      setNewTokenRole('normal');
      fetchTokens();
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.message || '生成失败' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Update token role
  const handleUpdateRole = async (userToken: string, role: UserTokenRole) => {
    setUpdatingRoleToken(userToken);
    try {
      const res = await fetch('/api/admin/generate-token', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...bearerAuthHeaders(token) },
        body: JSON.stringify({ userToken, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失败');
      setInviteMsg({ type: 'success', text: `身份已更新为「${ROLE_LABELS[role]}」` });
      fetchTokens();
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.message || '更新失败' });
    } finally {
      setUpdatingRoleToken(null);
    }
  };

  // Delete a token
  const handleDeleteToken = async (userToken: string) => {
    if (!confirm('确定要删除此 Token 吗？')) return;
    setDeletingToken(userToken);
    try {
      const res = await fetch('/api/admin/generate-token', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...bearerAuthHeaders(token) },
        body: JSON.stringify({ userToken }),
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
        <PageHeader title="管理审批台" description="请输入管理员令牌以继续" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <Card padding="lg">
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <Input
                  id="admin-token"
                  label="Admin Token"
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="请输入管理员令牌"
                />
                <Button type="submit" className="w-full">确认</Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
      <PageHeader
        title="管理审批台"
        description="审核待审批的店铺提交"
        action={
          <button
            onClick={() => {
              setToken('');
              localStorage.removeItem('admin_token');
            }}
            className="text-sm text-muted hover:text-red-600 transition-colors"
            title="退出登录"
          >
            退出
          </button>
        }
      />

      {inviteMsg && <Toast variant={inviteMsg.type === 'success' ? 'success' : 'error'}>{inviteMsg.text}</Toast>}
      {error && <Toast variant="error">{error}</Toast>}

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
          <Card className="overflow-hidden">
            <CardHeader title="邀请 Token 管理" description="生成令牌并配置身份角色（信任身份可自动审批）" />
            <CardBody className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="备注（可选）"
                  className="flex-1"
                />
                <Select
                  value={newTokenRole}
                  onChange={(e) => setNewTokenRole(e.target.value as UserTokenRole)}
                  className="sm:w-auto"
                >
                  <option value="normal">普通身份</option>
                  <option value="trusted">信任身份（自动审批）</option>
                </Select>
                <Button onClick={handleGenerateToken} disabled={isGenerating} className="whitespace-nowrap">
                  {isGenerating ? '生成中...' : '生成 Token'}
                </Button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted mb-3">已生成的 Token</h3>
                {loadingTokens ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="ml-2 text-muted text-sm">加载中...</span>
                  </div>
                ) : tokenList.length === 0 ? (
                  <p className="text-center text-muted text-sm py-6">暂无 Token</p>
                ) : (
                  <div className="space-y-2">
                    {tokenList.map((row) => {
                      const label = row.remark || row.nickname || '—';
                      return (
                        <div key={row.token} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-background border border-border rounded-[var(--radius-button)] text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-foreground font-medium shrink-0 truncate max-w-[80px]" title={label}>{label}</span>
                              <Badge variant={row.role === 'trusted' ? 'success' : 'muted'}>{ROLE_LABELS[row.role || 'normal']}</Badge>
                              <span className="text-muted text-xs whitespace-nowrap">{formatDate(row.createdAt)}</span>
                            </div>
                            <code className="block mt-1 font-mono text-muted text-xs break-all">{row.token}</code>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <select
                              value={row.role || 'normal'}
                              disabled={updatingRoleToken === row.token}
                              onChange={(e) => handleUpdateRole(row.token, e.target.value as UserTokenRole)}
                              className="px-2 py-1 border border-border rounded-[var(--radius-button)] text-xs bg-surface disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="normal">普通</option>
                              <option value="trusted">信任</option>
                            </select>
                              <Button variant="secondary" size="sm" onClick={() => copyToClipboard(row.token)}>复制</Button>
                              <Button variant="soft-danger" size="sm" disabled={deletingToken === row.token} onClick={() => handleDeleteToken(row.token)}>
                              {deletingToken === row.token ? '...' : '删除'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

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
        <Card className="min-w-0 overflow-hidden flex flex-col lg:min-h-0">
          <CardHeader title="待审批列表" description="审核用户提交的店铺和点评变更" />
          <CardBody className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                <span className="ml-2 text-muted text-sm">加载中...</span>
              </div>
            ) : pendingList.length === 0 ? (
              <EmptyState
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="暂无待审批"
                description="所有提交都已处理"
              />
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
          </CardBody>
        </Card>
      </div>
    </div>
  );

  // Approve handler
  async function handleApprove(syncId: string) {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...bearerAuthHeaders(token) },
        body: JSON.stringify({ syncId }),
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
        headers: { 'Content-Type': 'application/json', ...bearerAuthHeaders(token) },
        body: JSON.stringify({ syncId }),
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
        headers: { 'Content-Type': 'application/json', ...bearerAuthHeaders(token) },
        body: JSON.stringify({ id }),
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
    <Card className="overflow-hidden">
      <CardHeader title="意见箱" description="用户提交的反馈与建议" />
      <CardBody>
        {loadingFeedbacks ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-2 text-muted text-sm">加载中...</span>
          </div>
        ) : feedbackList.length === 0 ? (
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
            title="暂无反馈"
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {feedbackList.map((fb) => (
              <div key={fb.id} className="p-3 bg-background border border-border rounded-[var(--radius-button)] text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {fb.nickname && <span className="font-medium text-foreground">{fb.nickname}</span>}
                      {fb.contact && <span className="text-xs text-muted">{fb.contact}</span>}
                      <span className="text-xs text-muted">{formatDate(fb.created_at)}</span>
                    </div>
                    <p className="mt-1.5 text-muted whitespace-pre-wrap break-words">{fb.content}</p>
                  </div>
                  <Button variant="soft-danger" size="sm" disabled={deletingFeedback === fb.id} onClick={() => onDelete(fb.id)}>
                    {deletingFeedback === fb.id ? '...' : '删除'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
