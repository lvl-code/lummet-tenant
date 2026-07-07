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


export async function getCasinosByCountry(db, countryCode) {
  const result = await db
    .prepare(`
      SELECT * FROM casinos
      WHERE published = 1 AND status = 'published'
      AND (
        supported_countries LIKE ?
        OR supported_countries IS NULL
        OR supported_countries = ''
      )
      AND (
        restricted_countries IS NULL
        OR restricted_countries = ''
        OR restricted_countries NOT LIKE ?
      )
      ORDER BY featured DESC, sort_order ASC, rating DESC
    `)
    .bind(`%${countryCode}%`, `%${countryCode}%`)
    .all();
  return result.results;
}
