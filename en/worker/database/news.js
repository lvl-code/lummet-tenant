export async function getNews(
  db,
  slug
){

  return db.prepare(`
    SELECT *
    FROM news
    WHERE slug=?
    LIMIT 1
  `)
  .bind(slug)
  .first();

}

export async function getAllNews(
  db
){

  const result =
    await db.prepare(`
      SELECT *
      FROM news
      WHERE published=1
      ORDER BY created_at DESC
    `)
    .all();

  return result.results || [];

}

export async function createNews(
  db,
  data
){

  return db.prepare(`
    INSERT INTO news(
      slug,
      title,
      content,
      author,
      seo_title,
      seo_description
    )
    VALUES(
      ?,?,?,?,?,?
    )
  `)
  .bind(
    data.slug,
    data.title,
    data.content,
    data.author || "Admin",
    data.seo_title,
    data.seo_description
  )
  .run();

}

export async function updateNews(
  db,
  slug,
  data
){

  return db.prepare(`
    UPDATE news
    SET
      title=?,
      content=?,
      seo_title=?,
      seo_description=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE slug=?
  `)
  .bind(
    data.title,
    data.content,
    data.seo_title,
    data.seo_description,
    slug
  )
  .run();

}

export async function deleteNews(
  db,
  slug
){

  return db.prepare(`
    DELETE FROM news
    WHERE slug=?
  `)
  .bind(slug)
  .run();

}
