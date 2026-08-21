import test from "node:test";
import assert from "node:assert/strict";
import { buildSmartDraft } from "../lib/smart-draft.mjs";

const categories = [
  { key: "paper", label: "论文精读", accent: "green", visible: true },
  { key: "course", label: "课程笔记", accent: "navy", visible: true },
  { key: "method", label: "学习方法", accent: "terracotta", visible: true },
  { key: "essay", label: "随笔", accent: "plum", visible: true },
];

test("generates structured article fields from markdown", () => {
  const draft = buildSmartDraft({
    fileName: "causal-note.md",
    categories,
    text: "# 因果推断的三个关键假设\n\n## 为什么需要反事实\n\n因果推断的核心是比较同一个体在不同处理状态下的潜在结果。我们只能观察其中一个结果，因此研究设计非常关键。\n\n## 结论\n\n最重要的是先说明可交换性、正值性与一致性假设，再选择统计模型。",
  });

  assert.equal(draft.title, "因果推断的三个关键假设");
  assert.equal(draft.typeKey, "paper");
  assert.ok(draft.tags.includes("因果推断"));
  assert.match(draft.eyebrow, /CAUSALITY/);
  assert.match(draft.rawMarkdown, /^## 为什么需要反事实/m);
  assert.ok(draft.abstract.length > 20);
  assert.ok(draft.takeaway.includes("最重要") || draft.takeaway.includes("核心"));
});

test("keeps plain text and creates readable sections", () => {
  const draft = buildSmartDraft({
    fileName: "每周复盘.txt",
    categories,
    text: "每周复盘的方法\n\n复盘不是完成率报表，而是根据事实理解时间和精力去了哪里。\n\n先查看日历、笔记和作品，再寻找重复出现的阻力。\n\n因此下一周只选择一个足够具体的结构性调整。",
  });

  assert.equal(draft.title, "每周复盘的方法");
  assert.equal(draft.typeKey, "method");
  assert.match(draft.rawMarkdown, /^## 内容概览/m);
  assert.ok(draft.sourceLength > 30);
});

test("prioritizes abstract, conclusion, and a user supplied focus", () => {
  const draft = buildSmartDraft({
    fileName: "研究记录.md",
    categories,
    focus: "方法局限",
    text: "# 在线学习效果研究\n\n## 摘要\n\n本研究比较两种在线学习方式，并使用连续八周的行为数据评估学习效果。结果显示，主动练习组的保持率更高。\n\n## 方法\n\n研究采用观察性数据，因此无法完全排除自选择偏差，这是解释结果时最重要的方法局限。\n\n## 结论\n\n作者认为主动练习可能改善保持率，但结论不能直接解释为因果效应。未来需要随机实验进一步验证。",
  });

  assert.match(draft.abstract, /本研究比较两种在线学习方式/);
  assert.match(draft.takeaway, /因果效应|随机实验/);
  assert.ok(draft.signals.some((signal) => signal.includes("方法局限")));
  assert.ok(draft.evidence.length > 0);
});
