// custom_content_types / custom_field_definitions / custom_field_values
// (migration 0051). Backs the tenant-configurable "custom" content
// type (Phase 7/8 of the original spec) -- a custom TYPE (e.g.
// "Payment Provider") is admin-defined, with typed fields, rather
// than a single generic text blob.

export async function getCustomContentType(db, typeSlug) {
  return db.prepare(`SELECT * FROM custom_content_types WHERE slug = ? LIMIT 1`).bind(typeSlug).first();
}

export async function getAllCustomContentTypes(db) {
  const result = await db.prepare(`SELECT * FROM custom_content_types ORDER BY label ASC`).all();
  return result.results || [];
}

export async function getCustomFieldDefinitions(db, typeSlug) {
  const result = await db.prepare(`
    SELECT * FROM custom_field_definitions WHERE custom_type_slug = ? ORDER BY display_order ASC, id ASC
  `).bind(typeSlug).all();
  return result.results || [];
}

export async function getCustomFieldValues(db, contentItemId) {
  const result = await db.prepare(`
    SELECT field_key, value FROM custom_field_values WHERE content_item_id = ?
  `).bind(contentItemId).all();
  const map = {};
  for (const row of result.results || []) map[row.field_key] = row.value;
  return map;
}

/**
 * Create a new custom content type. Rejects a slug that's already a
 * reserved top-level route segment (Phase 1 design's collision
 * guard) or already in use by another custom type -- both checked
 * here, not just left to the UNIQUE constraint, so the caller gets a
 * clear reason rather than a raw SQLite error.
 */
export async function updateCustomContentType(db, slug, fields) {
  const columnMap = { label: "label", pluralLabel: "plural_label", icon: "icon", reviewEnabled: "review_enabled", comparisonEnabled: "comparison_enabled" };
  const booleanFields = new Set(["reviewEnabled", "comparisonEnabled"]);
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${column} = ?`);
      values.push(booleanFields.has(key) ? (fields[key] ? 1 : 0) : fields[key]);
    }
  }
  if (!sets.length) return getCustomContentType(db, slug);
  values.push(slug);
  return db.prepare(`UPDATE custom_content_types SET ${sets.join(", ")} WHERE slug = ? RETURNING *`).bind(...values).first();
}

/** Adds new field definitions (appended after existing ones by display_order); does not remove or reorder existing fields -- keeps this additive and safe against orphaning stored values for a field that gets removed mid-use. */
export async function addCustomFieldDefinitions(db, typeSlug, newFields) {
  const existing = await getCustomFieldDefinitions(db, typeSlug);
  const existingKeys = new Set(existing.map(f => f.field_key));
  let nextOrder = existing.length ? Math.max(...existing.map(f => f.display_order)) + 10 : 0;
  const created = [];
  for (const f of newFields) {
    if (!f.field_key || existingKeys.has(f.field_key)) continue; // skip blanks and dupes silently -- the form always resubmits existing rows too
    const row = await db.prepare(`
      INSERT INTO custom_field_definitions (custom_type_slug, field_key, label, field_type, options_json, required, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
    `).bind(typeSlug, f.field_key, f.label, f.field_type, f.options_json || null, f.required ? 1 : 0, nextOrder).first();
    created.push(row);
    nextOrder += 10;
  }
  return created;
}

export async function createCustomContentType(db, { slug, label, pluralLabel, icon = null, reviewEnabled = true, comparisonEnabled = true }, isReservedSlugFn) {
  if (isReservedSlugFn && isReservedSlugFn(slug)) {
    throw new Error(`"${slug}" is a reserved route segment and cannot be used as a custom content type slug.`);
  }
  const existing = await getCustomContentType(db, slug);
  if (existing) {
    throw new Error(`A custom content type with slug "${slug}" already exists.`);
  }
  return db.prepare(`
    INSERT INTO custom_content_types (slug, label, plural_label, icon, review_enabled, comparison_enabled)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `).bind(slug, label, pluralLabel, icon, reviewEnabled ? 1 : 0, comparisonEnabled ? 1 : 0).first();
}

/**
 * Set (create or update) one field's value for a content item. Typed
 * validation/sanitization happens in the caller (controllers.js
 * write path / a future admin form) using the field_type from
 * custom_field_definitions -- this function only persists the
 * already-validated value. Never store raw HTML here; text/textarea
 * values must be sanitized before reaching this function (Phase 36 of
 * the original spec).
 */
export async function setCustomFieldValue(db, contentItemId, fieldKey, value) {
  return db.prepare(`
    INSERT INTO custom_field_values (content_item_id, field_key, value)
    VALUES (?, ?, ?)
    ON CONFLICT (content_item_id, field_key) DO UPDATE SET value = excluded.value
  `).bind(contentItemId, fieldKey, value).run();
}
