export async function getPage(db, slug) {
  return await db
    .prepare(`
      SELECT *
      FROM pages
      WHERE slug = ?
      LIMIT 1
    `)
    .bind(slug)
    .first();
}

export async function createPage(db, page) {
  return await db
    .prepare(`
      INSERT INTO pages (
        slug,
        type,
        template,
        title,
        content_json,
        seo_title,
        seo_description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      page.slug,
      page.type,
      page.template,
      page.title,
      JSON.stringify(page.content_json || {}),
      page.seo_title,
      page.seo_description
    )
    .run();
}

export async function updatePage(
 db,
 slug,
 page
) {
 return db.prepare(`
 UPDATE pages
 SET
 title=?,
 content_json=?,
 seo_title=?,
 seo_description=?,
 updated_at=CURRENT_TIMESTAMP
 WHERE slug=?
 `)
 .bind(
 page.title,
 JSON.stringify(page.content_json || {}),
 page.seo_title,
 page.seo_description,
 slug
 )
 .run();
}
