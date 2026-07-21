export async function createMedia(db, data) {
  const result = await db.prepare(`
    INSERT INTO media_library (filename, url, thumbnail_url, alt_text, width, height, mime_type, size, folder, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.filename,
    data.url,
    data.thumbnail_url || null,
    data.alt_text || null,
    data.width || null,
    data.height || null,
    data.mime_type || null,
    data.size || null,
    data.folder || "general",
    data.uploaded_by || null
  ).run();
  return result.meta.last_row_id;
}

export async function getMedia(db, id) {
  return await db.prepare(`SELECT * FROM media_library WHERE id = ?`).bind(id).first();
}

export async function getAllMedia(db, folder = null) {
  if (folder) {
    const result = await db.prepare(`SELECT * FROM media_library WHERE folder = ? ORDER BY created_at DESC`).bind(folder).all();
    return result.results || [];
  }
  const result = await db.prepare(`SELECT * FROM media_library ORDER BY created_at DESC`).all();
  return result.results || [];
}

export async function updateMedia(db, id, data) {
  return await db.prepare(`
    UPDATE media_library SET
      alt_text = ?, folder = ?
    WHERE id = ?
  `).bind(data.alt_text || null, data.folder || "general", id).run();
}

export async function deleteMedia(db, id) {
  return await db.prepare(`DELETE FROM media_library WHERE id = ?`).bind(id).run();
}

export async function getMediaFolders(db) {
  const result = await db.prepare(`SELECT DISTINCT folder FROM media_library ORDER BY folder`).all();
  return (result.results || []).map(r => r.folder);
}
