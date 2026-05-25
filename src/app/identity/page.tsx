'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  clearSyncIdentity,
  getSavedSyncIdentity,
  saveSyncIdentity,
  validateSyncToken,
} from '@/lib/sync/auth';

export default function IdentityPage() {
  const [token, setToken] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [hasSavedIdentity, setHasSavedIdentity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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
      setMessage({ type: 'success', text: '同步身份已验证并保存到本机。' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `保存失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
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
    <div className="max-w-3xl mx-auto w-full p-4 space-y-6">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">同步身份</h1>
        <p className="mt-1 text-sm text-gray-500">
          配置这台设备用于同步的 User Token 和提交昵称。
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">本机认证信息</h2>
            <p className="mt-1 text-xs text-gray-500">
              信息只保存在当前浏览器，不会作为账号登录状态共享到其他设备。
            </p>
          </div>
          {hasSavedIdentity && (
            <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              已保存
            </span>
          )}
        </div>

        <div>
          <label
            htmlFor="identity-token"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            User Token
          </label>
          <input
            id="identity-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="输入你的同步 Token"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-400"
          />
        </div>

        <div>
          <label
            htmlFor="identity-author"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            昵称
          </label>
          <input
            id="identity-author"
            type="text"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="提交审核时显示的昵称"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-400"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors text-sm"
          >
            {isSaving ? '验证中...' : '验证并保存'}
          </button>
          {hasSavedIdentity && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg
                         hover:bg-red-50 hover:text-red-600 disabled:opacity-50
                         transition-colors text-sm"
            >
              清除本机身份
            </button>
          )}
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}
      </form>

      <div className="pt-4 border-t border-gray-200 flex gap-4">
        <Link
          href="/sync"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          返回同步管理
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
