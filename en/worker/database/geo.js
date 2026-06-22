export async function getGeoRule(
  db,
  casinoSlug,
  countryCode
) {
  return await db
    .prepare(`
      SELECT *
      FROM geo_rules
      WHERE casino_slug = ?
      AND country_code = ?
      LIMIT 1
    `)
    .bind(casinoSlug, countryCode)
    .first();
}
