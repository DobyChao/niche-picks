import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小众点评",
  description: "小众点评 — 发现身边好店",
};

function NavHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="flex items-center justify-between max-w-7xl mx-auto px-4 h-14">
        <Link href="/" className="text-lg font-bold text-gray-900 tracking-tight hover:text-blue-600 transition-colors">
          小众点评
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            首页
          </Link>
          <Link
            href="/sync"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            同步
          </Link>
          <Link
            href="/identity"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            身份
          </Link>
          <Link
            href="/admin"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            管理
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-gray-50">
        <NavHeader />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
