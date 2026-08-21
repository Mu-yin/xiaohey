"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { categories as initialCategories, entries as initialEntries, notes as initialNotes, siteConfig as initialSite } from "@/data/content";
import { buildSmartDraft } from "@/lib/smart-draft.mjs";
import MarkdownContent from "@/components/MarkdownContent";

const ACCENTS = ["green", "terracotta", "navy", "ochre", "slate", "plum"];
const deepCopy = (value) => JSON.parse(JSON.stringify(value));
const today = () => new Date().toISOString().slice(0, 10).replaceAll("-", ".");
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "") || `note-${Date.now()}`;
const safeArticleId = () => `article-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const safeAssetFolder = () => `uploads/assets/file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const humanSize = (bytes = 0) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const publicFilePath = (path = "") => `public/${path.replace(/^\/?public\//, "").replace(/^\/+/, "")}`;
const defaultCitation = (title, date = "") => `xiaohey. (${date.match(/\d{4}/)?.[0] || new Date().getFullYear()}). ${title}. xiaohey 学习与研究博客.`;

function normalizedAttachmentName(value, originalName = "") {
  const originalExtension = originalName.match(/\.[^.]+$/)?.[0] || "";
  let name = value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/^\.+|\.+$/g, "");
  if (!name) return "";
  if (originalExtension && !name.toLowerCase().endsWith(originalExtension.toLowerCase())) name += originalExtension;
  return name;
}

async function githubApi(path, token, init = {}) {
  const result = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  const data = result.status === 204 ? {} : await result.json().catch(() => ({}));
  if (!result.ok) {
    if (result.status === 401) throw new Error("GitHub 授权已失效，请重新连接");
    if (result.status === 403) throw new Error("令牌权限不足，请确认已授予该仓库“Contents: Read and write”权限");
    throw new Error(data.message || `GitHub 请求失败 (${result.status})`);
  }
  return data;
}

async function verifyGitHubToken(token, allowedLogin) {
  const user = await githubApi("/user", token);
  if (user.login?.toLowerCase() !== allowedLogin.toLowerCase()) {
    throw new Error(`只能使用 ${allowedLogin} 的 GitHub 账号连接`);
  }
  return user;
}

function sectionsFromMarkdown(markdown = "") {
  const sections = [];
  let current = { title: "正文", lines: [] };
  for (const line of markdown.replace(/\r/g, "").split("\n")) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      if (current.lines.join("\n").trim()) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
      current = { title: heading[1].replace(/[*_`~]/g, "").trim(), lines: [] };
    } else current.lines.push(line);
  }
  if (current.lines.join("\n").trim() || !sections.length) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
  return sections;
}

function serializePost(post) {
  const { type, sections, rawMarkdown, sourceFile, ...meta } = post;
  const body = rawMarkdown?.trim() || sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n");
  return `---\n${JSON.stringify(meta)}\n---\n\n${body}\n`;
}

function emptyPost(categories, count) {
  const category = categories.find((item) => item.visible) || categories[0];
  const id = `new-note-${Date.now()}`;
  return {
    id,
    sourceFile: `${id}.md`,
    typeKey: category?.key || "essay",
    type: category?.label || "随笔",
    title: "未命名文章",
    eyebrow: "NEW · NOTE",
    date: today(),
    readTime: "5 分钟",
    level: "随想",
    tags: [],
    abstract: "在这里写一段文章摘要。",
    takeaway: "在这里写下最重要的一句话。",
    accent: category?.accent || "green",
    index: `N—${String(count + 1).padStart(2, "0")}`,
    featured: false,
    status: "draft",
    coverImage: "",
    attachments: [],
    citation: "xiaohey. 未命名文章. xiaohey 学习与研究博客.",
    rawMarkdown: "## 正文\n\n开始写下你的内容。",
    sections: [{ title: "正文", body: "开始写下你的内容。" }],
  };
}

function postWithSmartDraft(post, draft) {
  const id = post.id || safeArticleId();
  return {
    ...post,
    id,
    sourceFile: `${id}.md`,
    title: draft.title,
    typeKey: draft.typeKey,
    type: draft.type,
    accent: draft.accent,
    abstract: draft.abstract,
    takeaway: draft.takeaway,
    tags: draft.tags,
    eyebrow: draft.eyebrow,
    readTime: draft.readTime,
    level: draft.level,
    rawMarkdown: draft.rawMarkdown,
    sections: sectionsFromMarkdown(draft.rawMarkdown),
    citation: post.citation?.trim() && !post.citation.includes("未命名") ? post.citation : defaultCitation(draft.title, post.date),
  };
}

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    file: <><path d="M6 2.5h8l4 4V21H6z"/><path d="M14 2.5V7h4M9 12h6M9 16h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9L.4 6.2l.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7z" transform="translate(2) scale(.83)"/></>,
    upload: <><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v5h16v-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/><path d="M10 11v6M14 11v6"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    cloud: <><path d="M6.5 18.5h11a4 4 0 0 0 .4-8 6 6 0 0 0-11.5-1.5A4.8 4.8 0 0 0 6.5 18.5Z"/><path d="m9 14 3-3 3 3M12 11v7"/></>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z"/><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7ZM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7Z"/></>,
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function SmartDraftPanel({ report, analyzing, focus, onFocusChange, onAnalyze, onApply, onApplyAll, onChooseFile }) {
  const suggestions = report ? [
    { key: "title", label: "标题", value: report.title },
    { key: "category", label: "分类", value: report.type },
    { key: "abstract", label: "摘要", value: report.abstract },
    { key: "takeaway", label: "核心观点", value: report.takeaway },
    { key: "tags", label: "标签", value: report.tags.join(" · ") },
    { key: "eyebrow", label: "眉题", value: report.eyebrow },
  ] : [];
  return <section className={`smart-draft-panel ${report ? "has-report" : ""}`}>
    <header><div className="smart-draft-title"><span><Icon name="sparkles" /></span><div><em>SMART DRAFT</em><h2>智能建稿助手</h2></div></div><span className="smart-mode">本机安全分析</span></header>
    <label className="smart-focus">分析重点（可选）<input value={focus} onChange={(event) => onFocusChange(event.target.value)} placeholder="例如：重点提炼作者的研究结论、方法局限和实践建议" /></label>
    {!report ? <div className="smart-empty"><p>上传 Word、PDF、Markdown 或 TXT 后，会自动生成标题、分类、摘要、核心观点、标签、眉题和正文结构。</p><div><button type="button" onClick={onChooseFile}><Icon name="upload" />上传文件并自动建稿</button><button type="button" className="secondary" onClick={onAnalyze} disabled={analyzing}>{analyzing ? "正在分析…" : "分析当前正文"}</button></div></div> : <>
      <div className="smart-report-meta"><div><strong>{report.sourceName}</strong><span>{report.sourceLength.toLocaleString()} 字 · {new Date(report.generatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span></div><button type="button" onClick={onAnalyze} disabled={analyzing}>{analyzing ? "正在分析…" : "重新分析正文"}</button></div>
      <div className="smart-signals">{report.signals.map((signal) => <span key={signal}>✓ {signal}</span>)}</div>
      {!!report.evidence?.length && <details className="smart-evidence"><summary>查看摘要生成依据</summary>{report.evidence.map((sentence) => <p key={sentence}>“{sentence}”</p>)}</details>}
      <div className="smart-suggestion-grid">{suggestions.map((item) => <article key={item.key}><span>{item.label}</span><p>{item.value}</p><button type="button" onClick={() => onApply(item.key)}>采用</button></article>)}</div>
      <div className="smart-draft-footer"><p>建议已经自动填入新文章，你可以继续修改；“采用全部”会覆盖当前表单内容。</p><div><button type="button" className="secondary" onClick={() => onApply("rawMarkdown")}>采用正文结构</button><button type="button" onClick={onApplyAll}>采用全部建议</button></div></div>
    </>}
    <small>当前版本在浏览器本机整理原文，不上传文件。阿里云 AI 接口将在安全地址配置完成后用于进一步润色。</small>
  </section>;
}

function MarkdownToolbar({ onInsert }) {
  const tools = [
    ["H1", "# ", "", "一级标题"], ["H2", "## ", "", "二级标题"], ["B", "**", "**", "粗体文字"], ["I", "*", "*", "斜体文字"],
    ["引用", "> ", "", "引用内容"], ["列表", "- ", "", "列表项目"], ["链接", "[", "](https://)", "链接文字"], ["代码", "`", "`", "代码"],
  ];
  return <div className="markdown-toolbar" aria-label="Markdown 快捷工具栏">{tools.map(([label, before, after, placeholder]) => <button type="button" key={label} onClick={() => onInsert(before, after, placeholder)} title={`插入${placeholder}`}>{label}</button>)}</div>;
}

export default function AdminStudio() {
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState(() => deepCopy(initialEntries));
  const [categories, setCategories] = useState(() => deepCopy(initialCategories));
  const [site, setSite] = useState(() => deepCopy(initialSite));
  const [notes, setNotes] = useState(() => deepCopy(initialNotes));
  const [selectedId, setSelectedId] = useState(initialEntries[0]?.id || "");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingMoves, setPendingMoves] = useState([]);
  const [config, setConfig] = useState({ repository: "Mu-yin/xiaohey", branch: "main", allowedLogin: "Mu-yin" });
  const [auth, setAuth] = useState({ loading: true, authenticated: false, login: "" });
  const [loginOpen, setLoginOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisFocus, setAnalysisFocus] = useState("");
  const [smartReports, setSmartReports] = useState({});
  const [publishedFiles, setPublishedFiles] = useState(() => initialEntries.map((post) => post.sourceFile));
  const fileInput = useRef(null);
  const bodyEditor = useRef(null);
  const selected = posts.find((post) => post.id === selectedId) || posts[0];
  const smartReport = smartReports[selectedId];

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__editorToast);
    window.__editorToast = window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/admin-config.json`)
      .then((response) => response.json())
      .then((nextConfig) => setConfig(nextConfig))
      .catch(() => setAuth({ loading: false, authenticated: false, login: "" }));
    const draft = localStorage.getItem("xiaohey-editor-draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.savedAt && confirm(`发现 ${new Date(parsed.savedAt).toLocaleString()} 的本机草稿，是否恢复？`)) {
          setPosts(parsed.posts); setCategories(parsed.categories); setSite(parsed.site); setNotes(parsed.notes); setDirty(true);
        }
      } catch { /* ignore stale drafts */ }
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("xiaohey-github-token");
    if (!token) { setAuth({ loading: false, authenticated: false, login: "" }); return; }
    verifyGitHubToken(token, config.allowedLogin)
      .then((user) => setAuth({ loading: false, authenticated: true, login: user.login }))
      .catch(() => {
        sessionStorage.removeItem("xiaohey-github-token");
        setAuth({ loading: false, authenticated: false, login: "" });
      });
  }, [config.allowedLogin]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem("xiaohey-editor-draft", JSON.stringify({ posts, categories, site, notes, savedAt: Date.now() }));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [dirty, posts, categories, site, notes]);

  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const filteredPosts = useMemo(() => posts.filter((post) => [post.title, post.abstract, post.type, ...(post.tags || [])].join(" ").toLowerCase().includes(query.toLowerCase())), [posts, query]);
  const updatePost = (patch) => {
    setPosts((current) => current.map((post) => post.id === selectedId ? { ...post, ...patch } : post));
    setDirty(true);
  };

  const chooseCategory = (category) => updatePost({ typeKey: category.key, type: category.label, accent: category.accent });

  const chooseFeaturedPost = () => {
    if (!selected) return;
    setSite((current) => ({ ...current, featuredPostId: selected.id }));
    setPosts((current) => current.map((post) => ({ ...post, featured: post.id === selected.id })));
    setDirty(true);
    notify(`《${selected.title}》已设为首页本期精选`);
  };

  const addNote = () => {
    setNotes((current) => [{ date: today(), text: "写下一条简短的想法。", tag: "新想法" }, ...current]);
    setDirty(true);
  };

  const updateNote = (index, patch) => {
    setNotes((current) => current.map((note, noteIndex) => noteIndex === index ? { ...note, ...patch } : note));
    setDirty(true);
  };

  const removeNote = (index) => {
    if (!confirm("确定删除这条随手记吗？发布前仍可刷新页面撤销。")) return;
    setNotes((current) => current.filter((_, noteIndex) => noteIndex !== index));
    setDirty(true);
  };

  const updateCategory = (index, patch) => {
    const category = categories[index];
    const nextCategory = { ...category, ...patch };
    setCategories((current) => current.map((item, categoryIndex) => categoryIndex === index ? nextCategory : item));
    if (patch.label || patch.accent) {
      setPosts((current) => current.map((post) => post.typeKey === category.key ? { ...post, type: patch.label ?? post.type, accent: patch.accent ?? post.accent } : post));
    }
    setDirty(true);
  };

  const addPost = () => {
    const post = emptyPost(categories, posts.length);
    setPosts((current) => [post, ...current]); setSelectedId(post.id); setTab("posts"); setDirty(true);
  };

  const removePost = () => {
    if (!selected || !confirm(`确定删除《${selected.title}》吗？发布前仍可刷新页面撤销。`)) return;
    const next = posts.filter((post) => post.id !== selected.id);
    setPosts(next); setSelectedId(next[0]?.id || ""); setDirty(true);
  };

  const readAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
  });

  const rememberSmartReport = (postId, draft, sourceName) => {
    setSmartReports((current) => ({ ...current, [postId]: { ...draft, sourceName, generatedAt: Date.now() } }));
  };

  const importAsSmartPost = (text, file, extras = {}) => {
    const draft = buildSmartDraft({ text, fileName: file.name, categories, focus: analysisFocus });
    const base = { ...emptyPost(categories, posts.length), ...extras, id: extras.id || safeArticleId() };
    const post = postWithSmartDraft(base, draft, posts);
    setPosts((current) => [post, ...current]);
    setSelectedId(post.id);
    rememberSmartReport(post.id, draft, file.name);
    setDirty(true);
    return post;
  };

  const analyzeSelectedPost = () => {
    if (!selected?.rawMarkdown?.trim()) { notify("请先输入或上传文章正文"); return; }
    setAnalyzing(true);
    window.setTimeout(() => {
      const draft = buildSmartDraft({ text: selected.rawMarkdown, fileName: selected.sourceFile || `${selected.title}.md`, categories, focus: analysisFocus });
      rememberSmartReport(selected.id, draft, selected.sourceFile || "当前正文");
      setAnalyzing(false);
      notify("已生成新的文章信息建议");
    }, 180);
  };

  const applySmartSuggestion = (field) => {
    const report = smartReports[selectedId];
    if (!report) return;
    if (field === "category") updatePost({ typeKey: report.typeKey, type: report.type, accent: report.accent });
    else if (field === "rawMarkdown") updatePost({ rawMarkdown: report.rawMarkdown, sections: sectionsFromMarkdown(report.rawMarkdown) });
    else if (field === "title") updatePost({ title: report.title });
    else updatePost({ [field]: report[field] });
    notify("已采用这条建议");
  };

  const applyAllSmartSuggestions = () => {
    const report = smartReports[selectedId];
    if (!report || !selected) return;
    if (!confirm("将用智能建议更新当前文章的标题、分类、摘要、核心观点、标签、眉题和正文结构，是否继续？")) return;
    const updated = postWithSmartDraft(selected, report, posts);
    setPosts((current) => current.map((post) => post.id === selected.id ? updated : post));
    setSelectedId(updated.id);
    setSmartReports((current) => {
      const next = { ...current, [updated.id]: current[selected.id] };
      if (updated.id !== selected.id) delete next[selected.id];
      return next;
    });
    setDirty(true);
    notify("已采用全部智能建议");
  };

  const insertMarkdown = (before, after, placeholder) => {
    const textarea = bodyEditor.current;
    if (!textarea || !selected) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const chosen = selected.rawMarkdown.slice(start, end) || placeholder;
    const linePrefix = before.endsWith(" ") && start > 0 && selected.rawMarkdown[start - 1] !== "\n" ? "\n" : "";
    const insertion = `${linePrefix}${before}${chosen}${after}`;
    const value = `${selected.rawMarkdown.slice(0, start)}${insertion}${selected.rawMarkdown.slice(end)}`;
    updatePost({ rawMarkdown: value, sections: sectionsFromMarkdown(value) });
    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextStart = start + linePrefix.length + before.length;
      textarea.setSelectionRange(nextStart, nextStart + chosen.length);
    });
  };

  const importFiles = async (files) => {
    const list = [...files];
    if (!list.length) return;
    setDragging(false);
    for (const file of list) {
      try {
        const ext = file.name.split(".").pop().toLowerCase();
        if (["md", "markdown", "txt"].includes(ext)) {
          const text = await file.text();
          importAsSmartPost(text, file);
          notify(`已解析 ${file.name}，并自动生成文章信息`);
        } else if (ext === "docx") {
          const mammoth = await import("mammoth/mammoth.browser");
          const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
          importAsSmartPost(result.value, file);
          notify(`已解析 ${file.name}，并自动生成文章信息`);
        } else if (ext === "pdf") {
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.2.108/pdf.worker.min.mjs";
          const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
          const pages = [];
          for (let index = 1; index <= document.numPages; index += 1) {
            const page = await document.getPage(index); const text = await page.getTextContent(); pages.push(text.items.map((item) => item.str).join(" "));
          }
          const id = safeArticleId();
          const dataUrl = await readAsDataUrl(file); const path = `public/uploads/${id}/${file.name}`;
          importAsSmartPost(pages.join("\n\n"), file, { id, attachments: [{ name: file.name, path: path.replace(/^public\//, ""), description: `PDF · ${humanSize(file.size)}` }] });
          setPendingFiles((current) => [...current, { path, content: dataUrl.split(",")[1], encoding: "base64", name: file.name, size: file.size }]);
          notify(`已提取 ${file.name}，自动建稿并保留原 PDF`);
        } else if (file.type.startsWith("image/")) {
          if (!selected) continue;
          const dataUrl = await readAsDataUrl(file); const path = `public/uploads/${selected.id}/${file.name}`;
          setPendingFiles((current) => [...current, { path, content: dataUrl.split(",")[1], encoding: "base64", name: file.name, size: file.size }]);
          updatePost({ coverImage: path.replace(/^public\//, "") }); notify("封面图片已添加");
        } else {
          if (!selected) continue;
          const dataUrl = await readAsDataUrl(file); const path = `public/uploads/${selected.id}/${file.name}`;
          setPendingFiles((current) => [...current, { path, content: dataUrl.split(",")[1], encoding: "base64", name: file.name, size: file.size }]);
          updatePost({ attachments: [...(selected.attachments || []), { name: file.name, path: path.replace(/^public\//, ""), description: `${file.type || "文件"} · ${humanSize(file.size)}` }] }); notify("附件已添加");
        }
      } catch (error) { notify(`${file.name} 导入失败：${error.message}`); }
    }
  };

  const renameAttachment = (attachment) => {
    if (!selected || /^https?:\/\//i.test(attachment.path)) { notify("外部链接附件不能在这里重命名"); return; }
    const requested = window.prompt("输入公开显示和下载时使用的附件名称（扩展名会自动保留）", attachment.name);
    if (requested === null) return;
    const nextName = normalizedAttachmentName(requested, attachment.name);
    if (!nextName) { notify("请输入有效的附件名称"); return; }
    const currentPath = attachment.path.replace(/\\/g, "/");
    const existingSafeDirectory = currentPath.match(/^(uploads\/assets\/file-[^/]+)\//)?.[1];
    const directory = existingSafeDirectory || safeAssetFolder();
    const nextPath = `${directory}/${nextName}`;
    if (selected.attachments.some((item) => item.path !== attachment.path && item.path.toLowerCase() === nextPath.toLowerCase())) {
      notify("这个名称已被当前文章的其他附件使用"); return;
    }

    const oldPublicPath = publicFilePath(attachment.path);
    const nextPublicPath = publicFilePath(nextPath);
    const isWaitingForPublish = pendingFiles.some((file) => file.path === oldPublicPath);
    if (isWaitingForPublish) {
      setPendingFiles((current) => current.map((file) => file.path === oldPublicPath ? { ...file, path: nextPublicPath, name: nextName } : file));
    } else {
      setPendingMoves((current) => {
        const chainedIndex = current.findIndex((move) => move.to === oldPublicPath);
        if (chainedIndex >= 0) return current.map((move, index) => index === chainedIndex ? { ...move, to: nextPublicPath } : move);
        return [...current.filter((move) => move.from !== oldPublicPath), { from: oldPublicPath, to: nextPublicPath }];
      });
    }
    updatePost({ attachments: selected.attachments.map((item) => item.path === attachment.path ? { ...item, name: nextName, path: nextPath } : item) });
    notify("附件已重命名；发布后原文件地址也会被替换");
  };

  const connectGitHub = () => {
    setTokenInput("");
    setLoginOpen(true);
  };

  const authenticateGitHub = async (event) => {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) { notify("请先粘贴 GitHub 精细权限令牌"); return; }
    setAuthenticating(true);
    try {
      const user = await verifyGitHubToken(token, config.allowedLogin);
      sessionStorage.setItem("xiaohey-github-token", token);
      setAuth({ loading: false, authenticated: true, login: user.login });
      setTokenInput("");
      setLoginOpen(false);
      notify("GitHub 连接成功");
    } catch (error) {
      sessionStorage.removeItem("xiaohey-github-token");
      notify(error.message);
    } finally {
      setAuthenticating(false);
    }
  };

  const disconnectGitHub = () => {
    sessionStorage.removeItem("xiaohey-github-token");
    setAuth({ loading: false, authenticated: false, login: "" });
    notify("已断开 GitHub 连接");
  };

  const publish = async () => {
    if (!auth.authenticated) { connectGitHub(); return; }
    const missing = posts.filter((post) => post.status === "published" && (!post.title.trim() || !post.abstract.trim()));
    if (missing.length) { notify("有公开文章缺少标题或摘要，请先补充"); return; }
    setPublishing(true);
    try {
      const files = [
        { path: "content/site.json", content: JSON.stringify(site, null, 2) + "\n" },
        { path: "content/categories.json", content: JSON.stringify(categories, null, 2) + "\n" },
        { path: "content/notes.json", content: JSON.stringify(notes, null, 2) + "\n" },
        ...posts.map((post) => ({ path: `content/posts/${post.sourceFile || `${post.id}.md`}`, content: serializePost(post) })),
        ...pendingFiles,
      ];
      const totalBytes = files.reduce((sum, file) => sum + (file.encoding === "base64" ? Math.ceil(file.content.length * .75) : new Blob([file.content]).size), 0);
      if (totalBytes > 24 * 1024 * 1024) throw new Error("本次发布超过 24 MB，请减少或分批上传附件");
      const currentFiles = new Set(posts.map((post) => post.sourceFile || `${post.id}.md`));
      const deletions = publishedFiles.filter((sourceFile) => !currentFiles.has(sourceFile)).map((sourceFile) => `content/posts/${sourceFile}`);
      const token = sessionStorage.getItem("xiaohey-github-token");
      if (!token) throw new Error("GitHub 连接已失效，请重新连接");
      await verifyGitHubToken(token, config.allowedLogin);
      const [owner, repo] = config.repository.split("/");
      const branch = config.branch || "main";
      const ref = await githubApi(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, token);
      const parent = await githubApi(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`, token);
      const treeElements = [];
      if (pendingMoves.length) {
        const baseTree = await githubApi(`/repos/${owner}/${repo}/git/trees/${parent.tree.sha}?recursive=1`, token);
        for (const move of pendingMoves) {
          const original = baseTree.tree?.find((item) => item.path === move.from && item.type === "blob");
          if (!original?.sha) throw new Error(`找不到待重命名的附件：${move.from.replace(/^public\//, "")}`);
          treeElements.push({ path: move.to, mode: "100644", type: "blob", sha: original.sha });
          treeElements.push({ path: move.from, mode: "100644", type: "blob", sha: null });
        }
      }
      for (const file of files) {
        const blob = await githubApi(`/repos/${owner}/${repo}/git/blobs`, token, {
          method: "POST",
          body: JSON.stringify({ content: file.content, encoding: file.encoding || "utf-8" }),
        });
        treeElements.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }
      deletions.forEach((path) => treeElements.push({ path, mode: "100644", type: "blob", sha: null }));
      const tree = await githubApi(`/repos/${owner}/${repo}/git/trees`, token, {
        method: "POST",
        body: JSON.stringify({ base_tree: parent.tree.sha, tree: treeElements }),
      });
      const commit = await githubApi(`/repos/${owner}/${repo}/git/commits`, token, {
        method: "POST",
        body: JSON.stringify({ message: `更新博客内容：${new Date().toLocaleString("zh-CN")}`, tree: tree.sha, parents: [ref.object.sha] }),
      });
      await githubApi(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, token, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      setPublishedFiles([...currentFiles]);
      localStorage.removeItem("xiaohey-editor-draft"); setDirty(false); setPendingFiles([]); setPendingMoves([]); notify("发布成功，展示站正在自动更新");
    } catch (error) {
      if (/授权已失效|连接已失效/.test(error.message)) disconnectGitHub();
      notify(error.message);
    } finally { setPublishing(false); }
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`}><span>小</span><div><strong>xiaohey</strong><small>EDITOR STUDIO</small></div></a>
        <nav>
          <button className={tab === "posts" ? "active" : ""} onClick={() => setTab("posts")}><Icon name="file" />内容管理</button>
          <button className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}><Icon name="sparkles" />随手记</button>
          <button className={tab === "site" ? "active" : ""} onClick={() => setTab("site")}><Icon name="settings" />页面文字</button>
          <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}><Icon name="grid" />分类管理</button>
          <button className={tab === "media" ? "active" : ""} onClick={() => setTab("media")}><Icon name="upload" />媒体附件</button>
        </nav>
        <div className="admin-account">
          <span className={auth.authenticated ? "online" : ""} />
          <div><strong>{auth.loading ? "正在验证" : auth.authenticated ? auth.login : "尚未连接"}</strong><small>{auth.authenticated ? "本次会话已授权" : "草稿仅保存在本机"}</small></div>
          {!auth.loading && <button onClick={auth.authenticated ? disconnectGitHub : connectGitHub}>{auth.authenticated ? "退出" : "连接"}</button>}
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><span className={`save-dot ${dirty ? "dirty" : ""}`} />{dirty ? "有未发布的修改 · 已自动保存草稿" : "所有更改均已发布"}</div>
          <div className="top-actions">
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`} target="_blank"><Icon name="eye" />查看展示站</a>
            <button className="publish-button" onClick={publish} disabled={publishing}><Icon name="cloud" />{publishing ? "正在发布…" : "发布更新"}</button>
          </div>
        </header>

        {tab === "posts" && <div className="admin-workspace">
          <section className="post-browser">
            <div className="browser-heading"><div><span>CONTENT</span><h1>文章与资料</h1></div><button onClick={addPost}><Icon name="plus" />新建</button></div>
            <input className="post-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、摘要或标签…" />
            <div className="post-list">{filteredPosts.map((post) => <button key={post.id} className={selected?.id === post.id ? "active" : ""} onClick={() => setSelectedId(post.id)}><span className={`post-accent accent-${post.accent}`} /> <div><strong>{post.title}</strong><small>{post.type} · {post.date}</small></div><em className={`status status-${post.status}`}>{post.status === "published" ? "公开" : post.status === "draft" ? "草稿" : "归档"}</em></button>)}</div>
          </section>

          {selected && <section className="post-editor">
            <div className="editor-toolbar"><div><button className={!preview ? "active" : ""} onClick={() => setPreview(false)}>编辑</button><button className={preview ? "active" : ""} onClick={() => setPreview(true)}>预览</button></div><button className="danger" onClick={removePost}><Icon name="trash" />删除</button></div>
            {preview ? <article className="article-preview"><span>{selected.eyebrow}</span><h1>{selected.title}</h1><p className="preview-lead">{selected.abstract}</p><blockquote>{selected.takeaway}</blockquote><MarkdownContent basePath={process.env.NEXT_PUBLIC_BASE_PATH || ""}>{selected.rawMarkdown}</MarkdownContent></article> : <div className="editor-form">
              <SmartDraftPanel report={smartReport} analyzing={analyzing} focus={analysisFocus} onFocusChange={setAnalysisFocus} onAnalyze={analyzeSelectedPost} onApply={applySmartSuggestion} onApplyAll={applyAllSmartSuggestions} onChooseFile={() => fileInput.current?.click()} />
              <div className="form-row wide"><label>文章标题<input value={selected.title} onChange={(event) => updatePost({ title: event.target.value })} /></label></div>
              <section className="article-classification"><div><strong>文章分类</strong><small>“论文精读”等属于文章分类，会显示在知识库筛选栏；可在“分类管理”中改名和调整颜色。</small></div><div className="category-picker">{categories.map((category) => <button type="button" key={category.key} className={selected.typeKey === category.key ? `active accent-${category.accent}` : ""} onClick={() => chooseCategory(category)}>{category.label}{!category.visible && <small>已隐藏</small>}</button>)}</div></section>
              <div className="form-grid"><label>发布状态<select value={selected.status} onChange={(event) => updatePost({ status: event.target.value })}><option value="draft">草稿</option><option value="published">公开发布</option><option value="archived">归档隐藏</option></select></label><label>阅读难度<input value={selected.level || ""} onChange={(event) => updatePost({ level: event.target.value })} placeholder="例如：入门、进阶、随想" /></label><label>发布日期<input value={selected.date} onChange={(event) => updatePost({ date: event.target.value })} /></label><label>阅读时间<input value={selected.readTime} onChange={(event) => updatePost({ readTime: event.target.value })} /></label></div>
              <div className="featured-control"><div><strong>首页本期精选</strong><small>这里决定首页“本期精选”区域展示哪一篇文章，与“论文精读”分类相互独立。</small></div><button type="button" className={site.featuredPostId === selected.id ? "active" : ""} onClick={chooseFeaturedPost} disabled={site.featuredPostId === selected.id}>{site.featuredPostId === selected.id ? "当前精选" : "设为本期精选"}</button></div>
              <label>文章摘要<textarea rows="3" value={selected.abstract} onChange={(event) => updatePost({ abstract: event.target.value })} /></label>
              <label>核心观点<textarea rows="2" value={selected.takeaway} onChange={(event) => updatePost({ takeaway: event.target.value })} /></label>
              <div className="form-grid"><label>标签<input value={(selected.tags || []).join("，")} onChange={(event) => updatePost({ tags: event.target.value.split(/[，,]/).map((item) => item.trim()).filter(Boolean) })} placeholder="学习，论文，方法" /></label><label>眉题<input value={selected.eyebrow} onChange={(event) => updatePost({ eyebrow: event.target.value })} /></label></div>
              <label>推荐引用<div className="citation-editor"><textarea rows="2" value={selected.citation || ""} onChange={(event) => updatePost({ citation: event.target.value })} /><button type="button" onClick={() => updatePost({ citation: defaultCitation(selected.title, selected.date) })}>按标题重新生成</button></div><small className="markdown-help">可以完全自由修改；智能分析和标题修改不会再覆盖你手写的引用。</small></label>
              <label>正文（支持完整 Markdown）<div className="markdown-editor-shell"><MarkdownToolbar onInsert={insertMarkdown} /><textarea ref={bodyEditor} className="body-editor" value={selected.rawMarkdown} onChange={(event) => updatePost({ rawMarkdown: event.target.value, sections: sectionsFromMarkdown(event.target.value) })} /></div><small className="markdown-help">支持 # 标题、*斜体*、**粗体**、列表、引用、链接、代码块、表格和任务清单；点击“预览”查看最终效果。</small></label>
              <div className={`drop-zone ${dragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); importFiles(event.dataTransfer.files); }} onClick={() => fileInput.current?.click()}><Icon name="upload" /><strong>拖入图片、PDF或其他附件</strong><span>图片会成为封面，其他文件会加入文章下载区</span></div>
              {!!selected.attachments?.length && <div className="editor-attachments">{selected.attachments.map((item) => <div key={item.path}><Icon name="file" /><span><strong>{item.name}</strong><input className="attachment-description" value={item.description || ""} onChange={(event) => updatePost({ attachments: selected.attachments.map((attachment) => attachment.path === item.path ? { ...attachment, description: event.target.value } : attachment) })} placeholder="附件说明" /></span><span className="attachment-actions"><button type="button" onClick={() => renameAttachment(item)}>重命名</button><button type="button" onClick={() => updatePost({ attachments: selected.attachments.filter((attachment) => attachment.path !== item.path) })}>移除</button></span></div>)}</div>}
            </div>}
          </section>}
        </div>}

        {tab === "notes" && <section className="settings-page"><div className="settings-heading"><span>MARGINALIA</span><h1>随手记管理</h1><p>这里对应展示站首页的“随手记”卡片，不属于文章分类，也不需要创建完整文章。</p></div><button className="add-note" type="button" onClick={addNote}><Icon name="plus" />新增随手记</button><div className="note-editor-list">{notes.map((note, index) => <article key={`${index}-${note.date}`}><header><strong>随手记 {String(index + 1).padStart(2, "0")}</strong><button type="button" onClick={() => removeNote(index)}><Icon name="trash" />删除</button></header><div className="form-grid"><label>日期<input value={note.date} onChange={(event) => updateNote(index, { date: event.target.value })} /></label><label>标签<input value={note.tag} onChange={(event) => updateNote(index, { tag: event.target.value })} /></label></div><label>内容<textarea rows="3" value={note.text} onChange={(event) => updateNote(index, { text: event.target.value })} /></label></article>)}</div></section>}

        {tab === "site" && <section className="settings-page"><div className="settings-heading"><span>SITE COPY</span><h1>页面文字</h1><p>修改后可在发布前返回展示站核对整体效果。</p></div><div className="settings-card"><h2>首页首屏</h2><label>小标题<input value={site.heroEyebrow} onChange={(event) => { setSite({ ...site, heroEyebrow: event.target.value }); setDirty(true); }} /></label><div className="form-grid"><label>主标题<input value={site.heroTitle} onChange={(event) => { setSite({ ...site, heroTitle: event.target.value }); setDirty(true); }} /></label><label>强调标题<input value={site.heroEmphasis} onChange={(event) => { setSite({ ...site, heroEmphasis: event.target.value }); setDirty(true); }} /></label></div><label>介绍文字<textarea rows="4" value={site.heroDescription} onChange={(event) => { setSite({ ...site, heroDescription: event.target.value }); setDirty(true); }} /></label></div><div className="settings-card"><h2>关于我</h2><label>标题<input value={site.aboutTitle} onChange={(event) => { setSite({ ...site, aboutTitle: event.target.value }); setDirty(true); }} /></label>{site.aboutParagraphs.map((paragraph, index) => <label key={index}>第 {index + 1} 段<textarea rows="3" value={paragraph} onChange={(event) => { const values = [...site.aboutParagraphs]; values[index] = event.target.value; setSite({ ...site, aboutParagraphs: values }); setDirty(true); }} /></label>)}</div><div className="settings-card"><h2>页尾与订阅</h2><label>订阅标题<textarea rows="2" value={site.newsletterTitle} onChange={(event) => { setSite({ ...site, newsletterTitle: event.target.value }); setDirty(true); }} /></label><label>页尾句子<textarea rows="2" value={site.footerQuote} onChange={(event) => { setSite({ ...site, footerQuote: event.target.value }); setDirty(true); }} /></label></div></section>}

        {tab === "categories" && <section className="settings-page"><div className="settings-heading"><span>TAXONOMY</span><h1>分类管理</h1><p>这里修改“论文精读、课程笔记、随笔”等文章分类。改名或换色会自动同步到已使用该分类的文章；“随手记”请使用左侧独立入口。</p></div><div className="category-table">{categories.map((category, index) => <div key={category.key}><span className={`category-swatch accent-${category.accent}`} /><label>显示名称<input value={category.label} onChange={(event) => updateCategory(index, { label: event.target.value })} /></label><label>英文标识<input value={category.key} disabled /></label><label>配色<select value={category.accent} onChange={(event) => updateCategory(index, { accent: event.target.value })}>{ACCENTS.map((accent) => <option key={accent}>{accent}</option>)}</select></label><label className="visibility"><input type="checkbox" checked={category.visible} onChange={(event) => updateCategory(index, { visible: event.target.checked })} />展示</label><button disabled={index === 0} onClick={() => { const values = [...categories]; [values[index - 1], values[index]] = [values[index], values[index - 1]]; setCategories(values); setDirty(true); }}>↑</button></div>)}</div><button className="add-category" onClick={() => { const key = `category-${Date.now()}`; setCategories([...categories, { key, label: "新分类", accent: "green", visible: true }]); setDirty(true); }}><Icon name="plus" />添加分类</button></section>}

        {tab === "media" && <section className="settings-page"><div className="settings-heading"><span>MEDIA LIBRARY</span><h1>媒体与附件</h1><p>待发布文件会随文章一起保存到 GitHub。</p></div><div className={`media-drop ${dragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); importFiles(event.dataTransfer.files); }} onClick={() => fileInput.current?.click()}><Icon name="upload" /><h2>把电脑里的文件拖到这里</h2><p>支持 Word、Markdown、TXT、PDF、图片及普通附件</p><button>选择文件</button></div><div className="pending-grid">{pendingFiles.map((file) => <article key={file.path}><Icon name="file" /><div><strong>{file.name}</strong><small>{humanSize(file.size)}</small></div><span>等待发布</span></article>)}</div></section>}
      </main>
      <input ref={fileInput} type="file" multiple hidden onChange={(event) => importFiles(event.target.files)} accept=".md,.markdown,.txt,.docx,.pdf,image/*,.zip,.xlsx,.pptx" />
      {loginOpen && <div className="github-auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !authenticating) setLoginOpen(false); }}>
        <form className="github-auth-dialog" onSubmit={authenticateGitHub}>
          <span>GITHUB CONNECTION</span>
          <h2>连接内容仓库</h2>
          <p>请粘贴仅授权给 <strong>{config.repository}</strong> 的精细权限令牌。令牌只保存在当前浏览器会话中，不会写入博客、草稿或上传到其他服务器。</p>
          <label>精细权限令牌<input type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="github_pat_…" autoComplete="new-password" spellCheck="false" autoFocus /></label>
          <div className="github-auth-permissions"><strong>只需两项设置</strong><span>Repository access：Only select repositories → xiaohey</span><span>Repository permissions：Contents → Read and write</span></div>
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">前往 GitHub 创建令牌 ↗</a>
          <div className="github-auth-actions"><button type="button" onClick={() => setLoginOpen(false)} disabled={authenticating}>取消</button><button type="submit" disabled={authenticating}>{authenticating ? "正在验证…" : "安全连接"}</button></div>
        </form>
      </div>}
      {toast && <div className="admin-toast"><Icon name="check" />{toast}</div>}
    </div>
  );
}
