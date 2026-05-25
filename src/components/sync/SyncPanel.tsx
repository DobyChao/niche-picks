'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { pushLocalChanges } from '@/lib/sync/push';
import { pullRemoteData } from '@/lib/sync/pull';
import { getSavedSyncIdentity, type SyncIdentity } from '@/lib/sync/auth';
import { useAllChanges } from '@/lib/db';

export default function SyncPanel() {
  const [identity, setIdentity] = useState<SyncIdentity>({ token: '', authorName: '' });
  const [loaded, setLoaded] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
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
      await pushLocalChanges(identity.token, identity.authorName);
      showMessage('success', '推送成功！本地变更已上传到服务器。');
    } catch (err) {
      showMessage(
        'error',
        `推送失败: ${err instanceof Error ? err.message : '未知错误'}`
      );
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
          : '拉取成功！没有新的远程数据。'
      );
    } catch (err) {
      showMessage(
        'error',
        `拉取失败: ${err instanceof Error ? err.message : '未知错误'}`
      );
    } finally {
      setIsPulling(false);
    }
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">同步控制</h2>
          <p className="mt-0.5 text-xs text-gray-500">使用本机保存的同步身份</p>
        </div>
        <Link
          href="/identity"
          className="shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          身份设置
        </Link>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <p className="text-xs text-gray-500">未提交</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{draftCount}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <p className="text-xs text-gray-500">审核中</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{pendingCount}</p>
          </div>
        </div>

        {loaded && !hasIdentity ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">未配置同步身份</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              先验证并保存 User Token，再进行拉取或推送。
            </p>
            <Link
              href="/identity"
              className="mt-3 inline-flex px-3 py-2 bg-amber-700 text-white text-sm font-medium rounded-md hover:bg-amber-800 transition-colors"
            >
              去设置身份
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-800">当前身份</p>
                <p className="mt-1 truncate text-sm text-green-950">{identity.authorName || '未填写昵称'}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs text-green-700 border border-green-200">
                已保存
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-green-700">User Token</span>
              <span className="font-mono text-green-950">
                {identity.token ? `${identity.token.slice(0, 8)}...${identity.token.slice(-4)}` : '未配置'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={handlePull}
            disabled={!hasIdentity || isPushing || isPulling}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-medium text-white
                       hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
                       disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
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
          </button>
          <button
            onClick={handlePush}
            disabled={!hasIdentity || isPushing || isPulling}
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800
                       hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
                       disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            {isPushing ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-800" />
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
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </section>
  );
}
