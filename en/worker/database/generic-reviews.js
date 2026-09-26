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

export async function updateGenericReview(db, id, fields) {
  const sets = [];
  const values = [];
  const allowed = ["title", "content", "pros", "cons", "rating", "verdict", "seo_title", "seo_description", "seo_keywords", "published"];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (!sets.length) return null;
  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  return db.prepare(`UPDATE reviews SET ${sets.join(", ")} WHERE id = ? RETURNING *`).bind(...values).first();
}

/** All generic (non-casino) reviews for a given reviewed content type, admin listing. */
export async function getGenericReviewsForType(db, reviewedContentType) {
  const result = await db.prepare(`
    SELECT * FROM reviews WHERE reviewed_content_type = ? ORDER BY created_at DESC
  `).bind(reviewedContentType).all();
  return result.results || [];
}
