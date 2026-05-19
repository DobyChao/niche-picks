'use client';

import { useState } from 'react';
import { useLiveQuery } from '@/lib/db';
import { pushLocalChanges } from '@/lib/sync/push';
import { pullRemoteData } from '@/lib/sync/pull';

export default function SyncPanel() {
  const [userToken, setUserToken] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Get changelog count reactively
  const changelogEntries = useLiveQuery(
    async () => {
      // Try to query the changelog table if it exists
      try {
        const { db } = await import('@/lib/db');
        return await db.table('changelog').toArray();
      } catch {
        return [];
      }
    },
    [],
    []
  );

  const changelogCount = changelogEntries?.length ?? 0;

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    // Auto-clear after 5 seconds
    setTimeout(() => setMessage(null), 5000);
  }

  async function handlePush() {
    if (!userToken.trim()) {
      showMessage('error', '请输入 User Token');
      return;
    }
    if (!authorName.trim()) {
      showMessage('error', '请输入昵称');
      return;
    }

    setIsPushing(true);
    setMessage(null);

    try {
      await pushLocalChanges(userToken.trim(), authorName.trim());
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
    if (!userToken.trim()) {
      showMessage('error', '请输入 User Token');
      return;
    }

    setIsPulling(true);
    setMessage(null);

    try {
      await pullRemoteData(userToken.trim());
      showMessage('success', '拉取成功！远程数据已同步到本地。');
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">数据同步</h2>

      {/* User Token Input */}
      <div>
        <label
          htmlFor="sync-token"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          User Token
        </label>
        <input
          id="sync-token"
          type="password"
          value={userToken}
          onChange={(e) => setUserToken(e.target.value)}
          placeholder="输入你的同步 Token"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-400"
        />
      </div>

      {/* Author Name Input */}
      <div>
        <label
          htmlFor="sync-author"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          昵称
        </label>
        <input
          id="sync-author"
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="输入你的昵称"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-400"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePush}
          disabled={isPushing || isPulling}
          className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200 text-sm"
        >
          {isPushing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              推送中...
            </span>
          ) : (
            '⬆ 推送变更'
          )}
        </button>
        <button
          onClick={handlePull}
          disabled={isPushing || isPulling}
          className="flex-1 py-2.5 px-4 bg-green-600 text-white font-medium rounded-lg
                     hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200 text-sm"
        >
          {isPulling ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              拉取中...
            </span>
          ) : (
            '⬇ 拉取数据'
          )}
        </button>
      </div>

      {/* Result Message */}
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

      {/* Changelog Count */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">待同步变更</span>
          <span className="font-medium text-gray-700">
            {changelogCount} 条记录
          </span>
        </div>
      </div>
    </div>
  );
}
