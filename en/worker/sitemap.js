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

    if (type === "all") {
      xml += `  <url>\n    <loc>https://level.casino/en/</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>https://level.casino/en/casino</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>https://level.casino/en/review</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>https://level.casino/en/news</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>https://level.casino/en/category</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>https://level.casino/en/country</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    if (type === "all" || type === "casinos") {
      const r = await db.prepare(`SELECT slug, updated_at FROM casinos WHERE published = 1 AND status = 'published' ORDER BY updated_at DESC LIMIT 1000`).all();
      (r.results || []).forEach(item => {
        const lm = item.updated_at ? item.updated_at.split(' ')[0] : currentDate;
        xml += `  <url>\n    <loc>https://level.casino/en/casino/${item.slug}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      });
    }

    if (type === "all" || type === "reviews") {
      const r = await db.prepare(`SELECT slug, updated_at FROM reviews WHERE published = 1 ORDER BY updated_at DESC LIMIT 1000`).all();
      (r.results || []).forEach(item => {
        const lm = item.updated_at ? item.updated_at.split(' ')[0] : currentDate;
        xml += `  <url>\n    <loc>https://level.casino/en/review/${item.slug}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      });
    }

    if (type === "all") {
      const r = await db.prepare(`SELECT slug, updated_at FROM news WHERE published = 1 ORDER BY created_at DESC LIMIT 500`).all();
      (r.results || []).forEach(item => {
        const lm = item.updated_at ? item.updated_at.split(' ')[0] : currentDate;
        xml += `  <url>\n    <loc>https://level.casino/en/news/${item.slug}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      });

      const cr = await db.prepare(`SELECT slug FROM categories LIMIT 100`).all();
      (cr.results || []).forEach(item => {
        xml += `  <url>\n    <loc>https://level.casino/en/category/${item.slug}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      });

      const ctr = await db.prepare(`SELECT code FROM countries LIMIT 250`).all();
      (ctr.results || []).forEach(item => {
        xml += `  <url>\n    <loc>https://level.casino/en/country/${item.code}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
      });

      const pr = await db.prepare(`SELECT slug FROM pages WHERE published = 1 LIMIT 500`).all();
      (pr.results || []).forEach(item => {
        xml += `  <url>\n    <loc>https://level.casino/en/${item.slug}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
      });
    }

    xml += `</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Robots-Tag": "index, follow",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }
};

