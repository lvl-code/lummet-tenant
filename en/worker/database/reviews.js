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
