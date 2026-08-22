import test from "node:test";
import assert from "node:assert/strict";
import { reconstructPdfDocument } from "../lib/document-extraction.mjs";
import { normalizeNotes } from "../lib/notes.mjs";

const item = (str, x, y, width = str.length * 8, height = 12) => ({ str, width, height, transform: [1, 0, 0, height, x, y] });

test("reconstructs PDF lines, paragraphs, headings, and lists", () => {
  const result = reconstructPdfDocument([{
    pageNumber: 1, width: 600, height: 800,
    items: [
      item("研究方法", 72, 740, 100, 20),
      item("第一段第一行。", 72, 700),
      item("第一段第二行。", 72, 684),
      item("• 关键发现", 92, 642),
    ],
  }]);
  assert.match(result.markdown, /^# 研究方法/m);
  assert.match(result.markdown, /第一段第一行。\n第一段第二行。/);
  assert.match(result.markdown, /- 关键发现/);
  assert.equal(result.report.headingCount, 1);
  assert.equal(result.report.listCount, 1);
});

test("filters repeated PDF headers", () => {
  const pages = [1, 2, 3].map((pageNumber) => ({
    pageNumber, width: 600, height: 800,
    items: [item("课程报告", 70, 770), item(`第${pageNumber}页正文内容足够用于提取。`, 70, 700)],
  }));
  const result = reconstructPdfDocument(pages);
  assert.equal((result.markdown.match(/课程报告/g) || []).length, 0);
  assert.match(result.report.warnings.join(" "), /页眉或页脚/);
});

test("normalizes legacy notes without losing content", () => {
  const [note] = normalizeNotes([{ date: "2026.08.16", text: "保留旧内容", tag: "旧标签" }]);
  assert.equal(note.text, "保留旧内容");
  assert.deepEqual(note.tags, ["旧标签"]);
  assert.equal(note.contentDate, "2026.08.16");
  assert.ok(note.createdAt);
  assert.equal(note.archived, false);
});
