import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import NavHeader from "@/components/layout/NavHeader";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
    <html lang="zh-CN" className={`${notoSans.variable} h-full antialiased`}>
      <body className="h-full flex flex-col bg-background text-foreground font-sans" suppressHydrationWarning>
        <NavHeader />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
