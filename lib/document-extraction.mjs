const clean = (value = "") => String(value).replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
const median = (values = []) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function joinPdfTokens(tokens) {
  const ordered = [...tokens].sort((a, b) => a.x - b.x);
  let result = "";
  let previous;
  for (const token of ordered) {
    const value = clean(token.text);
    if (!value) continue;
    if (previous) {
      const gap = token.x - (previous.x + previous.width);
      const asciiBoundary = /[A-Za-z0-9)]$/.test(result) && /^[A-Za-z0-9([]/.test(value);
      const visiblySeparated = gap > Math.max(3, Math.min(previous.size, token.size) * 0.72);
      if ((asciiBoundary || visiblySeparated) && !/\s$/.test(result)) result += " ";
    }
    result += value;
    previous = token;
  }
  return result.replace(/\s+([，。！？；：、,.!?;:)\]])/g, "$1").trim();
}

function pdfLines(items = []) {
  const tokens = items.map((item) => ({
    text: item.str || "",
    x: Number(item.transform?.[4] || 0),
    y: Number(item.transform?.[5] || 0),
    width: Number(item.width || 0),
    size: Math.abs(Number(item.height || item.transform?.[3] || 10)),
  })).filter((item) => clean(item.text));
  const tolerance = Math.max(2, median(tokens.map((item) => item.size)) * 0.38);
  const rows = [];
  for (const token of [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate.y - token.y) <= tolerance);
    if (row) {
      row.tokens.push(token);
      row.y = (row.y * (row.tokens.length - 1) + token.y) / row.tokens.length;
    } else rows.push({ y: token.y, tokens: [token] });
  }
  return rows.sort((a, b) => b.y - a.y).map((row) => ({
    text: joinPdfTokens(row.tokens),
    y: row.y,
    x: Math.min(...row.tokens.map((item) => item.x)),
    size: Math.max(...row.tokens.map((item) => item.size)),
  })).filter((line) => line.text);
}

const repeatedKey = (value = "") => value.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, "").slice(0, 80);

export function reconstructPdfDocument(pages = []) {
  const pageLines = pages.map((page) => ({ ...page, lines: pdfLines(page.items) }));
  const edgeCounts = new Map();
  for (const page of pageLines) {
    [...page.lines.slice(0, 2), ...page.lines.slice(-2)].forEach((line) => {
      const key = repeatedKey(line.text);
      if (key.length > 2) edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    });
  }
  const repeatedEdges = new Set([...edgeCounts].filter(([, count]) => pages.length > 2 && count >= Math.ceil(pages.length * .6)).map(([key]) => key));
  const warnings = [];
  let headingCount = 0;
  let listCount = 0;
  let lineCount = 0;

  const markdownPages = pageLines.map((page, pageIndex) => {
    const lines = page.lines.filter((line, index, all) => {
      const isEdge = index < 2 || index >= all.length - 2;
      return !(isEdge && repeatedEdges.has(repeatedKey(line.text))) && !/^\s*[-—]?\s*\d+\s*[-—]?\s*$/.test(line.text);
    });
    lineCount += lines.length;
    const baseSize = median(lines.map((line) => line.size)) || 10;
    const gaps = lines.slice(1).map((line, index) => lines[index].y - line.y).filter((gap) => gap > 0);
    const normalGap = median(gaps) || baseSize * 1.25;
    const output = [];
    let previous;
    for (const line of lines) {
      let value = line.text;
      const headingRatio = line.size / baseSize;
      const isHeading = headingRatio > 1.22 && value.length < 100;
      const isList = /^[•·●▪◦■□◆◇]\s*/.test(value) || /^\(?\d+[.)、]\s*/.test(value);
      const gap = previous ? previous.y - line.y : 0;
      const paragraphBreak = previous && (gap > normalGap * 1.55 || (line.x - previous.x > baseSize * 1.6 && /[。！？.!?]$/.test(previous.text)));
      if (paragraphBreak && output.at(-1) !== "") output.push("");
      if (isHeading) {
        if (output.length && output.at(-1) !== "") output.push("");
        const depth = headingRatio > 1.65 ? 1 : headingRatio > 1.38 ? 2 : 3;
        output.push(`${"#".repeat(depth)} ${value}`, "");
        headingCount += 1;
      } else if (isList) {
        value = value.replace(/^[•·●▪◦■□◆◇]\s*/, "- ");
        output.push(value);
        listCount += 1;
      } else output.push(value);
      previous = line;
    }
    const body = output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return pageIndex ? `<!-- 第 ${page.pageNumber || pageIndex + 1} 页 -->\n\n${body}` : body;
  });

  const markdown = markdownPages.filter(Boolean).join("\n\n").trim();
  const charCount = markdown.replace(/\s|[#_*`<>!-]/g, "").length;
  if (charCount < Math.max(40, pages.length * 25)) warnings.push("文字层内容很少，文件可能是扫描件；建议对照原 PDF 检查，当前版本暂不执行 OCR。 ");
  if (repeatedEdges.size) warnings.push(`已过滤 ${repeatedEdges.size} 组重复页眉或页脚。`);
  if (pages.some((page) => page.items?.some((item) => Number(item.width || 0) > Number(page.width || 0) * .65))) warnings.push("检测到宽文本区域；复杂分栏、公式或表格仍需人工核对。 ");
  return {
    markdown,
    report: {
      format: "PDF",
      pageCount: pages.length,
      charCount,
      lineCount,
      headingCount,
      listCount,
      tableCount: 0,
      warnings,
      quality: charCount < Math.max(40, pages.length * 25) ? "需要检查" : warnings.length > 1 ? "基本可用" : "良好",
    },
  };
}

const escapeMarkdown = (value = "") => value.replace(/([\\`*_{}[\]<>])/g, "\\$1");

export function wordHtmlToMarkdown(html = "", messages = []) {
  if (typeof DOMParser === "undefined") throw new Error("当前浏览器不支持 Word 结构转换");
  const document = new DOMParser().parseFromString(html, "text/html");
  const imageCount = document.querySelectorAll("img").length;
  document.querySelectorAll("img").forEach((image) => image.replaceWith(document.createTextNode(`[图片：${image.getAttribute("alt") || "请查看原 Word 文件"}]`)));

  const render = (node, context = {}) => {
    if (node.nodeType === 3) return escapeMarkdown(node.nodeValue || "");
    if (node.nodeType !== 1) return "";
    const tag = node.tagName.toLowerCase();
    const children = [...node.childNodes].map((child) => render(child, { ...context, tag })).join("");
    if (/^h[1-6]$/.test(tag)) return `\n\n${"#".repeat(Number(tag[1]))} ${children.trim()}\n\n`;
    if (tag === "p") return `\n\n${children.trim()}\n\n`;
    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${children.trim()}**`;
    if (tag === "em" || tag === "i") return `*${children.trim()}*`;
    if (tag === "blockquote") return `\n\n${children.trim().split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
    if (tag === "a") return `[${children.trim() || node.getAttribute("href")}](${node.getAttribute("href") || ""})`;
    if (tag === "code" && context.tag !== "pre") return `\`${children.trim()}\``;
    if (tag === "pre") return `\n\n\`\`\`\n${node.textContent || ""}\n\`\`\`\n\n`;
    if (tag === "li") return `${context.ordered ? `${context.index}.` : "-"} ${children.trim()}\n`;
    if (tag === "ul" || tag === "ol") return `\n${[...node.children].map((child, index) => render(child, { ordered: tag === "ol", index: index + 1, tag })).join("")}\n`;
    if (tag === "table") {
      const rows = [...node.querySelectorAll("tr")].map((row) => [...row.querySelectorAll(":scope > th, :scope > td")].map((cell) => clean(cell.textContent).replace(/\|/g, "\\|")));
      if (!rows.length) return "";
      const width = Math.max(...rows.map((row) => row.length));
      const normalized = rows.map((row) => [...row, ...Array(Math.max(0, width - row.length)).fill("")]);
      return `\n\n| ${normalized[0].join(" | ")} |\n| ${Array(width).fill("---").join(" | ")} |\n${normalized.slice(1).map((row) => `| ${row.join(" | ")} |`).join("\n")}\n\n`;
    }
    return children;
  };

  const markdown = [...document.body.childNodes].map((node) => render(node)).join("").replace(/\n{3,}/g, "\n\n").trim();
  const warnings = messages.map((message) => clean(message.message || message)).filter(Boolean);
  if (imageCount) warnings.push(`检测到 ${imageCount} 张图片，正文中已放置提示，原图请查看附件中的 Word 文件。`);
  const charCount = markdown.replace(/\s|[#_*`<>|!-]/g, "").length;
  return {
    markdown,
    report: {
      format: "Word",
      pageCount: null,
      charCount,
      lineCount: markdown.split("\n").length,
      headingCount: (markdown.match(/^#{1,6}\s+/gm) || []).length,
      listCount: (markdown.match(/^\s*(?:-|\d+\.)\s+/gm) || []).length,
      tableCount: document.querySelectorAll("table").length,
      warnings,
      quality: warnings.length > 2 ? "需要检查" : "良好",
    },
  };
}
