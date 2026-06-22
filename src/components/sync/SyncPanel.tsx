'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { pushLocalChanges } from '@/lib/sync/push';
import { pullRemoteData } from '@/lib/sync/pull';
import { getSavedSyncIdentity, type SyncIdentity } from '@/lib/sync/auth';
import { useAllChanges } from '@/lib/db';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';

export default function SyncPanel() {
  const [identity, setIdentity] = useState<SyncIdentity>({ token: '', authorName: '' });
  const [loaded, setLoaded] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const changes = useAllChanges();
  const draftCount = changes?.filter((change) => change.status === 'draft').length ?? 0;
  const pendingCount = changes?.filter((change) => change.status === 'pending').length ?? 0;
  const hasIdentity = Boolean(identity.token);

  useEffect(() => {
    setIdentity(getSavedSyncIdentity());
    setLoaded(true);
  }, []);

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handlePush() {
    if (!identity.token) {
      showMessage('error', '请先配置同步身份');
      return;
    }
    if (!identity.authorName) {
      showMessage('error', '请先在身份设置中填写昵称');
      return;
    }

    setIsPushing(true);
    setMessage(null);

    try {
      const result = await pushLocalChanges(identity.token, identity.authorName);
      showMessage(
        'success',
        result.autoApproved
          ? '推送成功！变更已自动审批并同步。'
          : '推送成功！本地变更已上传，等待管理员审批。',
      );
    } catch (err) {
      showMessage('error', `推送失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsPushing(false);
    }
  }

  async function handlePull() {
    if (!identity.token) {
      showMessage('error', '请先配置同步身份');
      return;
    }

    setIsPulling(true);
    setMessage(null);

    try {
      const result = await pullRemoteData(identity.token);
      const total = result.shopCount + result.reviewCount;
      showMessage(
        'success',
        total > 0
          ? `拉取成功！已同步 ${result.shopCount} 家店铺、${result.reviewCount} 条点评。`
          : '拉取成功！没有新的远程数据。',
      );
    } catch (err) {
      showMessage('error', `拉取失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsPulling(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="同步控制"
        description="使用本机保存的同步身份"
        action={
          <Link
            href="/identity"
            className="shrink-0 px-2.5 py-1.5 rounded-[var(--radius-button)] text-xs font-medium text-primary bg-primary-muted hover:bg-primary-muted/80 transition-colors"
          >
            身份设置
          </Link>
        }
      />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[var(--radius-card)] border border-border bg-background px-3 py-3">
            <p className="text-xs text-muted">未提交</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{draftCount}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border bg-background px-3 py-3">
            <p className="text-xs text-muted">审核中</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{pendingCount}</p>
          </div>
        </div>

        {loaded && !hasIdentity ? (
          <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-muted p-4">
            <p className="text-sm font-medium text-foreground">未配置同步身份</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              先验证并保存 User Token，再进行拉取或推送。
            </p>
            <Link href="/identity" className="mt-3 inline-flex">
              <Button size="sm">去设置身份</Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-success/20 bg-success-muted px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-success">当前身份</p>
                <p className="mt-1 truncate text-sm text-foreground">{identity.authorName || '未填写昵称'}</p>
              </div>
              <Badge variant="success">已保存</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted">User Token</span>
              <span className="font-mono text-foreground">
                {identity.token ? `${identity.token.slice(0, 8)}...${identity.token.slice(-4)}` : '未配置'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={handlePull}
            disabled={!hasIdentity || isPushing || isPulling}
            className="h-11 bg-foreground hover:bg-foreground/90"
          >
            {isPulling ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                拉取中
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                </svg>
                拉取云端数据
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={handlePush}
            disabled={!hasIdentity || isPushing || isPulling}
            className="h-11"
          >
            {isPushing ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-border border-t-foreground" />
                推送中
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9m0 0l-4 4m4-4l4 4M4 3h16" />
                </svg>
                推送本机变更
              </>
            )}
          </Button>
        </div>

        {message && <Toast variant={message.type === 'success' ? 'success' : 'error'}>{message.text}</Toast>}
      </CardBody>
    </Card>
  );
}
