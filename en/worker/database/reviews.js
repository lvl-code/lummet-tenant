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
        content,
        pros,
        cons,
        rating,
        seo_title,
        seo_description,
        ai_generated
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      review.casino_slug,
      review.country_code,
      review.slug,
      review.title,
      review.content,
      JSON.stringify(review.pros || []),
      JSON.stringify(review.cons || []),
      review.rating,
      review.seo_title,
      review.seo_description,
      review.ai_generated ? 1 : 0
    )
    .run();
}

export async function updateReview(
  db,
  slug,
  review
) {
  return db.prepare(`
    UPDATE reviews
    SET
      title=?,
      content=?,
      pros=?,
      cons=?,
      rating=?,
      seo_title=?,
      seo_description=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE slug=?
  `)
  .bind(
    review.title,
    review.content,
    JSON.stringify(review.pros || []),
    JSON.stringify(review.cons || []),
    review.rating,
    review.seo_title,
    review.seo_description,
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
    WHERE casino_slug=?
    ORDER BY created_at DESC
  `)
  .bind(casinoSlug)
  .all();

  return result.results;
}

export async function deleteReview(db, slug) {
  return db.prepare(`
    DELETE FROM reviews WHERE slug=?
  `)
  .bind(slug)
  .run();
}
