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

const STOP_PHRASES = new Set(["我们", "你们", "他们", "本文", "文章", "这个", "这些", "一种", "可以", "进行", "通过", "以及", "对于", "其中", "因此", "但是", "如果", "因为", "所以", "需要", "相关", "内容", "问题", "方法"]);

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
    .map((sentence, index) => ({ sentence: sentence.trim(), index }))
    .filter((item) => item.sentence.length >= 16 && item.sentence.length <= 180 && !/^(参考文献|references|doi|https?:)/i.test(item.sentence));
}

function extractNamedSection(text, names) {
  const heading = new RegExp(`(?:^|\\n)#{1,6}\\s*(?:${names})[^\\n]*\\n([\\s\\S]*?)(?=\\n#{1,6}\\s+|$)`, "i");
  return text.match(heading)?.[1]?.trim() || "";
}

function sentenceTokens(value) {
  const lower = value.toLowerCase();
  const tokens = lower.match(/[a-z][a-z0-9-]{2,}|[\u4e00-\u9fa5]{2,6}/g) || [];
  const result = [];
  for (const token of tokens) {
    if (/^[a-z]/.test(token)) result.push(token);
    else {
      for (let size = 2; size <= Math.min(4, token.length); size += 1) {
        for (let index = 0; index <= token.length - size; index += 1) {
          const part = token.slice(index, index + size);
          if (!STOP_PHRASES.has(part)) result.push(part);
        }
      }
    }
  }
  return result;
}

function rankSentences(sentences, { title = "", focus = "" } = {}) {
  const frequencies = new Map();
  sentences.flatMap((item) => sentenceTokens(item.sentence)).forEach((token) => frequencies.set(token, (frequencies.get(token) || 0) + 1));
  const titleTokens = new Set(sentenceTokens(title));
  const focusTokens = new Set(sentenceTokens(focus));
  const cues = ["核心", "关键", "因此", "这意味着", "说明", "本质", "最重要", "结论", "发现", "结果表明", "作者认为", "研究表明"];
  return sentences.map((item) => {
    const tokens = [...new Set(sentenceTokens(item.sentence))];
    const centrality = tokens.reduce((sum, token) => sum + Math.log2((frequencies.get(token) || 0) + 1), 0) / Math.max(4, Math.sqrt(item.sentence.length));
    const titleMatch = tokens.reduce((sum, token) => sum + (titleTokens.has(token) ? 1.5 : 0), 0);
    const focusMatch = tokens.reduce((sum, token) => sum + (focusTokens.has(token) ? 3 : 0), 0);
    const cueScore = cues.reduce((sum, cue) => sum + (item.sentence.includes(cue) ? 2.5 : 0), 0);
    return { ...item, score: centrality + titleMatch + focusMatch + cueScore - item.index * .025 };
  }).sort((a, b) => b.score - a.score);
}

function pickTakeaway(sentences, title, focus, conclusionText) {
  const cues = ["核心", "关键", "因此", "这意味着", "说明", "本质", "最重要", "需要", "应该", "结论"];
  const conclusionSentences = conclusionText ? meaningfulSentences(conclusionText, "") : [];
  const pool = conclusionSentences.length ? conclusionSentences : sentences;
  const ranked = rankSentences(pool, { title, focus }).map((item) => ({ ...item, score: item.score + cues.reduce((sum, cue) => sum + (item.sentence.includes(cue) ? 3 : 0), 0) }));
  ranked.sort((a, b) => b.score - a.score);
  return clip(ranked[0]?.sentence || sentences[0]?.sentence || "这篇文章围绕一个值得继续思考的问题展开。", 92);
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

export function buildSmartDraft({ text = "", fileName = "", categories = [], focus = "" }) {
  const cleanText = normalizeText(text);
  const title = pickTitle(cleanText, fileName);
  const sentences = meaningfulSentences(cleanText, title);
  const abstractSection = extractNamedSection(cleanText, "摘要|abstract|内容提要");
  const conclusionSection = extractNamedSection(cleanText, "结论|总结|讨论|启示|conclusion|discussion");
  const abstractCandidates = abstractSection ? meaningfulSentences(abstractSection, "") : [];
  const rankedForAbstract = rankSentences(abstractCandidates.length ? abstractCandidates : sentences, { title, focus });
  const selectedForAbstract = rankedForAbstract.slice(0, 3).sort((a, b) => a.index - b.index);
  const topics = detectTopics(cleanText);
  const category = pickCategory(cleanText, categories);
  const abstract = clip(selectedForAbstract.map((item) => item.sentence).join(""), 180) || `本文整理了《${title}》的主要内容与思考线索。`;
  const takeaway = pickTakeaway(sentences, title, focus, conclusionSection);
  const tags = topics.slice(0, 5).map((topic) => topic.tag);
  if (!tags.length && category?.label) tags.push(category.label);
  const rawMarkdown = structuredMarkdown(cleanText, title);
  const plainLength = stripMarkdown(cleanText).replace(/\s/g, "").length;
  const minutes = Math.max(3, Math.ceil(plainLength / 420));
  const topicEnglish = topics[0]?.english || "NOTES";
  const categoryEnglish = CATEGORY_ENGLISH[category?.key] || "ARTICLE";
  const signals = [title !== fileName.replace(/\.[^.]+$/, "") ? "识别到文内标题" : "使用文件名作为标题", abstractSection ? "优先采用原文摘要" : "按关键句相关性生成摘要", conclusionSection ? "从结论段提炼核心观点" : "从全文提炼核心观点", focus ? `已按“${clip(focus, 18)}”调整重点` : "未指定额外分析重点", topics.length ? `识别到 ${topics.length} 个主题` : "依据分类生成标签", `保留 ${(rawMarkdown.match(/^#{1,6}\s+/gm) || []).length} 个 Markdown 标题`];

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
    evidence: selectedForAbstract.map((item) => item.sentence),
    sourceLength: plainLength,
  };
}
