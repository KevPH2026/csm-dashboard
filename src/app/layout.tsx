import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIMI 客户运营驾驶舱",
  description: "客户运营驾驶舱 · 数据智能决策 · 从客户价值视角分析健康度、续费流失、产品价值与团队效能",
  keywords: ["CSM", "客户成功", "AIMI", "客户运营", "驾驶舱", "续费流失", "健康度", "数据智能"],
  authors: [{ name: "AIMI Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AIMI 客户运营驾驶舱",
    description: "客户运营驾驶舱 · 数据智能决策",
    url: "https://chat.z.ai",
    siteName: "AIMI 客户运营驾驶舱",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIMI 客户运营驾驶舱",
    description: "客户运营驾驶舱 · 数据智能决策",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
