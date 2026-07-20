export async function getCountry(db, code) {
  return await db
    .prepare(`
      SELECT *
      FROM countries
      WHERE code = ?
      LIMIT 1
    `)
    .bind(code)
    .first();
}
export async function getAllCountries(
  db
) {

  const result =
    await db.prepare(`
      SELECT *
      FROM countries
      ORDER BY name
    `).all();

  return result.results;
}



export async function createCountry(db, data) {
  return db.prepare(`
    INSERT INTO countries (code, name, currency, language, legal_status, seo_title, seo_description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    data.code.toUpperCase(), data.name, data.currency, data.language,
    data.legal_status, data.seo_title, data.seo_description
  )
  .run();
}

export async function updateCountry(db, code, data) {
  return db.prepare(`
    UPDATE countries SET
      name=?, currency=?, language=?, legal_status=?, seo_title=?, seo_description=?
    WHERE code=?
  `)
  .bind(data.name, data.currency, data.language, data.legal_status, data.seo_title, data.seo_description, code.toUpperCase())
  .run();
}


export async function deleteCountry(db, code) {
  return db.prepare(`
    DELETE FROM countries WHERE code=?
  `)
  .bind(code.toUpperCase())
  .run();
}


export async function getCountryById(db, id) {
  return await db.prepare(`SELECT * FROM countries WHERE id = ? LIMIT 1`).bind(id).first();
}
