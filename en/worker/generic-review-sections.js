// Sections ("review blocks") and rich body text for generic reviews
// (sportsbook / affiliate partner / custom).
//
// - toRichHtml: the review body used to be a plain textarea, now it is
//   written in the rich editor. Old plain-text bodies (no tags) are turned
//   into paragraphs so they keep reading the same; HTML bodies go through the
//   shared sanitizer before they reach the page.
// - cleanSections: validates what the editor sends (count, lengths).
// - renderSectionsHtml: the public markup for the sections, in order.
import { sanitizeHtml, escapeHtml } from "./sanitize.js";

export const MAX_SECTIONS = 30;
export const MAX_SECTION_TITLE = 120;
export const MAX_SECTION_CONTENT = 100000;

const HAS_TAG = /<\/?[a-z][\s\S]*?>/i;

export function toRichHtml(text) {
  const s = String(text == null ? "" : text);
  if (!s.trim()) return "";
  if (HAS_TAG.test(s)) return sanitizeHtml(s);
  return s.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n");
}

/** Returns { sections } or { error }. Empty sections (no title and no text) are dropped. */
export function cleanSections(input) {
  if (!Array.isArray(input)) return { error: "sections must be a list" };
  const out = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const title = String(raw.title == null ? "" : raw.title).trim();
    const content = String(raw.content == null ? "" : raw.content);
    const textOnly = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    const hasMedia = /<(img|iframe|video|table)\b/i.test(content);
    if (!title && !textOnly && !hasMedia) continue;
    if (!title) return { error: "Every section needs a title." };
    if (title.length > MAX_SECTION_TITLE) return { error: `Section titles can be at most ${MAX_SECTION_TITLE} characters.` };
    if (content.length > MAX_SECTION_CONTENT) return { error: `"${title}" is too long (limit ${MAX_SECTION_CONTENT} characters).` };
    out.push({ title, content });
  }
  if (out.length > MAX_SECTIONS) return { error: `A review can have at most ${MAX_SECTIONS} sections.` };
  return { sections: out };
}

function sectionId(title, index) {
  const base = String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `section-${index + 1}${base ? "-" + base : ""}`;
}

export function renderSectionsHtml(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return "";
  return blocks.map((b, i) => {
    const body = toRichHtml(b.content);
    if (!body) return ""; // a heading with nothing under it is not shown
    return `<div class="info-block review-section" id="${sectionId(b.title || "", i)}"><h2>${escapeHtml(b.title || "")}</h2><div class="review-section__body">${body}</div></div>`;
  }).join("\n");
}
