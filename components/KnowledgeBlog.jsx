"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Giscus from "@giscus/react";
import { entries as allEntries, filters, notes, siteConfig } from "@/data/content";

const entries = allEntries.filter((entry) => entry.status === "published");
const articleUrl = (entry) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/article/${entry.id}/`;
const assetUrl = (value = "") => {
  if (!value || /^https?:\/\//.test(value)) return value;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${base}/${value.replace(/^\.?\//, "")}`;
};

const iconPaths = {
  search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></>,
  moon: <path d="M20.5 15.6A8.7 8.7 0 0 1 8.4 3.5 8.8 8.8 0 1 0 20.5 15.6Z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  bookmark: <path d="M6.5 4.5c0-1.1.9-2 2-2h7c1.1 0 2 .9 2 2v17L12 18l-5.5 3.5v-17Z"/>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  download: <><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5"/><path d="M4 20h16"/></>,
  share: <><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
};

function Icon({ name, size = 20, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

function Logo({ compact = false }) {
  return (
    <a className="brand" href="#top" aria-label="xiaohey 首页">
      <span className="brand-mark" aria-hidden="true"><span>小</span><i /></span>
      {!compact && <span className="brand-copy"><strong>{siteConfig.brand}</strong><small>{siteConfig.brandTagline}</small></span>}
    </a>
  );
}

function Cover({ entry, featured = false }) {
  return (
    <div className={`cover cover-${entry.accent} ${featured ? "cover-featured" : ""}`} aria-hidden="true">
      {entry.coverImage && <img className="cover-image" src={assetUrl(entry.coverImage)} alt="" />}
      <span className="cover-grid" />
      <span className="cover-index">{entry.index}</span>
      <span className="cover-label">{entry.eyebrow}</span>
      <span className="cover-glyph">{entry.type === "论文精读" ? "研" : entry.type === "课程笔记" ? "学" : entry.type === "资料工具" ? "器" : "记"}</span>
      <span className="cover-line" />
    </div>
  );
}

function SearchDialog({ open, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries.slice(0, 5);
    return entries.filter((entry) => [entry.title, entry.abstract, entry.type, ...entry.tags].join(" ").toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="search-dialog" role="dialog" aria-modal="true" aria-label="搜索知识库">
        <div className="search-field">
          <Icon name="search" size={22} />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、标签或关键词…" />
          <button className="keycap" onClick={onClose}>ESC</button>
        </div>
        <div className="search-results">
          <div className="search-caption">{query ? `找到 ${results.length} 条结果` : "最近整理"}</div>
          {results.length ? results.map((entry) => (
            <button className="search-result" key={entry.id} onClick={() => { onSelect(entry); onClose(); }}>
              <span className={`result-badge badge-${entry.accent}`}>{entry.index}</span>
              <span><strong>{entry.title}</strong><small>{entry.type} · {entry.tags.join(" / ")}</small></span>
              <Icon name="arrow" size={18} />
            </button>
          )) : <div className="search-empty">没有找到匹配内容，换个关键词试试。</div>}
        </div>
        <footer className="search-footer"><span>↑↓ 浏览</span><span>Enter 打开</span><span>Esc 关闭</span></footer>
      </section>
    </div>
  );
}

function EntryCard({ entry, saved, onSave, onOpen }) {
  return (
    <article className="entry-card">
      <button className="card-open" onClick={() => onOpen(entry)} aria-label={`阅读：${entry.title}`}>
        <Cover entry={entry} />
      </button>
      <div className="card-body">
        <div className="card-meta"><span>{entry.type}</span><time>{entry.date}</time></div>
        <button className="title-button" onClick={() => onOpen(entry)}><h3>{entry.title}</h3></button>
        <p>{entry.abstract}</p>
        <div className="tag-row">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <div className="card-foot">
          <span>{entry.readTime} · {entry.level}</span>
          <button className={`save-button ${saved ? "is-saved" : ""}`} onClick={() => onSave(entry.id)} aria-label={saved ? "取消收藏" : "收藏文章"} title={saved ? "取消收藏" : "收藏文章"}>
            <Icon name="bookmark" size={18} filled={saved} />
          </button>
        </div>
      </div>
    </article>
  );
}

function DetailDrawer({ entry, saved, onSave, onClose, onToast, theme }) {
  if (!entry) return null;

  const copyCitation = async () => {
    await navigator.clipboard?.writeText(entry.citation);
    onToast("引用格式已复制");
  };

  const shareEntry = async () => {
    const shareData = { title: entry.title, text: entry.abstract, url: `${window.location.origin}${articleUrl(entry)}` };
    if (navigator.share) await navigator.share(shareData);
    else {
      await navigator.clipboard?.writeText(shareData.url);
      onToast("分享链接已复制");
    }
  };

  return (
    <div className="drawer-shell" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <header className="drawer-actions">
          <span>{entry.index} · {entry.type}</span>
          <div>
            <a className="drawer-full-link" href={articleUrl(entry)} target="_blank" rel="noreferrer">阅读全文 ↗</a>
            <button onClick={() => onSave(entry.id)} className={saved ? "is-saved" : ""} title="本机收藏"><Icon name="bookmark" filled={saved} /></button>
            <button onClick={shareEntry} title="分享"><Icon name="share" /></button>
            <button onClick={onClose} title="关闭"><Icon name="close" /></button>
          </div>
        </header>
        <Cover entry={entry} featured />
        <div className="detail-content">
          <div className="detail-kicker">{entry.eyebrow}</div>
          <h2 id="detail-title">{entry.title}</h2>
          <div className="detail-meta"><span>{entry.date}</span><span>{entry.readTime}</span><span>{entry.level}</span></div>
          <p className="detail-lead">{entry.abstract}</p>
          <blockquote>“{entry.takeaway}”</blockquote>
          {entry.sections.map((section, index) => (
            <section key={section.title}>
              <span className="section-number">0{index + 1}</span>
              <h3>{section.title}</h3>
              <p className="article-body">{section.body}</p>
            </section>
          ))}
          {!!entry.attachments?.length && (
            <section className="article-attachments">
              <span className="section-number">附</span>
              <h3>相关资料与附件</h3>
              <div className="attachment-list">
                {entry.attachments.map((attachment) => (
                  <a key={attachment.path} href={assetUrl(attachment.path)} target="_blank" rel="noreferrer" download={attachment.download !== false}>
                    <Icon name="download" size={18} />
                    <span><strong>{attachment.name}</strong><small>{attachment.description || "打开或下载资料"}</small></span>
                  </a>
                ))}
              </div>
            </section>
          )}
          <div className="citation-box">
            <span>推荐引用</span>
            <p>{entry.citation}</p>
            <button onClick={copyCitation}><Icon name="copy" size={17} />复制引用</button>
          </div>
          <a className="download-note" href={articleUrl(entry)} target="_blank" rel="noreferrer"><Icon name="arrow" />在新页面阅读全文与下载</a>
          <section className="github-discussion">
            <div className="discussion-heading">
              <span>GITHUB DISCUSSION</span>
              <h3>评论与讨论</h3>
              <p>内容可以直接阅读；评论、回复和表态需要登录 GitHub 账号。</p>
            </div>
            <Giscus
              repo="Mu-yin/Muyin"
              repoId="R_kgDOS-Vedg"
              category="General"
              categoryId="DIC_kwDOS-Veds4C_auY"
              mapping="specific"
              term={`xiaohey:${entry.id}`}
              strict="1"
              reactionsEnabled="1"
              emitMetadata="0"
              inputPosition="top"
              theme={theme === "dark" ? "dark" : "light"}
              lang="zh-CN"
              loading="lazy"
            />
          </section>
        </div>
      </article>
    </div>
  );
}

export default function KnowledgeBlog() {
  const [theme, setTheme] = useState("light");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(new Set());
  const [toast, setToast] = useState("");
  const [progress, setProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const featured = entries.find((entry) => entry.id === siteConfig.featuredPostId) || entries.find((entry) => entry.featured) || entries[0];
  const visibleEntries = filter === "all" ? entries : entries.filter((entry) => entry.typeKey === filter);

  useEffect(() => {
    const savedTheme = localStorage.getItem("xiaohey-theme");
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme || (preferredDark ? "dark" : "light"));
    try { setSaved(new Set(JSON.parse(localStorage.getItem("xiaohey-saved") || "[]"))); } catch { /* ignore malformed local data */ }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("xiaohey-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") { setSearchOpen(false); setSelected(null); setMenuOpen(false); }
    };
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = searchOpen || selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen, selected]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__xiaoheyToast);
    window.__xiaoheyToast = window.setTimeout(() => setToast(""), 2200);
  };

  const toggleSave = (id) => {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) { next.delete(id); notify("已取消收藏"); }
      else { next.add(id); notify("已收藏到本机"); }
      localStorage.setItem("xiaohey-saved", JSON.stringify([...next]));
      return next;
    });
  };

  const subscribe = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    notify("订阅成功，欢迎加入");
    setEmail("");
  };

  return (
    <div className="site" id="top">
      <div className="reading-bar" style={{ width: `${progress}%` }} />
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="主导航">
            <a href="#library" onClick={() => setMenuOpen(false)}>知识库</a>
            <a href="#papers" onClick={() => setMenuOpen(false)}>论文精读</a>
            <a href="#notes" onClick={() => setMenuOpen(false)}>随手记</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>关于</a>
          </nav>
          <div className="header-actions">
            <button className="search-trigger" onClick={() => setSearchOpen(true)}><Icon name="search" /><span>搜索</span><kbd>⌘ K</kbd></button>
            <button className="icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? "切换至暗色模式" : "切换至浅色模式"}><Icon name={theme === "light" ? "moon" : "sun"} /></button>
            <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="打开导航菜单"><Icon name={menuOpen ? "close" : "menu"} /></button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span /> {siteConfig.heroEyebrow}</div>
            <h1 id="hero-title">{siteConfig.heroTitle}<br /><em>{siteConfig.heroEmphasis}</em></h1>
            <p>{siteConfig.heroDescription}</p>
            <div className="hero-actions">
              <a className="primary-button" href="#library">{siteConfig.heroPrimaryAction} <Icon name="arrow" size={18} /></a>
              <button className="text-button" onClick={() => setSearchOpen(true)}>{siteConfig.heroSecondaryAction}</button>
            </div>
            <dl className="hero-stats">
              <div><dt>{String(entries.length).padStart(2, "0")}</dt><dd>篇公开内容</dd></div>
              <div><dt>{String(entries.filter((entry) => entry.typeKey === "paper").length).padStart(2, "0")}</dt><dd>篇论文精读</dd></div>
              <div><dt>{String(filters.length - 1).padStart(2, "0")}</dt><dd>个内容分类</dd></div>
            </dl>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="paper paper-back"><span>FIELD NOTES / 026</span></div>
            <div className="paper paper-main">
              <div className="paper-head"><span>XH—ARCHIVE</span><span>08 / 2026</span></div>
              <div className="paper-title">{siteConfig.visualTitle.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</div>
              <div className="paper-circle">知</div>
              <p>It is a garden<br />that asks for<br />patient tending.</p>
              <div className="paper-foot"><span>LEARN</span><span>LINK</span><span>CREATE</span></div>
            </div>
            <span className="visual-note">{siteConfig.visualNote.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</span>
          </div>
        </section>

        <section className="featured-section" id="papers">
          <div className="section-heading inverse">
            <div><span className="section-index">01</span><h2>本期精选</h2></div>
            <span className="rule-label">EDITOR&apos;S PICK</span>
          </div>
          <article className="featured-card">
            <Cover entry={featured} featured />
            <div className="featured-copy">
              <div className="feature-meta"><span>{featured.type}</span><span>{featured.date}</span></div>
              <h3>{featured.title}</h3>
              <p>{featured.abstract}</p>
              <blockquote>{featured.takeaway}</blockquote>
              <div className="feature-foot">
                <div>{featured.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                <button onClick={() => setSelected(featured)}>快速预览 <Icon name="arrow" size={18} /></button>
              </div>
            </div>
          </article>
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <div><span className="section-index">02</span><h2>知识库</h2></div>
            <p>按主题漫游，也可以用 <button onClick={() => setSearchOpen(true)}>搜索</button> 直达一条线索。</p>
          </div>
          <div className="filter-row" role="tablist" aria-label="内容筛选">
            {filters.map((item) => <button key={item.key} className={filter === item.key ? "active" : ""} onClick={() => setFilter(item.key)}>{item.label}<sup>{item.key === "all" ? entries.length : entries.filter((entry) => entry.typeKey === item.key).length}</sup></button>)}
          </div>
          <div className="entry-grid">
            {visibleEntries.map((entry) => <EntryCard key={entry.id} entry={entry} saved={saved.has(entry.id)} onSave={toggleSave} onOpen={setSelected} />)}
          </div>
          {!visibleEntries.length && <div className="empty-filter">这个分类正在生长中。</div>}
        </section>

        <section className="notes-section" id="notes">
          <div className="section-heading inverse">
            <div><span className="section-index">03</span><h2>随手记</h2></div>
            <span className="rule-label">MARGINALIA</span>
          </div>
          <div className="notes-grid">
            {notes.map((note, index) => (
              <article key={note.date}>
                <header><time>{note.date}</time><span>0{index + 1}</span></header>
                <p>“{note.text}”</p>
                <footer><span>#{note.tag}</span><i /></footer>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-grid">
            <div className="about-mark"><span>小</span><i /></div>
            <div className="about-copy">
              <span className="section-index">04 · ABOUT</span>
              <h2>{siteConfig.aboutTitle}</h2>
              {siteConfig.aboutParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <div className="about-links"><a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">GitHub 主页</a><a href="#library">浏览全部内容</a></div>
            </div>
            <aside className="principles">
              <span>整理原则</span>
              <ol>{siteConfig.principles.map((item, index) => <li key={item}><b>0{index + 1}</b> {item}</li>)}</ol>
            </aside>
          </div>
        </section>

        <section className="newsletter-section">
          <div><span>LETTER FROM XIAOHEY</span><h2>{siteConfig.newsletterTitle.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h2></div>
          {subscribed ? <div className="subscribed"><Icon name="check" size={28} /><strong>订阅成功</strong><span>下一封来信见。</span></div> : (
            <form onSubmit={subscribe}>
              <label htmlFor="newsletter-email">电子邮箱</label>
              <div><input id="newsletter-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><button type="submit">订阅来信 <Icon name="arrow" size={18} /></button></div>
              <small>{siteConfig.newsletterDescription}</small>
            </form>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top"><Logo /><p>{siteConfig.footerQuote.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</p><a href="#top">回到顶部 ↑</a></div>
        <div className="footer-bottom"><span>© 2026 xiaohey. Built for slow learning.</span><nav><a href="#library">知识库</a><a href="#about">关于</a><button onClick={() => setSearchOpen(true)}>搜索</button></nav></div>
      </footer>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={setSelected} />
      <DetailDrawer entry={selected} saved={selected ? saved.has(selected.id) : false} onSave={toggleSave} onClose={() => setSelected(null)} onToast={notify} theme={theme} />
      {toast && <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div>}
    </div>
  );
}
