export async function getSetting(
  db,
  key
) {

  const setting = await db
    .prepare(`
      SELECT value
      FROM settings
      WHERE key = ?
    `)
    .bind(key)
    .first();

  return setting?.value || null;
}
