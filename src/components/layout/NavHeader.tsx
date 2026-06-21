'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

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

  const linkClass = (href: string, block = false) =>
    cn(
      'text-sm font-medium transition-colors',
      block ? 'block px-3 py-2' : 'whitespace-nowrap px-3 py-1.5 rounded-[var(--radius-button)]',
      pathname === href
        ? 'text-primary bg-primary-muted'
        : 'text-muted hover:text-primary hover:bg-primary-muted/60',
    );

  return (
    <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-border">
      <nav className="flex items-center justify-between max-w-7xl mx-auto px-4 h-14">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold text-foreground tracking-tight font-serif hover:text-primary transition-colors"
        >
          小众点评
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              {label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden p-2 rounded-[var(--radius-button)] text-muted hover:text-primary hover:bg-primary-muted/60 transition-colors"
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

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={close} />
          <nav className="absolute top-full right-2 mt-1 z-50 md:hidden w-36 bg-surface rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] border border-border py-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} onClick={close} className={linkClass(href, true)}>
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
