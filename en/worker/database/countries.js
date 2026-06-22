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
