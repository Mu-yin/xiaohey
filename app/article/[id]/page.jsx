import { notFound } from "next/navigation";
import ArticleDownloads from "@/components/ArticleDownloads";
import { entries, siteConfig } from "@/data/content";
import "../article.css";

const publishedEntries = entries.filter((entry) => entry.status === "published");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const assetUrl = (value = "") => !value || /^https?:\/\//.test(value) ? value : `${basePath}/${value.replace(/^\.?\//, "")}`;

function Cover({ entry }) {
  return (
    <div className={`article-hero-cover cover-${entry.accent}`}>
      {entry.coverImage && <img src={assetUrl(entry.coverImage)} alt="" />}
      <span className="article-cover-grid" />
      <span className="article-cover-index">{entry.index}</span>
      <span className="article-cover-glyph">{entry.type === "论文精读" ? "研" : entry.type === "课程笔记" ? "学" : entry.type === "资料工具" ? "器" : "记"}</span>
      <span className="article-cover-label">{entry.eyebrow}</span>
    </div>
  );
}

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
  const currentIndex = publishedEntries.findIndex((item) => item.id === entry.id);
  const nextEntry = publishedEntries[(currentIndex + 1) % publishedEntries.length];

  return (
    <div className="article-page" id="top">
      <header className="article-site-header">
        <a className="article-brand" href={`${basePath}/`}><span>小</span><strong>{siteConfig.brand}</strong><small>{siteConfig.brandTagline}</small></a>
        <a className="article-back" href={`${basePath}/#library`}>← 返回知识库</a>
      </header>

      <Cover entry={entry} />

      <main className="article-layout">
        <aside className="article-sidebar">
          <div className="article-sidebar-card">
            <span>CONTENTS</span>
            <nav>{entry.sections.map((section, index) => <a key={section.title} href={`#section-${index + 1}`}><em>0{index + 1}</em>{section.title}</a>)}</nav>
          </div>
          <div className="article-sidebar-card export-card">
            <span>DOWNLOAD</span>
            <h2>保存这篇文章</h2>
            <p>下载后可以继续批注、编辑或离线阅读。</p>
            <ArticleDownloads entry={entry} basePath={basePath} />
          </div>
        </aside>

        <article className="article-reader">
          <div className="article-kicker">{entry.eyebrow}</div>
          <h1>{entry.title}</h1>
          <div className="article-meta"><span>{entry.type}</span><time>{entry.date}</time><span>{entry.readTime}</span><span>{entry.level}</span></div>
          <p className="article-abstract">{entry.abstract}</p>
          <blockquote>“{entry.takeaway}”</blockquote>

          {entry.sections.map((section, index) => (
            <section id={`section-${index + 1}`} key={section.title}>
              <div className="article-section-heading"><span>0{index + 1}</span><h2>{section.title}</h2></div>
              <div className="article-section-body">{section.body.split(/\n{2,}/).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div>
            </section>
          ))}

          {!!entry.attachments?.length && <section className="article-file-section" id="attachments">
            <div className="article-section-heading"><span>附</span><h2>相关资料与附件</h2></div>
            <div className="article-file-list">{entry.attachments.map((attachment) => <a key={attachment.path} href={assetUrl(attachment.path)} target="_blank" rel="noreferrer" download={attachment.download !== false}><strong>{attachment.name}</strong><small>{attachment.description || "打开或下载资料"}</small><span>下载 ↓</span></a>)}</div>
          </section>}

          <div className="article-citation"><span>推荐引用</span><p>{entry.citation}</p></div>
          <footer className="article-reader-footer">
            <a href={`${basePath}/#library`}>返回全部文章</a>
            {nextEntry && <a href={`${basePath}/article/${nextEntry.id}/`}>下一篇：{nextEntry.title} →</a>}
          </footer>
        </article>
      </main>

      <footer className="article-site-footer"><span>© 2026 {siteConfig.brand}</span><a href="#top">回到顶部 ↑</a></footer>
    </div>
  );
}
