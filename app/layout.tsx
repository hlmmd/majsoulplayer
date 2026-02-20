import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "雀魂数据",
  description: "雀魂数据查询与管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
