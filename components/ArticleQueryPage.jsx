"use client";

import { useEffect, useState } from "react";
import ArticleReader from "@/components/ArticleReader";
import { entries } from "@/data/content";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ArticleQueryPage() {
  const [articleId, setArticleId] = useState(null);
  useEffect(() => { setArticleId(new URLSearchParams(window.location.search).get("id") || ""); }, []);
  if (articleId === null) return <main className="article-query-state"><p>正在打开文章…</p></main>;
  const entry = entries.find((item) => item.status === "published" && item.id === articleId);
  if (entry) return <ArticleReader entry={entry} />;
  return <main className="article-query-state"><span>404</span><h1>没有找到这篇文章</h1><p>文章可能尚未公开，或链接已失效。</p><a href={`${basePath}/#library`}>返回文章列表</a></main>;
}
