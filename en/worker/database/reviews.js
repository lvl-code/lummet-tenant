export async function getReview(db, slug, countryCode = null) {

  if (countryCode) {

    const geoReview = await db
      .prepare(`
        SELECT *
        FROM reviews
        WHERE slug = ?
        AND country_code = ?
        LIMIT 1
      `)
      .bind(slug, countryCode)
      .first();

    if (geoReview) return geoReview;
  }

  return await db
    .prepare(`
      SELECT *
      FROM reviews
      WHERE slug = ?
      LIMIT 1
    `)
    .bind(slug)
    .first();
}


export async function createReview(db, review) {
  return await db
    .prepare(`
      INSERT INTO reviews (
        casino_slug,
        country_code,
        slug,
        title,

        overview,
        games,
        bonuses,
        payments,
        licenses,
        verdict,

        content,
        pros,
        cons,
        faq_json,
        rating,
        seo_title,
        seo_description,
        ai_generated,
        author_id,
        published,
        created_by
      )
      VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, 1, ?
      )
    `)
    .bind(
      review.casino_slug,
      review.country_code,
      review.slug,
      review.title,

      review.overview || "",
      review.games || "",
      review.bonuses || "",
      review.payments || "",
      review.licenses || "",
      review.verdict || "",

      review.content || "",
      JSON.stringify(review.pros || []),
      JSON.stringify(review.cons || []),
      review.faq_json || "[]",
      review.rating || 0,
      review.seo_title || null,
      review.seo_description || null,

      review.ai_generated ? 1 : 0,
      review.author_id || null,
      review.created_by || null
    )
    .run();
}


export async function updateReview(db, slug, review) {
  return await db
    .prepare(`
      UPDATE reviews
      SET
        title = ?,

        overview = ?,
        games = ?,
        bonuses = ?,
        payments = ?,
        licenses = ?,
        verdict = ?,

        content = ?,
        pros = ?,
        cons = ?,
        faq_json = ?,
        rating = ?,
        seo_title = ?,
        seo_description = ?,
        author_id = ?,

        updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?
    `)
    .bind(
      review.title,

      review.overview || "",
      review.games || "",
      review.bonuses || "",
      review.payments || "",
      review.licenses || "",
      review.verdict || "",

      review.content || "",
      JSON.stringify(review.pros || []),
      JSON.stringify(review.cons || []),
      review.faq_json || "[]",
      review.rating || 0,
      review.seo_title || null,
      review.seo_description || null,
      review.author_id || null,

      slug
    )
    .run();
}


export async function getCasinoReviews(
  db,
  casinoSlug
) {
  const result = await db.prepare(`
    SELECT *
    FROM reviews
    WHERE casino_slug = ?
    ORDER BY created_at DESC
  `)
    .bind(casinoSlug)
    .all();

  return result.results;
}


export async function deleteReview(db, slug) {
  return db.prepare(`
    DELETE FROM reviews
    WHERE slug = ?
  `)
    .bind(slug)
    .run();
}
