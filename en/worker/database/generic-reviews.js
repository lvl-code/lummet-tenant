// Generic review CREATE for sportsbook/affiliate_partner/custom content
// (casino review creation stays on the existing createReview() in
// reviews.js, untouched). Rendering for these already existed since
// Phase 6 (renderGenericReview) -- this is the write side that was
// missing.
//
// IMPORTANT — casino_slug sentinel, not NULL:
// The live `reviews` table still has casino_slug as NOT NULL (see
// docs/generic-content-engine/POST-DEPLOYMENT-FIX-0052.md -- the
// planned "make casino_slug nullable" table rebuild was deliberately
// NOT attempted after the 0052 incident, where a similar rebuild
// nearly dropped undocumented production columns and was rejected by
// the D1 console's BEGIN TRANSACTION restriction anyway). Rather than
// risk a second rebuild, non-casino reviews are written with
// casino_slug = '' (empty string) as an explicit sentinel -- never
// NULL, never a real casino slug, so it can never collide with a real
// `WHERE casino_slug = ?` lookup elsewhere in the app. This is a
// documented, reversible workaround, not a permanent design choice --
// making the column properly nullable via a carefully planned,
// separately reviewed migration remains the correct long-term fix.
export async function createGenericReview(db, {
  reviewedContentType, reviewedContentId, slug, title, content,
  pros = null, cons = null, rating = null, verdict = null,
  seoTitle = null, seoDescription = null, seoKeywords = null,
  authorId = null, createdBy = null, published = false,
}) {
  if (reviewedContentType === "casino") {
    throw new Error("createGenericReview is for non-casino content types; use createReview() from reviews.js for casino reviews.");
  }
  return db.prepare(`
    INSERT INTO reviews (
      casino_slug, slug, title, content, pros, cons, rating, verdict,
      seo_title, seo_description, seo_keywords, author_id, created_by,
      published, ai_generated, reviewed_content_type, reviewed_content_id
    ) VALUES ('', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    RETURNING *
  `).bind(
    slug, title, content, pros, cons, rating, verdict,
    seoTitle, seoDescription, seoKeywords, authorId, createdBy,
    published ? 1 : 0, reviewedContentType, reviewedContentId
  ).first();
}

// Every write below is restricted to GENERIC reviews only (the
// casino_slug = '' sentinel described above + a non-casino
// reviewed_content_type). Before this guard, updateGenericReview() ran
// `UPDATE reviews ... WHERE id = ?`, so posting a CASINO review's id to
// /api/v1/generic-review/update edited that casino review through the
// wrong endpoint -- bypassing the casino review path. Casino reviews
// are never reachable from anything in this file.
const GENERIC_ONLY = `casino_slug = '' AND reviewed_content_type IN ('sportsbook', 'affiliate_partner', 'custom')`;

export async function getGenericReview(db, id) {
  return db.prepare(`SELECT * FROM reviews WHERE id = ? AND ${GENERIC_ONLY} LIMIT 1`).bind(id).first();
}

export async function deleteGenericReview(db, id) {
  return db.prepare(`DELETE FROM reviews WHERE id = ? AND ${GENERIC_ONLY}`).bind(id).run();
}

export async function updateGenericReview(db, id, fields) {
  const sets = [];
  const values = [];
  const allowed = ["title", "content", "pros", "cons", "rating", "verdict", "seo_title", "seo_description", "seo_keywords", "published", "author_id"];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (!sets.length) return null;
  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  return db.prepare(`UPDATE reviews SET ${sets.join(", ")} WHERE id = ? AND ${GENERIC_ONLY} RETURNING *`).bind(...values).first();
}

/** All generic (non-casino) reviews for a given reviewed content type, admin listing. */
export async function getGenericReviewsForType(db, reviewedContentType, { limit = null, offset = 0 } = {}) {
  if (limit == null) {
    const result = await db.prepare(`
      SELECT * FROM reviews WHERE reviewed_content_type = ? AND ${GENERIC_ONLY} ORDER BY created_at DESC
    `).bind(reviewedContentType).all();
    return result.results || []; // existing callers unaffected
  }
  const result = await db.prepare(`
    SELECT * FROM reviews WHERE reviewed_content_type = ? AND ${GENERIC_ONLY} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).bind(reviewedContentType, limit, offset).all();
  const total = (await db.prepare(`SELECT COUNT(*) n FROM reviews WHERE reviewed_content_type = ? AND ${GENERIC_ONLY}`).bind(reviewedContentType).first()).n;
  return { items: result.results || [], total };
}
