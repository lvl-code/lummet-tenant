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
      FROM casino_categories cc
      JOIN casinos c
      ON c.id = cc.casino_id
      JOIN categories cat
      ON cat.id = cc.category_id
      WHERE cat.slug = ?
      ORDER BY
        c.featured DESC,
        c.sort_order ASC,
        c.rating DESC
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

export async function updateCategory(db, slug, data) {
  return db.prepare(`
    UPDATE categories SET
      name=?, description=?, seo_title=?, seo_description=?
    WHERE slug=?
  `)
  .bind(data.name, data.description, data.seo_title, data.seo_description, slug)
  .run();
}

export async function deleteCategory(db, slug) {
  return db.prepare(`
    DELETE FROM categories WHERE slug=?
  `)
  .bind(slug)
  .run();
}
