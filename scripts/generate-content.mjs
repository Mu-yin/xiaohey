import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const contentRoot = path.join(root, "content");

const readJson = async (name) => JSON.parse(await readFile(path.join(contentRoot, name), "utf8"));

function parsePost(source, fileName) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${fileName}: 缺少 JSON 文章头信息`);
  const meta = JSON.parse(match[1]);
  const body = match[2].replace(/\r\n/g, "\n").trim();
  const sections = [];
  let current = { title: "正文", lines: [] };
  for (const line of body.split("\n")) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      if (current.lines.join("\n").trim()) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
      current = { title: heading[1].replace(/[*_`~]/g, "").trim(), lines: [] };
    } else current.lines.push(line);
  }
  if (current.lines.join("\n").trim() || !sections.length) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
  return { ...meta, rawMarkdown: body, sections, sourceFile: fileName };
}

const [siteConfig, categories, notes, postFiles] = await Promise.all([
  readJson("site.json"),
  readJson("categories.json"),
  readJson("notes.json"),
  readdir(path.join(contentRoot, "posts")),
]);

const allEntries = await Promise.all(
  postFiles
    .filter((name) => name.endsWith(".md"))
    .map(async (name) => parsePost(await readFile(path.join(contentRoot, "posts", name), "utf8"), name)),
);

const categoryMap = new Map(categories.map((category) => [category.key, category]));
const entries = allEntries
  .filter((entry) => entry.status !== "archived")
  .map((entry) => ({
    ...entry,
    type: categoryMap.get(entry.typeKey)?.label || entry.typeKey,
    accent: entry.accent || categoryMap.get(entry.typeKey)?.accent || "green",
  }))
  .sort((a, b) => b.date.localeCompare(a.date));

const filters = [
  { key: "all", label: "全部" },
  ...categories.filter((category) => category.visible).map(({ key, label }) => ({ key, label })),
];

const output = `// 此文件由 scripts/generate-content.mjs 自动生成，请编辑 content/ 目录。\n${[
  ["siteConfig", siteConfig],
  ["categories", categories],
  ["notes", notes],
  ["entries", entries],
  ["filters", filters],
].map(([name, value]) => `export const ${name} = ${JSON.stringify(value, null, 2)};`).join("\n\n")}\n`;

await writeFile(path.join(root, "data", "generated-content.js"), output, "utf8");
console.log(`已生成 ${entries.length} 篇文章与 ${categories.length} 个分类。`);
