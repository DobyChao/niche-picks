'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/sync', label: '同步' },
  { href: '/identity', label: '身份' },
  { href: '/friends', label: '友链' },
  { href: '/admin', label: '管理' },
  { href: '/feedback', label: '意见箱' },
];

export default function NavHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setMenuOpen(false), []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="flex items-center justify-between max-w-7xl mx-auto px-4 h-14">
        <Link href="/" className="shrink-0 text-lg font-bold text-gray-900 tracking-tight hover:text-blue-600 transition-colors">
          小众点评
        </Link>

        {/* Desktop horizontal links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                pathname === href
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="md:hidden p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={close} />
          <nav className="absolute top-full right-2 mt-1 z-50 md:hidden w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={`block px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
