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

export async function saveGeoRule(
 db,
 rule
){
 return db.prepare(`
 INSERT INTO geo_rules(
 casino_slug,
 country_code,
 status,
 bonus_override
 )
 VALUES(?,?,?,?)
 `)
 .bind(
 rule.casino_slug,
 rule.country_code,
 rule.status,
 rule.bonus_override
 )
 .run();
}
