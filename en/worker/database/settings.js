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

export async function saveSettings(
 db,
 settings
){
 for(const key in settings){

  await db.prepare(`
  INSERT OR REPLACE INTO settings(
   key,
   value,
   updated_at
  )
  VALUES(
   ?,
   ?,
   CURRENT_TIMESTAMP
  )
  `)
  .bind(
   key,
   String(settings[key])
  )
  .run();
 }

 return true;
}
