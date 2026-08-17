import "./globals.css";

export const metadata = {
  title: "xiaohey · 学习与研究博客",
  description: "整理学习资料、论文阅读、研究笔记与长期思考的个人知识花园。",
  keywords: ["学习资料", "论文笔记", "知识管理", "个人博客", "xiaohey"],
  openGraph: {
    title: "xiaohey · 学习与研究博客",
    description: "让知识被看见，让思考有迹可循。",
    type: "website",
    locale: "zh_CN",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#151916" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
