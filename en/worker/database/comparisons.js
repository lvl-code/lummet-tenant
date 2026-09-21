// comparisons / comparison_items (migration 0051). First-class,
// SEO-indexable comparison pages -- separate from the existing
// database-driven `comparison_table` component (component-engine.js
// + components/comparison_table.html), which is an admin-authored
// embeddable widget with its own JSON content shape and stays
// untouched. This module backs the new persistent comparisons table
// instead of trying to force-fit the two together -- see the Phase 6
// report's note on this for the reasoning.
//
// Both a comparison's items AND its editorial selection use an
// explicit (item_type, item_id) pair, never a bare ID, since either
// can point at `casinos` or `content_items` depending on content_type
// (per the earlier correction to the Phase 1 design).

export async function getComparison(db, contentType, slug) {
  return db.prepare(`
    SELECT * FROM comparisons WHERE content_type = ? AND slug = ? LIMIT 1
  `).bind(contentType, slug).first();
}

export async function getComparisonItems(db, comparisonId) {
  const result = await db.prepare(`
    SELECT * FROM comparison_items WHERE comparison_id = ? ORDER BY position ASC
  `).bind(comparisonId).all();
  return result.results || [];
}

export async function getPublishedComparisons(db, contentType, { limit = 100, offset = 0 } = {}) {
  const result = await db.prepare(`
    SELECT * FROM comparisons WHERE content_type = ? AND status = 'published'
    ORDER BY updated_at DESC LIMIT ? OFFSET ?
  `).bind(contentType, limit, offset).all();
  return result.results || [];
}

/**
 * Create a comparison plus its items in one call. items is an array
 * of { itemContentType, itemId, position }. Write path for a future
 * admin form -- not wired to a UI yet, same posture as every other
 * *_items/createX helper in this project. Runs as a manual two-step
 * write (D1 has no multi-statement transaction API exposed the way
 * raw SQLite does) -- if the items insert fails after the comparison
 * row succeeds, the caller gets the partial comparison id back in
 * the thrown error's context so it can clean up or retry the items
 * only, rather than silently leaving an inconsistent comparison with
 * items missing.
 */
export async function createComparison(db, {
  contentType, slug, title, description = null, criteria = [],
  editorialSelectionItemType = null, editorialSelectionItemId = null,
  status = "draft", seoTitle = null, seoDescription = null, seoKeywords = null,
  authorId = null, createdBy = null, items = [],
}) {
  const comparison = await db.prepare(`
    INSERT INTO comparisons (
      content_type, slug, title, description, criteria_json,
      editorial_selection_item_type, editorial_selection_item_id,
      status, seo_title, seo_description, seo_keywords, author_id, created_by,
      published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `).bind(
    contentType, slug, title, description, JSON.stringify(criteria),
    editorialSelectionItemType, editorialSelectionItemId,
    status, seoTitle, seoDescription, seoKeywords, authorId, createdBy,
    status === "published" ? new Date().toISOString() : null
  ).first();

  try {
    for (const item of items) {
      await db.prepare(`
        INSERT INTO comparison_items (comparison_id, item_content_type, item_id, position)
        VALUES (?, ?, ?, ?)
      `).bind(comparison.id, item.itemContentType, item.itemId, item.position ?? 0).run();
    }
  } catch (e) {
    e.comparisonId = comparison.id; // partial-write context for the caller, see doc comment above
    throw e;
  }

  return comparison;
}
