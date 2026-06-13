'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FeedbackPage() {
  const [nickname, setNickname] = useState('');
  const [contact, setContact] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), contact: contact.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');

      setMsg({ type: 'success', text: '感谢您的反馈！' });
      setNickname('');
      setContact('');
      setContent('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || '提交失败，请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
      <div className="pt-1 flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">意见箱</h1>
          <p className="mt-1 text-sm text-gray-500">欢迎提出您的建议和意见</p>
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

      <div className="flex-1 flex items-start justify-center pt-4 lg:pt-8">
        <div className="w-full max-w-lg">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-6 space-y-5">
            {msg && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  msg.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {msg.type === 'success' ? '✓' : '✕'} {msg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                  昵称
                  <span className="text-gray-400 font-normal ml-1">（可选）</span>
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="您的称呼"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
                  联系方式
                  <span className="text-gray-400 font-normal ml-1">（可选）</span>
                </label>
                <input
                  id="contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="邮箱或其他联系方式"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  意见内容
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请写下您的建议或意见..."
                  rows={5}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '提交中...' : '提交反馈'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
