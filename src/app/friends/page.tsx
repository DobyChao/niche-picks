import type { Metadata } from 'next';
import Link from 'next/link';
import { friendLinks } from '@/lib/data/friends';

export const metadata: Metadata = {
  title: '友链 — 小众点评',
  description: '小众点评的友情链接',
};

export default function FriendsPage() {
  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 min-h-full lg:h-full flex flex-col gap-5">
      {/* Title row */}
      <div className="pt-1 flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">友情链接</h1>
          <p className="mt-1 text-sm text-gray-500">感谢这些朋友的支持与帮助</p>
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

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {friendLinks.map((friend) => (
          <a
            key={friend.url}
            href={friend.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm hover:border-blue-300 transition-all group"
          >
            {friend.avatar ? (
              <img
                src={friend.avatar}
                alt={friend.name}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                {friend.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                {friend.name}
              </h2>
              {friend.description && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{friend.description}</p>
              )}
            </div>
            {friend.tags && friend.tags.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                {friend.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
