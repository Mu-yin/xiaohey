import ArticleQueryPage from "@/components/ArticleQueryPage";
import { siteConfig } from "@/data/content";
import "../article/article.css";

export const metadata = { title: `阅读全文 · ${siteConfig.brand}`, description: siteConfig.description };

export default function ArticlePage() {
  return <ArticleQueryPage />;
}
