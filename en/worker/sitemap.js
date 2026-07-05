export const sitemapEngine = {
  async generate(db, type = "all") {
    if (!db) {
      return new Response("<error>D1 Connection Fault</error>", {
        status: 500,
        headers: { "Content-Type": "application/xml" }
      });
    }

    const currentDate = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static root for "all" and "casinos" sitemaps
    if (type === "all" || type === "casinos") {
      xml += `  <url>\n    <loc>https://level.casino/en/</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    }

    // Casinos + reviews
    if (type === "all" || type === "casinos") {
      const casinosResult = await db.prepare(
        `SELECT slug, updated_at FROM casinos WHERE published = 1 ORDER BY updated_at DESC LIMIT 1000`
      ).all();

      const casinoList = casinosResult.results || [];

      casinoList.forEach(item => {
        const lastMod = item.updated_at ? item.updated_at.split(' ')[0] : currentDate;
        xml += `  <url>\n    <loc>https://level.casino/en/casino/${item.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      });
    }

    // Reviews
    if (type === "all" || type === "reviews") {
      const reviewsResult = await db.prepare(
        `SELECT slug, updated_at FROM reviews WHERE published = 1 ORDER BY updated_at DESC LIMIT 1000`
      ).all();

      const reviewList = reviewsResult.results || [];

      reviewList.forEach(item => {
        const lastMod = item.updated_at ? item.updated_at.split(' ')[0] : currentDate;
        xml += `  <url>\n    <loc>https://level.casino/en/review/${item.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      });
    }

    // Dynamic pages (only in "all")
    if (type === "all") {
      const pagesResult = await db.prepare(
        `SELECT slug FROM pages WHERE published = 1 LIMIT 500`
      ).all();

      const pageList = pagesResult.results || [];

      pageList.forEach(item => {
        xml += `  <url>\n    <loc>https://level.casino/en/${item.slug}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      });
    }

    xml += `</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Robots-Tag": "noindex, follow",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }
};

