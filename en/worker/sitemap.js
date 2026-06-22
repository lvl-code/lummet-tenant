export const sitemapEngine = {
  /**
   * Generates a structural XML stream mapping live database targets
   */
  async generate(db) {
    if (!db) {
      return new Response("<error>D1 Connection Fault</error>", {
        status: 500,
        headers: { "Content-Type": "application/xml" }
      });
    }

    // Capture dynamic asset lists across all platform verticals in parallel
    const casinosQuery = db.prepare(`SELECT slug, updated_at FROM casinos ORDER BY updated_at DESC LIMIT 1000`).all();
    const pagesQuery = db.prepare(`SELECT slug FROM pages LIMIT 500`).all();

    const [casinosResult, pagesResult] = await Promise.all([casinosQuery, pagesQuery]);
    
    const casinos = casinosResult.results || [];
    const pages = pagesResult.results || [];
    const currentDate = new Date().toISOString().split('T')[0];

    // Build standard XML nodes string block
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Static Language Root Hub Node
    xml += `  <url>\n    <loc>https://level.casino/en/</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    // 2. Dynamic Operator Profile Nodes
    casinos.forEach(item => {
      const lastMod = item.updated_at ? item.updated_at.split(' ')[0] : currentDate;
      xml += `  <url>\n    <loc>https://level.casino/en/casino/${item.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      // Accompanying review node mapping
      xml += `  <url>\n    <loc>https://level.casino/en/review/${item.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    // 3. Dynamic Custom Page Nodes
    pages.forEach(item => {
      xml += `  <url>\n    <loc>https://level.casino/en/${item.slug}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    });

    xml += `</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Robots-Tag": "noindex, follow", // Tells search engines to index target nodes within, not sitemap itself
        "Cache-Control": "public, max-age=3600" // Cache sitemap map for 1 hour at the edge
      }
    });
  }
};
