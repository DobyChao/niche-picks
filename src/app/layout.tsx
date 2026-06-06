import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavHeader from "@/components/layout/NavHeader";
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
      <body className="h-full flex flex-col bg-gray-50" suppressHydrationWarning>
        <NavHeader />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
