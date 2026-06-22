export async function logClick(
  db,
  casinoSlug,
  country,
  city,
  ipHash,
  userAgent
) {

  return await db
    .prepare(`
      INSERT INTO clicks (
        casino_slug,
        country_code,
        city,
        ip_hash,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      casinoSlug,
      country,
      city,
      ipHash,
      userAgent
    )
    .run();
}
