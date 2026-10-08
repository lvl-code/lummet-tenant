// Look and custom values of one comparison page.
//
// Stored as one JSON document in the existing `settings` table under
// `comparison_design:{type}:{slug}`, so no database change is needed and a comparison
// without a design renders exactly as before.
//
// {
//   page:  { head_bg, head_text, label_bg, label_text, cell_bg, cell_text, stripe_bg, border, accent,
//            font, size, radius }                      whole table
//   items: { "casino:12": { head_bg, head_text, col_bg, col_text, accent, font } }   one column
//   rows:  { "license":   { label_bg, label_text, cell_bg, cell_text } }              one row
//   cells: { "license":   { "casino:12": "My own text" } }                            custom values
// }
// Precedence for a cell: the item's column colours, then the row's, then the whole table's.
// A custom value replaces the real value of that cell only; an empty one means "use the real value".

export const FONTS = {
  site: "",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SFMono-Regular', Menlo, Consolas, monospace",
  rounded: "'Trebuchet MS', 'Segoe UI', sans-serif",
  classic: "Verdana, Geneva, sans-serif",
  elegant: "'Palatino Linotype', Palatino, serif"
};
export const SIZES = { sm: "13px", md: "", lg: "17px" };
export const RADII = { sq: "0px", md: "", lg: "22px" };

const PAGE_COLORS = ["head_bg", "head_text", "label_bg", "label_text", "cell_bg", "cell_text", "stripe_bg", "border", "accent"];
const ITEM_COLORS = ["head_bg", "head_text", "col_bg", "col_text", "accent"];
const ROW_COLORS = ["label_bg", "label_text", "cell_bg", "cell_text"];
const ITEM_KEY = /^(casino|sportsbook|affiliate_partner|custom):\d{1,12}$/;
const ROW_KEY = /^[a-z0-9_]{1,60}$/i;
const MAX_ITEMS = 24;
const MAX_ROWS = 80;
const MAX_VALUE = 200;

function color(v) {
  const s = String(v ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : "";
}
function pick(map, v) {
  const s = String(v ?? "");
  return Object.prototype.hasOwnProperty.call(map, s) ? s : "";
}
function pickColors(src, names) {
  const out = {};
  for (const n of names) { const c = color(src && src[n]); if (c) out[n] = c; }
  return out;
}
function text(v) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_VALUE);
}
function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

/** Only known fields survive, colours must be #rrggbb, fonts come from a fixed list, text is plain. */
export function cleanDesign(input) {
  let src = input;
  if (typeof src === "string") { try { src = JSON.parse(src); } catch { src = {}; } }
  src = obj(src);

  const page = pickColors(obj(src.page), PAGE_COLORS);
  const font = pick(FONTS, obj(src.page).font); if (font && font !== "site") page.font = font;
  const size = pick(SIZES, obj(src.page).size); if (size && size !== "md") page.size = size;
  const radius = pick(RADII, obj(src.page).radius); if (radius && radius !== "md") page.radius = radius;

  const items = {};
  for (const [k, v] of Object.entries(obj(src.items)).slice(0, MAX_ITEMS)) {
    if (!ITEM_KEY.test(k)) continue;
    const one = pickColors(obj(v), ITEM_COLORS);
    const f = pick(FONTS, obj(v).font); if (f && f !== "site") one.font = f;
    if (Object.keys(one).length) items[k] = one;
  }

  const rows = {};
  for (const [k, v] of Object.entries(obj(src.rows)).slice(0, MAX_ROWS)) {
    if (!ROW_KEY.test(k)) continue;
    const one = pickColors(obj(v), ROW_COLORS);
    if (Object.keys(one).length) rows[k] = one;
  }

  const cells = {};
  for (const [k, v] of Object.entries(obj(src.cells)).slice(0, MAX_ROWS)) {
    if (!ROW_KEY.test(k)) continue;
    const perItem = {};
    for (const [ik, val] of Object.entries(obj(v)).slice(0, MAX_ITEMS)) {
      const t = text(val);
      if (ITEM_KEY.test(ik) && t) perItem[ik] = t;
    }
    if (Object.keys(perItem).length) cells[k] = perItem;
  }

  return { page, items, rows, cells };
}

export function isEmptyDesign(d) {
  return !d || (!Object.keys(d.page || {}).length && !Object.keys(d.items || {}).length && !Object.keys(d.rows || {}).length && !Object.keys(d.cells || {}).length);
}

const keyFor = (type, slug) => `comparison_design:${type}:${slug}`;

export async function getComparisonDesign(db, type, slug) {
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(keyFor(type, slug)).first();
    return cleanDesign(row && row.value);
  } catch (err) {
    console.error("comparison design unavailable:", err && err.message);
    return cleanDesign({});
  }
}

export async function saveComparisonDesign(db, type, slug, design) {
  const clean = cleanDesign(design);
  if (isEmptyDesign(clean)) {
    await db.prepare("DELETE FROM settings WHERE key = ?").bind(keyFor(type, slug)).run();
  } else {
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").bind(keyFor(type, slug), JSON.stringify(clean)).run();
  }
  return clean;
}

export async function deleteComparisonDesign(db, type, slug) {
  await db.prepare("DELETE FROM settings WHERE key = ?").bind(keyFor(type, slug)).run();
}

// ---------------------------------------------------------------------------
// Rendering helpers (every value here has already passed cleanDesign)
// ---------------------------------------------------------------------------

/** CSS variables for the whole table, as an inline style value */
export function pageStyle(design) {
  const p = (design && design.page) || {};
  const v = [];
  const map = { head_bg: "head-bg", head_text: "head-text", label_bg: "label-bg", label_text: "label-text", cell_bg: "cell-bg", cell_text: "cell-text", stripe_bg: "stripe-bg", border: "border", accent: "accent" };
  for (const [k, css] of Object.entries(map)) if (p[k]) v.push(`--cmp-${css}:${p[k]}`);
  if (p.font && FONTS[p.font]) v.push(`--cmp-font:${FONTS[p.font].replace(/"/g, "'")}`);
  if (p.size && SIZES[p.size]) v.push(`--cmp-size:${SIZES[p.size]}`);
  if (p.radius && RADII[p.radius]) v.push(`--cmp-radius:${RADII[p.radius]}`);
  return v.join(";");
}

/** inline style for one cell: a row's colours, then the item column's on top */
export function cellStyle(rowStyle, itemStyle) {
  const r = rowStyle || {}; const i = itemStyle || {};
  const bg = i.col_bg || r.cell_bg; const fg = i.col_text || r.cell_text;
  const v = [];
  if (bg) v.push(`background:${bg}`);
  if (fg) v.push(`color:${fg}`);
  if (i.font && FONTS[i.font]) v.push(`font-family:${FONTS[i.font].replace(/"/g, "'")}`);
  return v.join(";");
}

export function headStyle(itemStyle) {
  const i = itemStyle || {};
  const v = [];
  if (i.head_bg) v.push(`background:${i.head_bg}`);
  if (i.head_text) v.push(`color:${i.head_text}`);
  if (i.accent) v.push(`box-shadow:inset 0 3px 0 ${i.accent}`);
  if (i.font && FONTS[i.font]) v.push(`font-family:${FONTS[i.font].replace(/"/g, "'")}`);
  return v.join(";");
}

export function labelStyle(rowStyle) {
  const r = rowStyle || {};
  const v = [];
  if (r.label_bg) v.push(`background:${r.label_bg}`);
  if (r.label_text) v.push(`color:${r.label_text}`);
  return v.join(";");
}
