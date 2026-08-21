"use client";

function escapeHtml(value = "") {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function saveBlob(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function articleMarkdown(entry, basePath) {
  const attachments = entry.attachments?.length
    ? ["## 附件", "", ...entry.attachments.map((item) => `- [${item.name}](${basePath}/${item.path.replace(/^\/?/, "")})${item.description ? ` — ${item.description}` : ""}`), ""]
    : [];
  return [
    `# ${entry.title}`,
    "",
    `${entry.type} · ${entry.date} · ${entry.readTime} · ${entry.level}`,
    "",
    entry.abstract,
    "",
    `> ${entry.takeaway}`,
    "",
    entry.rawMarkdown?.trim() || entry.sections.flatMap((section) => [`## ${section.title}`, "", section.body, ""]).join("\n"),
    ...attachments,
    "---",
    "",
    `推荐引用：${entry.citation}`,
    "",
  ].join("\n");
}

function articleWord(entry, basePath) {
  const renderedMarkdown = document.querySelector(".article-markdown")?.innerHTML;
  const sections = renderedMarkdown || entry.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2>${escapeHtml(section.body).split(/\n{2,}/).map((paragraph) => `<p>${paragraph.replaceAll("\n", "<br>")}</p>`).join("")}</section>`).join("");
  const attachments = entry.attachments?.length
    ? `<section><h2>相关资料与附件</h2><ul>${entry.attachments.map((item) => `<li><a href="${escapeHtml(`${location.origin}${basePath}/${item.path.replace(/^\/?/, "")}`)}">${escapeHtml(item.name)}</a>${item.description ? ` — ${escapeHtml(item.description)}` : ""}</li>`).join("")}</ul></section>`
    : "";
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeHtml(entry.title)}</title><style>@page{margin:2.2cm}body{font-family:"Microsoft YaHei","SimSun",serif;color:#17201d;line-height:1.9;max-width:760px;margin:auto}h1{font-size:28pt;line-height:1.35;margin:0 0 14pt}h2{font-size:17pt;margin:28pt 0 8pt}p{font-size:11.5pt;margin:0 0 12pt}.meta{color:#6d756f;font-size:9.5pt;border-bottom:1px solid #ccc;padding-bottom:12pt}.lead{font-size:13pt}.quote{background:#f0ece2;border-left:4px solid #c34b38;padding:12pt 16pt;margin:22pt 0}.citation{border-top:1px solid #ccc;margin-top:30pt;padding-top:12pt;color:#59615c;font-size:9.5pt}</style></head><body><h1>${escapeHtml(entry.title)}</h1><p class="meta">${escapeHtml(`${entry.type} · ${entry.date} · ${entry.readTime} · ${entry.level}`)}</p><p class="lead">${escapeHtml(entry.abstract)}</p><div class="quote">${escapeHtml(entry.takeaway)}</div>${sections}${attachments}<p class="citation">推荐引用：${escapeHtml(entry.citation)}</p></body></html>`;
}

export default function ArticleDownloads({ entry, basePath = "" }) {
  const downloadMarkdown = () => saveBlob(`\ufeff${articleMarkdown(entry, basePath)}`, "text/markdown;charset=utf-8", `${entry.id}.md`);
  const downloadWord = () => saveBlob(`\ufeff${articleWord(entry, basePath)}`, "application/msword;charset=utf-8", `${entry.id}.doc`);

  return (
    <div className="article-export-actions" aria-label="文章导出">
      <button onClick={downloadWord}><span>W</span><strong>下载 Word</strong><small>.doc · 可继续编辑</small></button>
      <button onClick={() => window.print()}><span>P</span><strong>保存为 PDF</strong><small>使用浏览器打印</small></button>
      <button onClick={downloadMarkdown}><span>M</span><strong>下载 Markdown</strong><small>.md · 保留结构</small></button>
    </div>
  );
}
