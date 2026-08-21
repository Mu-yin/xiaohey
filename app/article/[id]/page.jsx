import { notFound } from "next/navigation";
import ArticleReader from "@/components/ArticleReader";
import { entries, siteConfig } from "@/data/content";
import "../article.css";

const publishedEntries = entries.filter((entry) => entry.status === "published");

export function generateStaticParams() {
  return publishedEntries.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const entry = publishedEntries.find((item) => item.id === id);
  if (!entry) return {};
  return {
    title: `${entry.title} · ${siteConfig.brand}`,
    description: entry.abstract,
    openGraph: { title: entry.title, description: entry.abstract, type: "article" },
  };
}

export default async function ArticlePage({ params }) {
  const { id } = await params;
  const entry = publishedEntries.find((item) => item.id === id);
  if (!entry) notFound();
  return <ArticleReader entry={entry} />;
}
