const TOPICS = [
  { tag: "人工智能", words: ["人工智能", "大模型", "机器学习", "深度学习", "llm", "ai", "rag"], english: "AI" },
  { tag: "因果推断", words: ["因果", "反事实", "dag", "处理效应", "混杂"], english: "CAUSALITY" },
  { tag: "数据分析", words: ["数据", "统计", "回归", "概率", "样本", "变量"], english: "DATA" },
  { tag: "研究方法", words: ["研究", "实验", "假设", "证据", "方法论", "可复现"], english: "RESEARCH" },
  { tag: "论文阅读", words: ["论文", "文献", "摘要", "作者", "期刊", "引用"], english: "PAPER" },
  { tag: "知识管理", words: ["知识管理", "卡片", "笔记", "双链", "知识库"], english: "KNOWLEDGE" },
  { tag: "学习方法", words: ["学习", "复习", "记忆", "练习", "课程", "考试"], english: "LEARNING" },
  { tag: "编程", words: ["python", "javascript", "代码", "编程", "算法", "程序"], english: "CODE" },
  { tag: "阅读", words: ["阅读", "读书", "书中", "章节", "作者认为"], english: "READING" },
  { tag: "写作", words: ["写作", "表达", "文章", "叙事", "写下"], english: "WRITING" },
  { tag: "效率", words: ["效率", "时间管理", "专注", "工作流", "复盘"], english: "PRODUCTIVITY" },
  { tag: "工具", words: ["工具", "软件", "模板", "配置", "教程"], english: "TOOLS" },
];

const CATEGORY_HINTS = {
  paper: ["论文", "文献", "研究", "实验", "摘要", "期刊", "引用"],
  course: ["课程", "课堂", "讲义", "老师", "作业", "章节", "考试"],
  method: ["学习", "方法", "笔记", "复盘", "效率", "记忆", "工作流"],
  reading: ["读书", "阅读", "书中", "作者", "书评", "重读"],
  resource: ["工具", "资料", "模板", "清单", "软件", "教程", "代码", "下载"],
  essay: ["随笔", "思考", "生活", "感受", "观察", "反思"],
};

const CATEGORY_ENGLISH = {
  paper: "PAPER",
  course: "COURSE",
  method: "METHOD",
  reading: "READING",
  resource: "RESOURCE",
  essay: "ESSAY",
};

const normalizeText = (value = "") => value
  .replace(/\r\n?/g, "\n")
  .replace(/[\u00a0\u200b]/g, " ")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const stripMarkdown = (value = "") => value
  .replace(/^#{1,6}\s+/gm, "")
  .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[*_`>#~-]/g, "")
  .trim();

const clip = (value, size) => value.length > size ? `${value.slice(0, size).replace(/[，、；：,.\s]+$/u, "")}……` : value;
const occurrenceCount = (text, word) => text.toLowerCase().split(word.toLowerCase()).length - 1;

function pickTitle(text, fileName) {
  const markdownTitle = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (markdownTitle) return clip(markdownTitle, 52);
  const lines = stripMarkdown(text).split("\n").map((line) => line.trim()).filter(Boolean);
  const firstLine = lines.find((line) => line.length >= 4 && line.length <= 52 && !/[。！？；]$/u.test(line));
  const fileTitle = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return clip(firstLine || fileTitle || "未命名文章", 52);
}

function meaningfulSentences(text, title) {
  const body = stripMarkdown(text)
    .replace(title, "")
    .replace(/\n+/g, " ");
  return (body.match(/[^。！？!?；;]+[。！？!?；;]?/gu) || [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 16 && sentence.length <= 180);
}

function pickTakeaway(sentences) {
  const cues = ["核心", "关键", "因此", "这意味着", "说明", "本质", "最重要", "需要", "应该", "结论"];
  const ranked = sentences.map((sentence, index) => ({
    sentence,
    score: cues.reduce((sum, cue) => sum + (sentence.includes(cue) ? 4 : 0), 0) + Math.min(sentence.length, 80) / 25 - index * .08,
  })).sort((a, b) => b.score - a.score);
  return clip(ranked[0]?.sentence || sentences[0] || "这篇文章围绕一个值得继续思考的问题展开。", 92);
}

function detectTopics(text) {
  return TOPICS.map((topic) => ({
    ...topic,
    score: topic.words.reduce((sum, word) => sum + occurrenceCount(text, word), 0),
  })).filter((topic) => topic.score > 0).sort((a, b) => b.score - a.score);
}

function pickCategory(text, categories) {
  const visible = categories.filter((category) => category.visible);
  const ranked = visible.map((category, index) => ({
    category,
    score: (CATEGORY_HINTS[category.key] || [category.label]).reduce((sum, word) => sum + occurrenceCount(text, word), 0) - index * .01,
  })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0 ? ranked[0].category : visible[0] || categories[0];
}

function looksLikeHeading(line) {
  const clean = line.replace(/^#+\s*/, "").trim();
  return clean.length >= 2 && clean.length <= 30 && !/[。！？!?；;，,]$/u.test(clean) && (/^(第[一二三四五六七八九十\d]+[章节部分]|[一二三四五六七八九十\d]+[、.．]|[（(][一二三四五六七八九十\d]+[）)])/.test(clean) || line.startsWith("#"));
}

function structuredMarkdown(source, title) {
  let text = normalizeText(source).replace(/^#\s+.+$/m, "").trim();
  if (/^#{2,6}\s+/m.test(text)) return text.replace(/^#{3,6}\s+/gm, "## ");

  const lines = text.split("\n").map((line) => line.trim());
  const hasHeadings = lines.some(looksLikeHeading);
  if (hasHeadings) {
    const sections = [];
    let current = { title: "内容概览", lines: [] };
    for (const line of lines) {
      if (looksLikeHeading(line)) {
        if (current.lines.join(" ").trim()) sections.push(current);
        current = { title: line.replace(/^#+\s*/, "").trim(), lines: [] };
      } else if (line) current.lines.push(line);
    }
    if (current.lines.join(" ").trim()) sections.push(current);
    if (sections.length) return sections.map((section) => `## ${section.title}\n\n${section.lines.join("\n\n")}`).join("\n\n");
  }

  const paragraphs = text.split(/\n{2,}/).map((item) => item.replace(/\n/g, " ").trim()).filter(Boolean);
  if (!paragraphs.length) return "## 正文\n\n开始写下你的内容。";
  if (paragraphs.length === 1) return `## 正文\n\n${paragraphs[0]}`;
  const groupSize = Math.max(1, Math.ceil(paragraphs.length / 3));
  const headings = ["内容概览", "核心内容", "总结与思考"];
  const groups = [];
  for (let index = 0; index < paragraphs.length; index += groupSize) groups.push(paragraphs.slice(index, index + groupSize));
  return groups.slice(0, 3).map((group, index) => `## ${headings[index]}\n\n${group.join("\n\n")}`).join("\n\n");
}

export function buildSmartDraft({ text = "", fileName = "", categories = [] }) {
  const cleanText = normalizeText(text);
  const title = pickTitle(cleanText, fileName);
  const sentences = meaningfulSentences(cleanText, title);
  const topics = detectTopics(cleanText);
  const category = pickCategory(cleanText, categories);
  const abstract = clip(sentences.slice(0, 3).join(""), 180) || `本文整理了《${title}》的主要内容与思考线索。`;
  const takeaway = pickTakeaway(sentences);
  const tags = topics.slice(0, 5).map((topic) => topic.tag);
  if (!tags.length && category?.label) tags.push(category.label);
  const rawMarkdown = structuredMarkdown(cleanText, title);
  const plainLength = stripMarkdown(cleanText).replace(/\s/g, "").length;
  const minutes = Math.max(3, Math.ceil(plainLength / 420));
  const topicEnglish = topics[0]?.english || "NOTES";
  const categoryEnglish = CATEGORY_ENGLISH[category?.key] || "ARTICLE";
  const signals = [title !== fileName.replace(/\.[^.]+$/, "") ? "识别到文内标题" : "使用文件名作为标题", topics.length ? `识别到 ${topics.length} 个主题` : "依据分类生成标签", `整理为 ${(rawMarkdown.match(/^##\s+/gm) || []).length} 个章节`];

  return {
    title,
    typeKey: category?.key || "essay",
    type: category?.label || "随笔",
    accent: category?.accent || "green",
    abstract,
    takeaway,
    tags,
    eyebrow: `${categoryEnglish} · ${topicEnglish}`,
    readTime: `${minutes} 分钟`,
    level: plainLength > 6000 ? "深度" : plainLength > 2500 ? "进阶" : "基础",
    rawMarkdown,
    signals,
    sourceLength: plainLength,
  };
}
