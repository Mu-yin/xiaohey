const pad = (value) => String(value).padStart(2, "0");

export function localDateString(date = new Date()) {
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function normalizeNotes(notes = []) {
  return notes.map((note, index) => {
    const contentDate = note.contentDate || note.date || localDateString();
    const legacyTime = `${contentDate.replaceAll(".", "-")}T09:00:00+08:00`;
    const tags = Array.isArray(note.tags) ? note.tags : [note.tag].filter(Boolean);
    const text = note.text || "";
    return {
      id: note.id || `note-${contentDate.replaceAll(".", "")}-${String(index + 1).padStart(2, "0")}`,
      title: note.title || text.replace(/[“”"']/g, "").slice(0, 22) || "未命名随手记",
      text,
      contentDate,
      createdAt: note.createdAt || legacyTime,
      updatedAt: note.updatedAt || note.createdAt || legacyTime,
      tags,
      pinned: Boolean(note.pinned),
      archived: Boolean(note.archived),
      sourceUrl: note.sourceUrl || "",
    };
  });
}

export function noteTimestamp(note = {}) {
  return new Date(note.contentDate?.replaceAll(".", "-") || note.createdAt || 0).getTime() || 0;
}

export function formatNoteTime(value, includeTime = true) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(date);
}
