'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  clearSyncIdentity,
  getSavedSyncIdentity,
  saveSyncIdentity,
  validateSyncToken,
} from '@/lib/sync/auth';
import { autoPullIfReady } from '@/lib/sync/pull';
import PageHeader from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';

export default function IdentityPage() {
  const [token, setToken] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [hasSavedIdentity, setHasSavedIdentity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const saved = getSavedSyncIdentity();
    setToken(saved.token);
    setAuthorName(saved.authorName);
    setHasSavedIdentity(Boolean(saved.token));
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextToken = token.trim();
    const nextAuthorName = authorName.trim();

    if (!nextToken) {
      setMessage({ type: 'error', text: '请输入 User Token' });
      return;
    }
    if (!nextAuthorName) {
      setMessage({ type: 'error', text: '请输入昵称' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await validateSyncToken(nextToken);
      saveSyncIdentity({ token: nextToken, authorName: nextAuthorName });
      setToken(nextToken);
      setAuthorName(nextAuthorName);
      setHasSavedIdentity(true);

      const pullResult = await autoPullIfReady();
      if (pullResult.status === 'success') {
        const total = pullResult.shopCount + pullResult.reviewCount;
        setMessage({
          type: 'success',
          text:
            total > 0
              ? `身份已保存，已自动拉取 ${pullResult.shopCount} 家店铺、${pullResult.reviewCount} 条点评。`
              : '身份已保存，已自动拉取（云端暂无数据）。',
        });
      } else if (pullResult.status === 'error') {
        setMessage({ type: 'error', text: `身份已保存，但自动拉取失败: ${pullResult.error}` });
      } else {
        setMessage({ type: 'success', text: '同步身份已验证并保存到本机。' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `保存失败: ${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setIsSaving(false);
    }
  }

  function handleClear() {
    clearSyncIdentity();
    setToken('');
    setAuthorName('');
    setHasSavedIdentity(false);
    setMessage({ type: 'success', text: '已清除本机保存的同步身份。' });
  }

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-6 space-y-6">
      <PageHeader
        title="同步身份"
        description="配置这台设备用于同步的 User Token 和提交昵称。"
        backHref="/sync"
        backLabel="返回同步管理"
      />

      <Card padding="lg">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">本机认证信息</h2>
              <p className="mt-1 text-xs text-muted">
                信息只保存在当前浏览器，不会作为账号登录状态共享到其他设备。
              </p>
            </div>
            {hasSavedIdentity && <Badge variant="success">已保存</Badge>}
          </div>

          <Input
            id="identity-token"
            label="User Token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="输入你的同步 Token"
          />

          <Input
            id="identity-author"
            label="昵称"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="提交审核时显示的昵称"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '验证中...' : '验证并保存'}
            </Button>
            {hasSavedIdentity && (
              <Button type="button" variant="secondary" onClick={handleClear} disabled={isSaving} className="hover:text-red-600 hover:border-red-200 hover:bg-red-50">
                清除本机身份
              </Button>
            )}
          </div>

          {message && <Toast variant={message.type === 'success' ? 'success' : 'error'}>{message.text}</Toast>}
        </form>
      </Card>

      <div className="flex gap-4">
        <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
          返回首页
        </Link>
      </div>
    </div>
  );
}
