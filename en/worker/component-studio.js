// New component types for the visual editor (Dashboard > Components):
//
//   content_grid  cards picked by search (or filled with the newest items) from casinos, news,
//                 research, authors, updates, sportsbooks, affiliate partners, custom content, pictures
//   data_table    a table the admin types, or a casino comparison filled from picked casinos
//   section       a custom section: background, layout columns and blocks (heading, text, picture,
//                 button, list, video, features, numbers, spacer, divider)
//
// Settings are stored as JSON in components.settings_json, but admins never see it: the editor
// builds it. Every value is checked here when it is saved (cleanStudioSettings) and again when
// the page is built (render*), so a stray value can never break or poison a public page.
// Existing component types are not touched by anything in this file.

import { cleanLink, cleanColor, cleanText, cleanImage, escapeHtml, parseVideoUrl, embedUrl } from "./header-hero.js";
import { resolvePicks, latestItems, isSource, isValidKey, SOURCE_KEYS, RESEARCH_TYPE_LIST } from "./component-sources.js";

export const STUDIO_TYPES = ["content_grid", "data_table", "section"];

export const MAX_GRID_ITEMS = 24;
export const MAX_TABLE_COLS = 8;
export const MAX_TABLE_ROWS = 60;
export const MAX_BLOCKS = 30;

const e = escapeHtml;
const SLUG = /^[a-z0-9][a-z0-9_-]{0,119}$/i;

// ---------------------------------------------------------------------------
// small value cleaners
// ---------------------------------------------------------------------------

function pickEnum(v, values, def) {
  const s = String(v ?? "").trim();
  return values.includes(s) ? s : def;
}
function bool(v, def) {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return def;
}
function int(v, min, max, def) {
  const n = Math.round(Number(v));
  if (v === "" || v === null || v === undefined || !Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function text(v, max) {
  return cleanText(v, max);
}
function arr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}
function obj(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try { const p = JSON.parse(v); return p && typeof p === "object" && !Array.isArray(p) ? p : {}; } catch { return {}; }
  }
  return {};
}
function link(v, max = 300) {
  return cleanLink(v, max);
}
function image(v) {
  return cleanImage(v, 500);
}
function slugOrEmpty(v) {
  const s = String(v ?? "").trim();
  return SLUG.test(s) ? s : "";
}

/** [{source,key,label?}] with only valid sources and keys, no duplicates, at most `max` */
export function cleanPicks(raw, max = MAX_GRID_ITEMS, allowed = SOURCE_KEYS) {
  const out = [];
  const seen = new Set();
  for (const item of arr(raw)) {
    if (out.length >= max) break;
    if (!item || typeof item !== "object") continue;
    const source = String(item.source || "");
    if (!allowed.includes(source) || !isSource(source) || !isValidKey(source, item.key)) continue;
    const key = String(item.key);
    const id = `${source}:${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = { source, key };
    const label = text(item.label, 160);
    if (label) entry.label = label;
    out.push(entry);
  }
  return out;
}

// ---------------------------------------------------------------------------
// content_grid
// ---------------------------------------------------------------------------

export const GRID_DEFAULTS = {
  mode: "picked",
  items: [],
  latest_source: "news",
  latest_type: "",
  latest_sort: "newest",
  limit: 6,
  columns: 3,
  style: "card",
  ratio: "wide",
  show_image: true,
  show_excerpt: true,
  show_rating: true,
  show_bonus: true,
  show_badge: true,
  show_date: false,
  show_button: true,
  button_text: "",
  intro: "",
  align: "left",
  bg: "none",
  more_text: "",
  more_url: ""
};

export function cleanGridSettings(raw) {
  const s = obj(raw);
  const mode = pickEnum(s.mode, ["picked", "latest"], GRID_DEFAULTS.mode);
  const latestSource = pickEnum(s.latest_source, SOURCE_KEYS, GRID_DEFAULTS.latest_source);
  let latestType = String(s.latest_type ?? "").trim();
  if (latestSource === "research") latestType = RESEARCH_TYPE_LIST.includes(latestType) ? latestType : "";
  else if (latestSource === "custom") latestType = slugOrEmpty(latestType);
  else latestType = "";
  return {
    mode,
    items: cleanPicks(s.items, MAX_GRID_ITEMS),
    latest_source: latestSource,
    latest_type: latestType,
    latest_sort: pickEnum(s.latest_sort, ["newest", "rating", "name"], GRID_DEFAULTS.latest_sort),
    limit: int(s.limit, 1, MAX_GRID_ITEMS, GRID_DEFAULTS.limit),
    columns: int(s.columns, 1, 4, GRID_DEFAULTS.columns),
    style: pickEnum(s.style, ["card", "compact", "list", "overlay"], GRID_DEFAULTS.style),
    ratio: pickEnum(s.ratio, ["wide", "standard", "square", "auto"], GRID_DEFAULTS.ratio),
    show_image: bool(s.show_image, GRID_DEFAULTS.show_image),
    show_excerpt: bool(s.show_excerpt, GRID_DEFAULTS.show_excerpt),
    show_rating: bool(s.show_rating, GRID_DEFAULTS.show_rating),
    show_bonus: bool(s.show_bonus, GRID_DEFAULTS.show_bonus),
    show_badge: bool(s.show_badge, GRID_DEFAULTS.show_badge),
    show_date: bool(s.show_date, GRID_DEFAULTS.show_date),
    show_button: bool(s.show_button, GRID_DEFAULTS.show_button),
    button_text: text(s.button_text, 30),
    intro: text(s.intro, 300),
    align: pickEnum(s.align, ["left", "center"], GRID_DEFAULTS.align),
    bg: pickEnum(s.bg, ["none", "soft", "dark"], GRID_DEFAULTS.bg),
    more_text: text(s.more_text, 40),
    more_url: link(s.more_url)
  };
}

function stars(rating) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return `<span class="cg-card__rating" role="img" aria-label="Rated ${n} out of 5"><span aria-hidden="true">${"★".repeat(n)}${"☆".repeat(5 - n)}</span></span>`;
}

function dateLabel(value) {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(value)) ? "" : "Z"));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const BUTTON_DEFAULT = {
  casino: "Read review", news: "Read more", research: "Read more", author: "View profile", update: "Read more",
  sportsbook: "View", affiliate_partner: "View", custom: "View", media: "View"
};

function cardHtml(m, s) {
  const media = s.show_image && m.image
    ? `<a class="cg-card__media" href="${e(m.url)}" tabindex="-1" aria-hidden="true"><img src="${e(m.image)}" alt="" loading="lazy" decoding="async"></a>`
    : "";
  const badge = s.show_badge && m.badge ? `<span class="cg-badge">${e(m.badge)}</span>` : "";
  const rating = s.show_rating && m.rating > 0 ? stars(m.rating) : "";
  const date = s.show_date && m.date && dateLabel(m.date) ? `<time class="cg-card__date">${e(dateLabel(m.date))}</time>` : "";
  const excerpt = s.show_excerpt && m.excerpt ? `<p class="cg-card__excerpt">${e(m.excerpt)}</p>` : "";
  const bonus = s.show_bonus && m.bonus ? `<p class="cg-card__bonus">${e(m.bonus)}</p>` : "";
  let actions = "";
  if (s.show_button && m.source !== "media") {
    const label = s.button_text || BUTTON_DEFAULT[m.source] || "View";
    actions = `<div class="cg-card__actions"><a class="btn btn--primary btn--sm" href="${e(m.url)}">${e(label)}</a>` +
      (m.cta_url ? `<a class="btn cg-btn-alt btn--sm" href="${e(m.cta_url)}" rel="nofollow sponsored noopener" target="_blank">Visit site</a>` : "") + `</div>`;
  }
  const title = m.source === "media"
    ? (m.title ? `<h3 class="cg-card__title">${e(m.title)}</h3>` : "")
    : `<h3 class="cg-card__title"><a href="${e(m.url)}">${e(m.title)}</a></h3>`;
  const mediaOnly = m.source === "media"
    ? `<a class="cg-card__media" href="${e(m.url)}" target="_blank" rel="noopener"><img src="${e(m.image)}" alt="${e(m.title)}" loading="lazy" decoding="async"></a>`
    : media;
  return (
    `<article class="cg-card cg-card--${e(m.source)}">${mediaOnly}` +
    `<div class="cg-card__body">${badge}${title}${rating}${bonus}${excerpt}${date}${actions}</div></article>`
  );
}

/** HTML of a content grid. `db` is the D1 binding; returns "" when there is nothing to show. */
export async function renderContentGrid(db, component) {
  const s = cleanGridSettings(component.settings);
  let items = [];
  if (s.mode === "picked") {
    items = await resolvePicks(db, s.items);
  } else {
    items = await latestItems(db, s.latest_source, { limit: s.limit, sort: s.latest_sort, type: s.latest_type });
  }
  if (!items.length) return "";
  const title = text(component.title, 140);
  const head = title || s.intro
    ? `<div class="cg__head">${title ? `<h2>${e(title)}</h2>` : ""}${s.intro ? `<p class="cg__intro">${e(s.intro)}</p>` : ""}</div>`
    : "";
  const more = s.more_text && s.more_url ? `<p class="cg__more"><a href="${e(s.more_url)}">${e(s.more_text)} <span aria-hidden="true">&rarr;</span></a></p>` : "";
  const cls = `component-grid cg cg--bg-${s.bg} cg--cols-${s.columns} cg--style-${s.style} cg--ratio-${s.ratio} cg--align-${s.align}`;
  const inner = `${head}<div class="cg__grid">${items.map((m) => cardHtml(m, s)).join("")}</div>${more}`;
  return `<section class="${cls}">${wrap(inner, component)}</section>`;
}

/** Full-width slots (top, bottom) get the site container; other slots already sit inside one. */
function wrap(inner, component) {
  const point = component && component.injection_point;
  return point === "top" || point === "bottom" ? `<div class="container">${inner}</div>` : inner;
}

// ---------------------------------------------------------------------------
// data_table
// ---------------------------------------------------------------------------

export const TABLE_CASINO_COLUMNS = ["name", "rating", "bonus", "license", "button"];
const TABLE_COLUMN_LABELS = { name: "Casino", rating: "Rating", bonus: "Bonus", license: "Licence", button: "" };

export const TABLE_DEFAULTS = {
  mode: "manual",
  columns: [{ label: "Name", align: "left" }, { label: "Details", align: "left" }],
  rows: [],
  casino_source: "picked",
  items: [],
  limit: 5,
  casino_cols: ["name", "rating", "bonus", "button"],
  button_text: "Visit",
  style: "striped",
  header: "dark",
  compact: false,
  first_col_bold: true,
  caption: "",
  note: ""
};

function cleanCell(raw) {
  if (raw && typeof raw === "object") {
    const t = text(raw.t, 300);
    const l = link(raw.l);
    const i = image(raw.i);
    const out = { t };
    if (l) out.l = l;
    if (i) out.i = i;
    if (raw.b === true || raw.b === "true") out.b = true;
    return out;
  }
  return { t: text(raw, 300) };
}

export function cleanTableSettings(raw) {
  const s = obj(raw);
  const columns = [];
  for (const c of arr(s.columns)) {
    if (columns.length >= MAX_TABLE_COLS) break;
    if (c === null || c === undefined) continue;
    const label = typeof c === "object" ? text(c.label, 60) : text(c, 60);
    const align = typeof c === "object" ? pickEnum(c.align, ["left", "center", "right"], "left") : "left";
    columns.push({ label, align });
  }
  if (!columns.length) columns.push(...TABLE_DEFAULTS.columns.map((c) => ({ ...c })));
  const rows = [];
  for (const r of arr(s.rows)) {
    if (rows.length >= MAX_TABLE_ROWS) break;
    const cells = Array.isArray(r) ? r : [];
    const row = columns.map((_, i) => cleanCell(cells[i]));
    rows.push(row);
  }
  const wanted = Array.isArray(s.casino_cols) ? s.casino_cols.map(String) : TABLE_DEFAULTS.casino_cols;
  const casinoCols = TABLE_CASINO_COLUMNS.filter((c) => wanted.includes(c));
  return {
    mode: pickEnum(s.mode, ["manual", "casinos"], TABLE_DEFAULTS.mode),
    columns,
    rows,
    casino_source: pickEnum(s.casino_source, ["picked", "latest"], TABLE_DEFAULTS.casino_source),
    items: cleanPicks(s.items, MAX_GRID_ITEMS, ["casino"]),
    limit: int(s.limit, 1, MAX_GRID_ITEMS, TABLE_DEFAULTS.limit),
    casino_cols: casinoCols.length ? casinoCols : TABLE_DEFAULTS.casino_cols.slice(),
    button_text: text(s.button_text, 30) || TABLE_DEFAULTS.button_text,
    style: pickEnum(s.style, ["default", "striped", "bordered"], TABLE_DEFAULTS.style),
    header: pickEnum(s.header, ["dark", "brand", "light"], TABLE_DEFAULTS.header),
    compact: bool(s.compact, TABLE_DEFAULTS.compact),
    first_col_bold: bool(s.first_col_bold, TABLE_DEFAULTS.first_col_bold),
    caption: text(s.caption, 160),
    note: text(s.note, 300)
  };
}

function cellHtml(cell, tag, align, scope) {
  const img = cell.i ? `<img class="dt-cell__img" src="${e(cell.i)}" alt="" loading="lazy" decoding="async"> ` : "";
  let inner = e(cell.t);
  if (cell.b) inner = `<strong>${inner}</strong>`;
  if (cell.l) {
    const external = /^https?:/i.test(cell.l);
    inner = `<a href="${e(cell.l)}"${external ? ' target="_blank" rel="noopener"' : ""}>${inner || e(cell.l)}</a>`;
  }
  return `<${tag}${scope ? ` scope="${scope}"` : ""} class="dt-a-${align}">${img}${inner}</${tag}>`;
}

async function casinoRows(db, s) {
  let items;
  if (s.casino_source === "picked") items = (await resolvePicks(db, s.items)).filter((m) => m.source === "casino");
  else items = await latestItems(db, "casino", { limit: s.limit, sort: "rating" });
  return items;
}

export async function renderDataTable(db, component) {
  const s = cleanTableSettings(component.settings);
  let head;
  let body;
  if (s.mode === "casinos") {
    const items = await casinoRows(db, s);
    if (!items.length) return "";
    const cols = s.casino_cols;
    head = `<tr>${cols.map((c) => `<th scope="col" class="dt-a-${c === "button" ? "right" : "left"}">${e(TABLE_COLUMN_LABELS[c])}</th>`).join("")}</tr>`;
    body = items
      .map((m) => {
        const cells = cols.map((c) => {
          if (c === "name") {
            const logo = m.image ? `<img class="dt-cell__img" src="${e(m.image)}" alt="" loading="lazy" decoding="async"> ` : "";
            return `<th scope="row" class="dt-a-left">${logo}<a href="${e(m.url)}">${e(m.title)}</a></th>`;
          }
          if (c === "rating") return `<td class="dt-a-left">${m.rating > 0 ? stars(m.rating) : "&mdash;"}</td>`;
          if (c === "bonus") return `<td class="dt-a-left">${m.bonus ? e(m.bonus) : "&mdash;"}</td>`;
          if (c === "license") return `<td class="dt-a-left">${m.license ? e(m.license) : "&mdash;"}</td>`;
          return `<td class="dt-a-right"><a class="btn btn--primary btn--sm" href="${e(m.cta_url || m.url)}" rel="nofollow sponsored noopener" target="_blank">${e(s.button_text)}</a></td>`;
        });
        return `<tr>${cells.join("")}</tr>`;
      })
      .join("");
  } else {
    if (!s.rows.length && !s.columns.some((c) => c.label)) return "";
    head = `<tr>${s.columns.map((c) => `<th scope="col" class="dt-a-${c.align}">${e(c.label)}</th>`).join("")}</tr>`;
    body = s.rows
      .map((row) => `<tr>${row.map((cell, i) => cellHtml(cell, i === 0 && s.first_col_bold ? "th" : "td", s.columns[i].align, i === 0 && s.first_col_bold ? "row" : "")).join("")}</tr>`)
      .join("");
  }
  const title = text(component.title, 140);
  const heading = title ? `<h2 class="dt__title">${e(title)}</h2>` : "";
  const caption = s.caption ? `<caption>${e(s.caption)}</caption>` : "";
  const note = s.note ? `<p class="dt__note">${e(s.note)}</p>` : "";
  const cls = `component-table dt dt--${s.style} dt--head-${s.header}${s.compact ? " dt--compact" : ""}`;
  const inner = `${heading}<div class="dt__scroll" tabindex="0" role="region" aria-label="${e(title || s.caption || "Table")}"><table class="dt__table">${caption}<thead>${head}</thead><tbody>${body}</tbody></table></div>${note}`;
  return `<section class="${cls}">${wrap(inner, component)}</section>`;
}

// ---------------------------------------------------------------------------
// section
// ---------------------------------------------------------------------------

export const SECTION_DEFAULTS = {
  bg: "none",
  bg_color: "",
  bg_image: "",
  overlay: 45,
  pad: "md",
  width: "normal",
  align: "left",
  cols: 1,
  gap: "md",
  valign: "top",
  text_color: "",
  anchor: "",
  rounded: false,
  blocks: []
};

const ALLOWED_RICH = new Set(["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h3", "h4", "blockquote", "hr"]);

/**
 * A strict cleaner for the text blocks: only the tags above survive, without attributes
 * (links keep a checked href). Everything else is dropped and the text inside is kept.
 */
export function cleanRichText(value, max = 6000) {
  let src = String(value ?? "").slice(0, max * 2);
  // code-like containers go with their content
  src = src.replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, "");
  src = src.replace(/<!--[\s\S]*?-->/g, "");
  let out = "";
  let last = 0;
  const open = [];
  const re = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>/g;
  const escText = (t) => t.replace(/&(?!(?:[a-zA-Z]{2,8}|#\d{1,6}|#x[0-9a-fA-F]{1,6});)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let m;
  while ((m = re.exec(src))) {
    out += escText(src.slice(last, m.index));
    last = re.lastIndex;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (!ALLOWED_RICH.has(tag)) continue;
    if (closing) {
      const at = open.lastIndexOf(tag);
      if (at !== -1) {
        while (open.length > at) out += `</${open.pop()}>`;
      }
      continue;
    }
    if (tag === "br" || tag === "hr") { out += `<${tag}>`; continue; }
    if (tag === "a") {
      const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3]);
      const url = link(href ? (href[1] ?? href[2] ?? href[3] ?? "").replace(/&amp;/g, "&") : "");
      if (!url) continue;
      const external = /^https?:/i.test(url);
      out += `<a href="${e(url)}"${external ? ' target="_blank" rel="noopener nofollow"' : ""}>`;
      open.push("a");
      continue;
    }
    out += `<${tag}>`;
    open.push(tag);
  }
  out += escText(src.slice(last));
  while (open.length) out += `</${open.pop()}>`;
  out = out.replace(/<(p|li|h3|h4|blockquote|strong|b|em|i|u)>\s*<\/\1>/g, "");
  return out.trim().slice(0, max);
}

function cleanBlock(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = String(raw.type || "");
  const col = int(raw.col, 1, 3, 1);
  switch (type) {
    case "heading": {
      const t = text(raw.text, 160);
      return t ? { type, col, text: t, level: pickEnum(raw.level, ["h2", "h3", "h4"], "h2") } : null;
    }
    case "text": {
      const html = cleanRichText(raw.html);
      return html ? { type, col, html } : null;
    }
    case "image": {
      const src = image(raw.src);
      return src ? { type, col, src, alt: text(raw.alt, 140), link: link(raw.link), size: pickEnum(raw.size, ["small", "medium", "large", "full"], "full"), rounded: bool(raw.rounded, true), caption: text(raw.caption, 120) } : null;
    }
    case "button": {
      const t = text(raw.text, 40);
      const l = link(raw.link);
      return t && l ? { type, col, text: t, link: l, style: pickEnum(raw.style, ["primary", "ghost"], "primary"), new_tab: bool(raw.new_tab, false) } : null;
    }
    case "list": {
      const items = arr(raw.items).map((x) => text(typeof x === "object" && x ? x.t : x, 200)).filter(Boolean).slice(0, 12);
      return items.length ? { type, col, items, style: pickEnum(raw.style, ["check", "bullet", "number"], "check") } : null;
    }
    case "video": {
      const video = parseVideoUrl(raw.url);
      if (!video) return null;
      return { type, col, url: String(raw.url).trim().slice(0, 300), poster: image(raw.poster), text: text(raw.text, 40) || "Watch video" };
    }
    case "features": {
      const items = [];
      for (const it of arr(raw.items)) {
        if (items.length >= 8) break;
        if (!it || typeof it !== "object") continue;
        const t = text(it.title, 80);
        const b = text(it.text, 240);
        if (!t && !b) continue;
        items.push({ icon: text(it.icon, 8), title: t, text: b });
      }
      return items.length ? { type, col, items } : null;
    }
    case "stats": {
      const items = [];
      for (const it of arr(raw.items)) {
        if (items.length >= 6) break;
        if (!it || typeof it !== "object") continue;
        const v = text(it.value, 20);
        const label = text(it.label, 60);
        if (!v) continue;
        items.push({ value: v, label });
      }
      return items.length ? { type, col, items } : null;
    }
    case "spacer":
      return { type, col, size: pickEnum(raw.size, ["sm", "md", "lg"], "md") };
    case "divider":
      return { type, col };
    default:
      return null;
  }
}

export function cleanSectionSettings(raw) {
  const s = obj(raw);
  const blocks = [];
  for (const b of arr(s.blocks)) {
    if (blocks.length >= MAX_BLOCKS) break;
    const c = cleanBlock(b);
    if (c) blocks.push(c);
  }
  const anchor = String(s.anchor ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return {
    bg: pickEnum(s.bg, ["none", "soft", "dark", "brand", "color", "image"], SECTION_DEFAULTS.bg),
    bg_color: cleanColor(s.bg_color),
    bg_image: image(s.bg_image),
    overlay: int(s.overlay, 0, 85, SECTION_DEFAULTS.overlay),
    pad: pickEnum(s.pad, ["sm", "md", "lg", "xl"], SECTION_DEFAULTS.pad),
    width: pickEnum(s.width, ["narrow", "normal", "wide", "full"], SECTION_DEFAULTS.width),
    align: pickEnum(s.align, ["left", "center", "right"], SECTION_DEFAULTS.align),
    cols: int(s.cols, 1, 3, SECTION_DEFAULTS.cols),
    gap: pickEnum(s.gap, ["sm", "md", "lg"], SECTION_DEFAULTS.gap),
    valign: pickEnum(s.valign, ["top", "center"], SECTION_DEFAULTS.valign),
    text_color: cleanColor(s.text_color),
    anchor,
    rounded: bool(s.rounded, SECTION_DEFAULTS.rounded),
    blocks
  };
}

function blockHtml(b) {
  switch (b.type) {
    case "heading":
      return `<${b.level} class="sec-heading">${e(b.text)}</${b.level}>`;
    case "text":
      return `<div class="sec-text">${b.html}</div>`;
    case "image": {
      const img = `<img src="${e(b.src)}" alt="${e(b.alt)}" loading="lazy" decoding="async">`;
      const external = /^https?:/i.test(b.link);
      const media = b.link ? `<a href="${e(b.link)}"${external ? ' target="_blank" rel="noopener"' : ""}>${img}</a>` : img;
      const cap = b.caption ? `<figcaption>${e(b.caption)}</figcaption>` : "";
      return `<figure class="sec-image sec-image--${b.size}${b.rounded ? " sec-image--round" : ""}">${media}${cap}</figure>`;
    }
    case "button":
      return `<p class="sec-button"><a class="btn ${b.style === "ghost" ? "sec-btn-alt" : "btn--primary"} btn--lg" href="${e(b.link)}"${b.new_tab || /^https?:/i.test(b.link) ? ' target="_blank" rel="noopener"' : ""}>${e(b.text)}</a></p>`;
    case "list": {
      const tag = b.style === "number" ? "ol" : "ul";
      return `<${tag} class="sec-list sec-list--${b.style}">${b.items.map((i) => `<li>${e(i)}</li>`).join("")}</${tag}>`;
    }
    case "video": {
      const video = parseVideoUrl(b.url);
      if (!video) return "";
      const url = embedUrl(video, "popup");
      const poster = b.poster ? `<img src="${e(b.poster)}" alt="" loading="lazy" decoding="async">` : "";
      return `<div class="sec-video${poster ? " sec-video--poster" : ""}">${poster}<button type="button" class="hero-watch sec-video__play" data-hh-embed="${e(url)}" data-hh-title="${e(b.text)}" aria-haspopup="dialog"><span aria-hidden="true">&#9654;</span> ${e(b.text)}</button></div>`;
    }
    case "features":
      return `<ul class="sec-features sec-features--n${Math.min(4, b.items.length)}">${b.items
        .map((i) => `<li>${i.icon ? `<span class="sec-features__icon" aria-hidden="true">${e(i.icon)}</span>` : ""}${i.title ? `<h3>${e(i.title)}</h3>` : ""}${i.text ? `<p>${e(i.text)}</p>` : ""}</li>`)
        .join("")}</ul>`;
    case "stats":
      return `<dl class="sec-stats sec-stats--n${Math.min(4, b.items.length)}">${b.items.map((i) => `<div><dt>${e(i.label)}</dt><dd>${e(i.value)}</dd></div>`).join("")}</dl>`;
    case "spacer":
      return `<div class="sec-spacer sec-spacer--${b.size}" aria-hidden="true"></div>`;
    case "divider":
      return `<hr class="sec-divider">`;
    default:
      return "";
  }
}

export function renderSection(component) {
  const s = cleanSectionSettings(component.settings);
  const title = text(component.title, 140);
  if (!s.blocks.length && !title) return "";
  const vars = [];
  if (s.bg === "color" && s.bg_color) vars.push(`--sec-bg:${s.bg_color}`);
  if (s.text_color) vars.push(`--sec-fg:${s.text_color}`);
  if (s.bg === "image" && s.bg_image) vars.push(`--sec-img:url('${s.bg_image.replace(/['"()\\\s]/g, "")}')`);
  vars.push(`--sec-overlay:${(s.overlay / 100).toFixed(2)}`);
  const cls = [
    "component-section", "sec", `sec--bg-${s.bg === "color" && !s.bg_color ? "none" : s.bg === "image" && !s.bg_image ? "none" : s.bg}`,
    `sec--pad-${s.pad}`, `sec--width-${s.width}`, `sec--align-${s.align}`, `sec--cols-${s.cols}`, `sec--gap-${s.gap}`, `sec--valign-${s.valign}`,
    s.text_color ? "sec--custom-fg" : "", s.rounded ? "sec--rounded" : ""
  ].filter(Boolean).join(" ");
  const id = s.anchor ? ` id="${e(s.anchor)}"` : "";
  const columns = [];
  for (let c = 1; c <= s.cols; c++) {
    // a block placed in a column that no longer exists falls into the last column
    const mine = s.blocks.filter((b) => Math.min(b.col, s.cols) === c);
    columns.push(`<div class="sec__col">${mine.map(blockHtml).join("")}</div>`);
  }
  const heading = title ? `<h2 class="sec__title">${e(title)}</h2>` : "";
  const overlay = s.bg === "image" && s.bg_image ? '<div class="sec__overlay" aria-hidden="true"></div>' : "";
  return `<section class="${cls}"${id} style="${e(vars.join(";"))}">${overlay}<div class="sec__inner">${heading}<div class="sec__cols">${columns.join("")}</div></div></section>`;
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

export function isStudioType(type) {
  return STUDIO_TYPES.includes(type);
}

/** The cleaned settings of a new-type component, as the JSON text to store. */
export function cleanStudioSettingsJson(type, text_) {
  let parsed = {};
  if (text_ !== undefined && text_ !== null && String(text_).trim() !== "") {
    try {
      parsed = typeof text_ === "string" ? JSON.parse(text_) : text_;
    } catch {
      throw new Error("Settings must be valid JSON");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Settings must be a JSON object");
  }
  const clean = type === "content_grid" ? cleanGridSettings(parsed) : type === "data_table" ? cleanTableSettings(parsed) : cleanSectionSettings(parsed);
  return JSON.stringify(clean);
}

/** Renders a new-type component (async because grids and casino tables read the database). */
export async function renderStudioComponent(db, component) {
  if (component.type === "content_grid") return renderContentGrid(db, component);
  if (component.type === "data_table") return renderDataTable(db, component);
  if (component.type === "section") return renderSection(component);
  return "";
}

// ---------------------------------------------------------------------------
// the older types: only values that could harm a page are checked
// ---------------------------------------------------------------------------

const LEGACY_LINKED = ["cta", "banner"];
const LEGACY_LIMITED = ["casino_grid", "comparison_table", "news_feed"];

/**
 * cta/banner: the button link must be a safe link. casino_grid/comparison_table/news_feed:
 * the limit must be a number. Every other key and every other type is returned untouched.
 */
export function cleanLegacySettingsJson(type, text_) {
  if (!LEGACY_LINKED.includes(type) && !LEGACY_LIMITED.includes(type)) return text_;
  if (text_ === undefined || text_ === null || String(text_).trim() === "") return text_ ?? null;
  let parsed;
  try {
    parsed = typeof text_ === "string" ? JSON.parse(text_) : text_;
  } catch {
    throw new Error("Settings must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Settings must be a JSON object");
  const out = { ...parsed };
  if (LEGACY_LINKED.includes(type) && Object.prototype.hasOwnProperty.call(out, "link")) out.link = link(out.link);
  if (LEGACY_LIMITED.includes(type) && Object.prototype.hasOwnProperty.call(out, "limit")) out.limit = int(out.limit, 1, 50, 6);
  return JSON.stringify(out);
}
