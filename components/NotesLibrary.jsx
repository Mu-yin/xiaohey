"use client";

import { useMemo, useState } from "react";
import { notes as initialNotes, siteConfig } from "@/data/content";
import { formatNoteTime, normalizeNotes, noteTimestamp } from "@/lib/notes.mjs";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function NotesLibrary() {
  const notes = useMemo(() => normalizeNotes(initialNotes), []);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [month, setMonth] = useState("all");
  const [sort, setSort] = useState("newest");
  const tags = useMemo(() => [...new Set(notes.flatMap((note) => note.tags))].sort((a, b) => a.localeCompare(b, "zh-CN")), [notes]);
  const months = useMemo(() => [...new Set(notes.map((note) => note.contentDate.slice(0, 7)))].sort().reverse(), [notes]);
  const visible = useMemo(() => notes.filter((note) => {
    const haystack = [note.title, note.text, ...note.tags].join(" ").toLowerCase();
    return !note.archived && haystack.includes(query.toLowerCase()) && (tag === "all" || note.tags.includes(tag)) && (month === "all" || note.contentDate.startsWith(month));
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === "oldest" ? noteTimestamp(a) - noteTimestamp(b) : noteTimestamp(b) - noteTimestamp(a))), [notes, query, tag, month, sort]);
  const grouped = useMemo(() => visible.reduce((result, note) => {
    const key = note.contentDate.slice(0, 7) || "未注明月份";
    (result[key] ||= []).push(note);
    return result;
  }, {}), [visible]);

  const copyLink = async (id) => {
    const url = `${window.location.origin}${basePath}/notes/#${id}`;
    await navigator.clipboard?.writeText(url);
  };

  return <main className="notes-library-page">
    <header className="notes-library-header"><a href={`${basePath}/`} className="notes-library-brand"><span>小</span><strong>{siteConfig.brand || "xiaohey"}</strong></a><a href={`${basePath}/`}>返回博客首页</a></header>
    <section className="notes-library-hero"><span>MARGINALIA · 随手记</span><h1>捕捉闪念，<br />让线索随时可寻。</h1><p>这里收纳所有未归档的随手记。你可以检索正文、标题与标签，也可以按月份回看思考留下的轨迹。</p><div><strong>{notes.filter((note) => !note.archived).length}</strong><span>条公开记录</span><strong>{tags.length}</strong><span>个标签</span></div></section>
    <section className="notes-library-tools" aria-label="随手记筛选"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索随手记、标题或标签…" /><select value={tag} onChange={(event) => setTag(event.target.value)}><option value="all">全部标签</option>{tags.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">全部月份</option>{months.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">最新在前</option><option value="oldest">最早在前</option></select></section>
    <section className="notes-library-results"><div className="notes-results-heading"><span>检索结果</span><strong>{visible.length} 条</strong></div>{Object.entries(grouped).map(([groupMonth, groupNotes]) => <section className="notes-month" key={groupMonth}><header><time>{groupMonth.replace(".", " / ")}</time><i /></header><div>{groupNotes.map((note) => <article id={note.id} key={note.id} className={note.pinned ? "is-pinned" : ""}><div className="note-card-meta"><span>{note.pinned ? "置顶 · PINNED" : "FIELD NOTE"}</span><time>{note.contentDate}</time></div><h2>{note.title}</h2><p>{note.text}</p><footer><div>{note.tags.map((item) => <button type="button" key={item} onClick={() => setTag(item)}>#{item}</button>)}</div><div><span>创建 {formatNoteTime(note.createdAt)}</span>{note.updatedAt !== note.createdAt && <span>修改 {formatNoteTime(note.updatedAt)}</span>}{note.sourceUrl && <a href={note.sourceUrl} target="_blank" rel="noreferrer">来源 ↗</a>}<button type="button" onClick={() => copyLink(note.id)}>复制链接</button></div></footer></article>)}</div></section>)}{!visible.length && <div className="notes-empty"><strong>没有找到相符的随手记</strong><p>试试减少关键词，或切换标签和月份。</p></div>}</section>
  </main>;
}
