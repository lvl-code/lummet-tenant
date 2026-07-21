export async function getNavItems(db, location) {
  const result = await db.prepare(`
    SELECT * FROM nav_items
    WHERE location = ? AND enabled = 1
    ORDER BY position ASC
  `).bind(location).all();
  return result.results || [];
}

export async function getAllNavItems(db) {
  const result = await db.prepare(`
    SELECT * FROM nav_items ORDER BY location, position ASC
  `).all();
  return result.results || [];
}

export async function createNavItem(db, data) {
  const result = await db.prepare(`
    INSERT INTO nav_items (label, url, parent_id, position, location, is_external, icon, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.label,
    data.url,
    data.parent_id || null,
    data.position || 0,
    data.location || "header",
    data.is_external ? 1 : 0,
    data.icon || null,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1
  ).run();
  return result.meta.last_row_id;
}

export async function updateNavItem(db, id, data) {
  return await db.prepare(`
    UPDATE nav_items SET
      label = ?, url = ?, parent_id = ?, position = ?,
      location = ?, is_external = ?, icon = ?, enabled = ?
    WHERE id = ?
  `).bind(
    data.label,
    data.url,
    data.parent_id || null,
    data.position || 0,
    data.location || "header",
    data.is_external ? 1 : 0,
    data.icon || null,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
    id
  ).run();
}

export async function deleteNavItem(db, id) {
  return await db.prepare(`DELETE FROM nav_items WHERE id = ?`).bind(id).run();
}
