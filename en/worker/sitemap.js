import { getSiteContext } from "./site-context.js";
import { isContentTypeEnabled } from "./content-types.js";

export const sitemapEngine = {

  async generateIndex(request, env, db) {
    const site = await getSiteContext(request, env);
    const currentDate = new Date().toISOString().split("T")[0];
    const subSitemaps = [
      { loc: "/en/sitemap.xml", lastmod: currentDate },
      { loc: "/en/sitemap-casinos.xml", lastmod: currentDate },
      { loc: "/en/sitemap-reviews.xml", lastmod: currentDate },
      { loc: "/en/sitemap-news.xml", lastmod: currentDate },
      { loc: "/en/sitemap-updates.xml", lastmod: currentDate },
      { loc: "/en/sitemap-categories.xml", lastmod: currentDate },
      { loc: "/en/sitemap-countries.xml", lastmod: currentDate },
      { loc: "/en/sitemap-pages.xml", lastmod: currentDate },
      { loc: "/en/sitemap-authors.xml", lastmod: currentDate },
      { loc: "/en/sitemap-seo-pages.xml", lastmod: currentDate },
      { loc: "/en/sitemap-research.xml", lastmod: currentDate },
    ];

    // Content-type-gated: only linked from the index while enabled
    // for this environment (Phase 2 report §8 — sitemaps are one of
    // the enablement touchpoints, not just routing).
    if (await isContentTypeEnabled(env, "sportsbook")) {
      subSitemaps.push({ loc: "/en/sitemap-sportsbook.xml", lastmod: currentDate });
    }
    if (await isContentTypeEnabled(env, "affiliate_partner")) {
      subSitemaps.push({ loc: "/en/sitemap-affiliate-partner.xml", lastmod: currentDate });
    }
    if (await isContentTypeEnabled(env, "custom")) {
      subSitemaps.push({ loc: "/en/sitemap-custom.xml", lastmod: currentDate });
    }
    subSitemaps.push({ loc: "/en/sitemap-comparisons.xml", lastmod: currentDate });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const s of subSitemaps) {
      xml += `  <sitemap>\n    <loc>${site.url(s.loc)}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>\n`;
    }
    xml += `</sitemapindex>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Robots-Tag": "index, follow",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },

  async generate(request, env, db, type = "all") {
    if (!db) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        { status: 500, headers: { "Content-Type": "application/xml; charset=utf-8" } }
      );
    }

    const site = await getSiteContext(request, env);
    const currentDate = new Date().toISOString().split("T")[0];
    let urls = [];

    // Static URLs (only in the "all" sitemap)
    if (type === "all") {
      urls.push({ loc: "/en/", lastmod: currentDate, changefreq: "daily", priority: "1.0" });
      urls.push({ loc: "/en/casino", lastmod: currentDate, changefreq: "daily", priority: "0.9" });
      if (await isContentTypeEnabled(env, "sportsbook")) {
        urls.push({ loc: "/en/sportsbook", lastmod: currentDate, changefreq: "daily", priority: "0.9" });
      }
      if (await isContentTypeEnabled(env, "affiliate_partner")) {
        urls.push({ loc: "/en/affiliate-partner", lastmod: currentDate, changefreq: "daily", priority: "0.8" });
      }
      if (await isContentTypeEnabled(env, "custom")) {
        try {
          const customTypesResult = await db.prepare(`SELECT slug FROM custom_content_types`).all();
          for (const ct of customTypesResult.results || []) {
            urls.push({ loc: `/en/custom/${ct.slug}`, lastmod: currentDate, changefreq: "weekly", priority: "0.6" });
          }
        } catch (e) { console.error("Sitemap custom-type listing query failed:", e.message); }
      }
      urls.push({ loc: "/en/review", lastmod: currentDate, changefreq: "daily", priority: "0.8" });
      urls.push({ loc: "/en/news", lastmod: currentDate, changefreq: "daily", priority: "0.7" });
      urls.push({ loc: "/en/updates", lastmod: currentDate, changefreq: "daily", priority: "0.7" });
      urls.push({ loc: "/en/author", lastmod: currentDate, changefreq: "weekly", priority: "0.6" });
      urls.push({ loc: "/en/category", lastmod: currentDate, changefreq: "weekly", priority: "0.6" });
      urls.push({ loc: "/en/country", lastmod: currentDate, changefreq: "weekly", priority: "0.6" });
    }

    // Casinos
    if (type === "all" || type === "casinos") {
      try {
        const r = await db.prepare(
          `SELECT slug, updated_at FROM casinos WHERE published = 1 AND status = 'published' ORDER BY updated_at DESC LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          urls.push({ loc: `/en/casino/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.8" });
        }
      } catch (e) { console.error("Sitemap casinos query failed:", e.message); }
    }

    // Sportsbook (content_items, content_type = 'sportsbook') —
    // gated by enablement so a disabled type never appears here even
    // if rows exist in the table from earlier testing.
    if ((type === "all" || type === "sportsbook") && await isContentTypeEnabled(env, "sportsbook")) {
      try {
        const r = await db.prepare(
          `SELECT slug, updated_at FROM content_items WHERE content_type = 'sportsbook' AND published = 1 AND status = 'published' ORDER BY updated_at DESC LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          urls.push({ loc: `/en/sportsbook/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.8" });
        }
      } catch (e) { console.error("Sitemap sportsbook query failed:", e.message); }
    }

    // Affiliate partner content (content_items, content_type =
    // 'affiliate_partner') -- gated by enablement, same as sportsbook.
    if ((type === "all" || type === "affiliate-partner") && await isContentTypeEnabled(env, "affiliate_partner")) {
      try {
        const r = await db.prepare(
          `SELECT slug, updated_at FROM content_items WHERE content_type = 'affiliate_partner' AND published = 1 AND status = 'published' ORDER BY updated_at DESC LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          urls.push({ loc: `/en/affiliate-partner/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.7" });
        }
      } catch (e) { console.error("Sitemap affiliate-partner query failed:", e.message); }
    }

    // Custom content types (content_items, content_type = 'custom')
    // -- one combined sitemap across every admin-defined custom type,
    // per the original spec's Phase 32 ("custom sitemap", singular).
    // Gated the same way as the others.
    if ((type === "all" || type === "custom") && await isContentTypeEnabled(env, "custom")) {
      try {
        const r = await db.prepare(
          `SELECT slug, custom_type_slug, updated_at FROM content_items WHERE content_type = 'custom' AND published = 1 AND status = 'published' ORDER BY updated_at DESC LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          urls.push({ loc: `/en/custom/${item.custom_type_slug}/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.6" });
        }
      } catch (e) { console.error("Sitemap custom query failed:", e.message); }
    }

    // Comparisons (comparisons table) -- spans every content type,
    // each comparison gated individually by its own content_type's
    // enablement (a casino comparison is always eligible; a
    // sportsbook comparison isn't until sportsbook itself is on).
    if (type === "all" || type === "comparisons") {
      try {
        const r = await db.prepare(
          `SELECT content_type, slug, updated_at FROM comparisons WHERE status = 'published' ORDER BY updated_at DESC LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          if (!(await isContentTypeEnabled(env, item.content_type))) continue;
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          urls.push({ loc: `/en/compare/${item.content_type}/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.6" });
        }
      } catch (e) { console.error("Sitemap comparisons query failed:", e.message); }
    }

    // Reviews
    if (type === "all" || type === "reviews") {
      try {
        // reviewed_content_type/reviewed_content_id (migration 0052)
        // determine the URL prefix -- casino reviews (including every
        // pre-existing review, backfilled to 'casino') keep
        // /en/review/{slug} exactly as before. Reviews of the newer
        // content types need their own prefix, and custom reviews
        // additionally need their item's custom_type_slug, hence the
        // LEFT JOIN. Each type is also individually gated by
        // enablement, same as the content types themselves.
        const r = await db.prepare(
          `SELECT r.slug, r.updated_at, r.reviewed_content_type, ci.custom_type_slug
           FROM reviews r
           LEFT JOIN content_items ci ON ci.id = r.reviewed_content_id AND r.reviewed_content_type = 'custom'
           WHERE r.published = 1 ORDER BY r.updated_at DESC LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          const reviewedType = item.reviewed_content_type || "casino";

          if (reviewedType === "casino") {
            urls.push({ loc: `/en/review/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.7" });
          } else if (reviewedType === "sportsbook" && await isContentTypeEnabled(env, "sportsbook")) {
            urls.push({ loc: `/en/sportsbook/review/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.7" });
          } else if (reviewedType === "affiliate_partner" && await isContentTypeEnabled(env, "affiliate_partner")) {
            urls.push({ loc: `/en/affiliate-partner/review/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.6" });
          } else if (reviewedType === "custom" && item.custom_type_slug && await isContentTypeEnabled(env, "custom")) {
            urls.push({ loc: `/en/custom/${item.custom_type_slug}/review/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.6" });
          }
          // A disabled/unrecognized/malformed reviewed_content_type is
          // silently skipped rather than defaulting to /en/review/ --
          // guessing wrong would publish a broken URL to search engines.
        }
      } catch (e) { console.error("Sitemap reviews query failed:", e.message); }
    }

    // News
    if (type === "all" || type === "news") {
      try {
        const r = await db.prepare(
          `SELECT slug, updated_at FROM news WHERE published = 1 ORDER BY created_at DESC LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          urls.push({ loc: `/en/news/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.6" });
        }
      } catch (e) { console.error("Sitemap news query failed:", e.message); }
    }

        // Platform Updates
    if (type === "all" || type === "updates") {
      try {
        const r = await db.prepare(
          `SELECT slug, updated_at FROM platform_updates
           WHERE published = 1
           ORDER BY COALESCE(published_at, created_at) DESC
           LIMIT 50000`
        ).all();

        for (const item of r.results || []) {
          const lm = item.updated_at
            ? item.updated_at.split(" ")[0]
            : currentDate;

          urls.push({
            loc: `/en/updates/${item.slug}`,
            lastmod: lm,
            changefreq: "weekly",
            priority: "0.6"
          });
        }
      } catch (e) {
        console.error(
          "Sitemap platform updates query failed:",
          e.message
        );
      }
    }

    // Authors
if (type === "all" || type === "authors") {
  try {
    const r = await db.prepare(
      `SELECT slug, updated_at
       FROM authors
       WHERE published = 1
       ORDER BY updated_at DESC
       LIMIT 50000`
    ).all();

    for (const item of r.results || []) {
      const lm = item.updated_at
        ? item.updated_at.split(" ")[0]
        : currentDate;

      urls.push({
        loc: `/en/author/${item.slug}`,
        lastmod: lm,
        changefreq: "monthly",
        priority: "0.5"
      });
    }
  } catch (e) {
    console.error(
      "Sitemap authors query failed:",
      e.message
    );
  }
}

    // Categories
    if (type === "all" || type === "categories") {
      try {
        const r = await db.prepare(`SELECT slug FROM categories WHERE published = 1 AND status != 'draft' LIMIT 50000`).all();
        for (const item of r.results || []) {
          urls.push({ loc: `/en/category/${item.slug}`, lastmod: currentDate, changefreq: "weekly", priority: "0.6" });
        }
      } catch (e) { console.error("Sitemap categories query failed:", e.message); }
    }

    // Countries
    if (type === "all" || type === "countries") {
      try {
        const r = await db.prepare(`SELECT code FROM countries WHERE published = 1 AND status != 'draft' LIMIT 50000`).all();
        for (const item of r.results || []) {
          urls.push({ loc: `/en/country/${item.code}`, lastmod: currentDate, changefreq: "monthly", priority: "0.5" });
        }
      } catch (e) { console.error("Sitemap countries query failed:", e.message); }
    }

    // Pages
    if (type === "all" || type === "pages") {
      try {
        const r = await db.prepare(`SELECT slug FROM pages WHERE published = 1 LIMIT 50000`).all();
        for (const item of r.results || []) {
          urls.push({ loc: `/en/${item.slug}`, lastmod: currentDate, changefreq: "monthly", priority: "0.5" });
        }
      } catch (e) { console.error("Sitemap pages query failed:", e.message); }
    }

    // SEO landing pages (country_custom + category_country) — only
    // published AND sitemap_enabled rows, per spec section 16.
    if (type === "all" || type === "seo-pages") {
      try {
        const r = await db.prepare(
          `SELECT page_type, slug, country_code, category_id, updated_at
           FROM seo_pages
           WHERE published = 1 AND sitemap_enabled = 1
           LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          const loc =
            item.page_type === "country_custom"
              ? `/en/country/${item.country_code}/${item.slug}`
              : `/en/category/${item.slug}/${item.country_code}`;
          urls.push({ loc, lastmod: lm, changefreq: "weekly", priority: "0.6" });
        }
      } catch (e) { console.error("Sitemap seo-pages query failed:", e.message); }
    }

    // Research items — same published/status gate as every other
    // content type here (fixes the exact bug class the README's
    // "Sitemap draft-leak fix" note describes: never omit this filter).
    if (type === "all" || type === "research") {
      try {
        const r = await db.prepare(
          `SELECT type, slug, updated_at FROM research_items
           WHERE published = 1 AND status != 'draft'
           LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          urls.push({ loc: `/en/research/${item.type}/${item.slug}`, lastmod: lm, changefreq: "monthly", priority: "0.6" });
        }
      } catch (e) { console.error("Sitemap research query failed:", e.message); }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const u of urls) {
      xml += `  <url>\n    <loc>${site.url(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
    }
    xml += `</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Robots-Tag": "index, follow",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
};

