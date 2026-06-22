export async function getCasino(db, slug) {
  return await db
    .prepare(`
      SELECT *
      FROM casinos
      WHERE slug = ?
      LIMIT 1
    `)
    .bind(slug)
    .first();
}

export async function getAllCasinos(db) {
  const result = await db
    .prepare(`
      SELECT *
      FROM casinos
      WHERE published = 1
      ORDER BY rating DESC
    `)
    .all();

  return result.results;
}

export async function createCasino(db, casino) {
  return await db
    .prepare(`
      INSERT INTO casinos (
        slug,
        name,
        logo,
        website_url,
        affiliate_url,
        rating,
        bonus_title,
        bonus_value,
        features,
        seo_title,
        seo_description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      casino.slug,
      casino.name,
      casino.logo,
      casino.website_url,
      casino.affiliate_url,
      casino.rating,
      casino.bonus_title,
      casino.bonus_value,
      JSON.stringify(casino.features || []),
      casino.seo_title,
      casino.seo_description
    )
    .run();
}

export async function updateCasino(db, slug, casino) {
  return await db
    .prepare(`
      UPDATE casinos
      SET
        name = ?,
        logo = ?,
        website_url = ?,
        affiliate_url = ?,
        rating = ?,
        bonus_title = ?,
        bonus_value = ?,
        features = ?,
        seo_title = ?,
        seo_description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?
    `)
    .bind(
      casino.name,
      casino.logo,
      casino.website_url,
      casino.affiliate_url,
      casino.rating,
      casino.bonus_title,
      casino.bonus_value,
      JSON.stringify(casino.features || []),
      casino.seo_title,
      casino.seo_description,
      slug
    )
    .run();
}

export async function deleteCasino(db, slug) {
  return await db
    .prepare(`
      DELETE FROM casinos
      WHERE slug = ?
    `)
    .bind(slug)
    .run();
}
