export async function getCategory(
  db,
  slug
){

  return db.prepare(`
    SELECT *
    FROM categories
    WHERE slug=?
    LIMIT 1
  `)
  .bind(slug)
  .first();

}

export async function getAllCategories(
  db
){

  const result =
    await db.prepare(`
      SELECT *
      FROM categories
      ORDER BY name
    `)
    .all();

  return result.results || [];

}

export async function getCategoryCasinos(
  db,
  slug
){

  const result =
    await db.prepare(`
      SELECT c.*
      FROM casinos c
      JOIN casino_categories cc
      ON cc.casino_slug=c.slug
      WHERE cc.category_slug=?
      ORDER BY c.rating DESC
    `)
    .bind(slug)
    .all();

  return result.results || [];

}

export async function createCategory(
  db,
  data
){

  return db.prepare(`
    INSERT INTO categories(
      slug,
      name,
      description,
      seo_title,
      seo_description
    )
    VALUES(
      ?,?,?,?,?
    )
  `)
  .bind(
    data.slug,
    data.name,
    data.description,
    data.seo_title,
    data.seo_description
  )
  .run();

}
