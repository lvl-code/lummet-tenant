// content_items -- sportsbook / affiliate_partner / custom storage
// (migration 0051). Casino data stays in database/casinos.js and
// the `casinos` table; this module never touches `casinos`.
//
// Query shapes deliberately mirror database/casinos.js so the two
// can sit behind the same generic resolver (content-resolver.js)
// without surprises.

export async function getContentItem(db, contentType, slug) {
  return db.prepare(`
    SELECT ci.*, m.url AS logo, h.url AS hero_image
    FROM content_items ci
    LEFT JOIN media_library m ON m.id = ci.logo_media_id
    LEFT JOIN media_library h ON h.id = ci.featured_image_media_id
    WHERE ci.content_type = ? AND ci.slug = ?
    LIMIT 1
  `).bind(contentType, slug).first();
}

export async function getContentItemById(db, contentType, id) {
  return db.prepare(`
    SELECT * FROM content_items WHERE content_type = ? AND id = ? LIMIT 1
  `).bind(contentType, id).first();
}

/**
 * Published items of a type, for listing pages. Mirrors
 * casinos.getAllCasinos()'s ordering convention
 * (featured DESC, sort_order ASC, name ASC).
 */
export async function getPublishedContentItems(db, contentType, { limit = 100, offset = 0 } = {}) {
  const result = await db.prepare(`
    SELECT ci.*, m.url AS logo
    FROM content_items ci
    LEFT JOIN media_library m ON m.id = ci.logo_media_id
    WHERE ci.content_type = ? AND ci.published = 1 AND ci.status = 'published'
    ORDER BY ci.featured DESC, ci.sort_order ASC, ci.name ASC
    LIMIT ? OFFSET ?
  `).bind(contentType, limit, offset).all();
  return result.results || [];
}

/** All items of a type, published or not -- for admin listings (Phase 3 exposes the query; the admin UI itself is later work). */
export async function getAllContentItems(db, contentType) {
  const result = await db.prepare(`
    SELECT * FROM content_items WHERE content_type = ? ORDER BY featured DESC, sort_order ASC, name ASC
  `).bind(contentType).all();
  return result.results || [];
}

export async function countPublishedContentItems(db, contentType) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS n FROM content_items WHERE content_type = ? AND published = 1 AND status = 'published'
  `).bind(contentType).first();
  return row?.n || 0;
}

/**
 * Sports/payment-methods/currencies attached to one item, via the
 * generic join tables from migration 0051. Returns the lookup rows
 * themselves (not just ids) so callers can render names/icons
 * directly.
 */
export async function getContentItemSports(db, contentType, contentId) {
  const result = await db.prepare(`
    SELECT s.* FROM content_sports cs
    JOIN sports s ON s.id = cs.sport_id
    WHERE cs.content_type = ? AND cs.content_id = ?
    ORDER BY s.sort_order ASC, s.name ASC
  `).bind(contentType, contentId).all();
  return result.results || [];
}

export async function getContentItemPaymentMethods(db, contentType, contentId) {
  const result = await db.prepare(`
    SELECT pm.* FROM content_payment_methods cpm
    JOIN payment_methods pm ON pm.id = cpm.payment_method_id
    WHERE cpm.content_type = ? AND cpm.content_id = ?
    ORDER BY pm.sort_order ASC, pm.name ASC
  `).bind(contentType, contentId).all();
  return result.results || [];
}

export async function getContentItemCurrencies(db, contentType, contentId) {
  const result = await db.prepare(`
    SELECT c.* FROM content_currencies cc
    JOIN currencies c ON c.id = cc.currency_id
    WHERE cc.content_type = ? AND cc.content_id = ?
    ORDER BY c.code ASC
  `).bind(contentType, contentId).all();
  return result.results || [];
}

/**
 * Create a new content item. Minimal write path -- enough for a
 * future admin form or a seed script to use; the dashboard UI itself
 * (Phase 25/67 of the original spec) is not part of Phase 3. slug
 * uniqueness is enforced by the UNIQUE(content_type, slug) constraint
 * from migration 0051 -- this will throw if it collides, same as
 * casinos.createCasino()'s behavior on a duplicate slug.
 */
/**
 * Partial update. Only the fields present in `fields` are changed --
 * omit a key to leave that column untouched (this is the "PATCH"
 * shape, not a full-row replace). Identified by (content_type, slug)
 * since the UNIQUE constraint is on that pair, same as every other
 * lookup in this module.
 */
export async function updateContentItem(db, contentType, slug, fields) {
  const columnMap = {
    name: "name", title: "title", description: "description", website: "website",
    rating: "rating", license: "license", licenseCountry: "license_country",
    liveBetting: "live_betting", preMatch: "pre_match", cashout: "cashout", mobileApp: "mobile_app",
    linkedAffiliatePartnerId: "linked_affiliate_partner_id", metadataJson: "metadata_json",
    featured: "featured", sortOrder: "sort_order", status: "status", published: "published",
    seoTitle: "seo_title", seoDescription: "seo_description", seoKeywords: "seo_keywords",
  };
  const booleanFields = new Set(["liveBetting", "preMatch", "cashout", "mobileApp", "featured", "published"]);

  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${column} = ?`);
      values.push(booleanFields.has(key) ? (fields[key] ? 1 : 0) : fields[key]);
    }
  }
  if (!sets.length) return getContentItem(db, contentType, slug);

  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  if (fields.published && !fields.publishedAtAlreadySet) {
    sets.push(`published_at = COALESCE(published_at, CURRENT_TIMESTAMP)`);
  }
  values.push(contentType, slug);

  return db.prepare(`
    UPDATE content_items SET ${sets.join(", ")} WHERE content_type = ? AND slug = ? RETURNING *
  `).bind(...values).first();
}

export async function deleteContentItemCustomFieldValues(db, contentItemId) {
  return db.prepare(`DELETE FROM custom_field_values WHERE content_item_id = ?`).bind(contentItemId).run();
}

/** Bulk-set custom field values: replaces every value for this item with exactly what's passed (a full replace, not a patch -- simpler and safer for a form that always submits every field it knows about). values: { field_key: value, ... } */
export async function setContentItemCustomFieldValues(db, contentItemId, values) {
  await deleteContentItemCustomFieldValues(db, contentItemId);
  for (const [fieldKey, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === "") continue; // don't store empty rows
    await db.prepare(`
      INSERT INTO custom_field_values (content_item_id, field_key, value) VALUES (?, ?, ?)
    `).bind(contentItemId, fieldKey, String(value)).run();
  }
}

export async function createContentItem(db, contentType, fields) {
  const {
    slug, name, title = null, description = null, excerpt = null,
    website = null, rating = 0, license = null, licenseCountry = null,
    liveBetting = false, preMatch = false, cashout = false, mobileApp = false,
    linkedAffiliatePartnerId = null, metadataJson = null,
    featured = false, sortOrder = 0, status = 'draft', published = false,
    seoTitle = null, seoDescription = null, seoKeywords = null,
    authorId = null, createdBy = null, customTypeSlug = null,
  } = fields;

  const result = await db.prepare(`
    INSERT INTO content_items (
      content_type, custom_type_slug, slug, name, title, description, excerpt,
      website, rating, license, license_country, live_betting, pre_match, cashout, mobile_app,
      linked_affiliate_partner_id, metadata_json,
      featured, sort_order, status, published,
      seo_title, seo_description, seo_keywords, author_id, created_by, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `).bind(
    contentType, customTypeSlug, slug, name, title, description, excerpt,
    website, rating, license, licenseCountry, liveBetting ? 1 : 0, preMatch ? 1 : 0, cashout ? 1 : 0, mobileApp ? 1 : 0,
    linkedAffiliatePartnerId, metadataJson,
    featured ? 1 : 0, sortOrder, status, published ? 1 : 0,
    seoTitle, seoDescription, seoKeywords, authorId, createdBy,
    published ? new Date().toISOString() : null
  ).first();

  return result;
}
