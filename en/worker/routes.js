import { dbLayer } from './database.js';
import { geoEngine } from './geo.js';
import { aiEngine } from './ai.js';
import { renderEngine } from './render.js';
import { seoEngine } from './seo.js';
import { sitemapEngine } from './sitemap.js';

export const router = {
  /**
   * Helper function to grab structural layout frameworks safely at the edge
   */
  async getLayoutTemplates(env) {
    // Structural fallbacks to maintain structural resilience if workspace is loading
    const defaultBase = `<!DOCTYPE html><html lang="en"><head>{{SEO_META_TAGS}}\n{{SEO_STRUCTURED_DATA}}</head><body>{{HEADER}}<div class="layout-main">{{SIDEBAR}}<main>{{CONTENT}}</main></div>{{FOOTER}}</body></html>`;
    const defaultHeader = `<header><nav><a href="/en/">Level Casino</a> — VIP Portals</nav></header>`;
    const defaultFooter = `<footer><p>&copy; 2026 Level Casino. All Rights Reserved. Responsible Gaming Verified.</p></footer>`;

    return {
      base: defaultBase,
      header: defaultHeader,
      footer: defaultFooter,
      sidebar: `<aside><p>Current Jurisdiction Market: <strong>{{geo.country}}</strong></p></aside>`,
      components: {
        'casino-card.html': `<div class="casino-card"><h3>{{name}}</h3><p>Rating: {{rating}}/5</p><a href="{{affiliate_link}}">Claim VIP Offer</a></div>`
      }
    };
  },

  async handle(request, env, ctx, geoContext) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Process and lock localized geological positioning context
    const geo = geoEngine.process(request, geoContext);

    // 2. Intercept and route real-time XML Search Engine Sitemaps
    if (path === '/en/sitemap.xml') {
      return await sitemapEngine.generate(env.DB);
    }

    // Normalize incoming string pathing
    const cleanPath = path.endsWith('/') && path !== '/en/' ? path.slice(0, -1) : path;

    // Load layout framework assets
    const layouts = await this.getLayoutTemplates(env);

    // 3. Main Directory Hub Index Page
    if (cleanPath === '/en' || cleanPath === '/en/') {
      const pageSeo = {
        title: `Top Rated Online Casinos 2026 - Localized VIP Directory`,
        description: `Access premium licensed iGaming operators matching user jurisdiction guidelines inside ${geo.country}.`
      };

      const seoPayload = seoEngine.compileSeoPayload('directory', { seo: pageSeo, countryCode: geo.country, countryName: geo.city, items: [] }, url);
      
      const pageTemplate = `<h1>Exclusive High-Roller Directory</h1><p>Showing optimized allocations for players in <strong>{{geo.city}}, {{geo.country}}</strong>.</p><div class="directory-grid">{{CASINO_LIST_LOOP}}</div>`;

      return await renderEngine.view(layouts, pageTemplate, {
        ...seoPayload,
        geo,
        casinos: [
          { name: "LevelUp Casino", rating: "4.9", affiliate_link: "#" },
          { name: "Cluster Casino", rating: "4.8", affiliate_link: "#" }
        ]
      });
    }

    // Segment extraction parsing for functional parameters
    const segments = cleanPath.split('/').filter(Boolean);

    if (segments.length >= 3) {
      const moduleType = segments[1];
      const slug = segments.slice(2).join('/');

      // 4. Dynamic Casino & Expert Review Rendering Layers
      if (moduleType === 'casino' || moduleType === 'review') {
        let dbData = null;
        try {
          dbData = await dbLayer.getCasinoContext(env.DB, slug, geo.country);
        } catch (err) {
          console.warn("D1 Execution bypassed or tables initializing. Triggering sandbox state.");
        }

        // Sandbox fallback generation if database record is missing or initializing
        const casinoAsset = dbData?.casino || {
          name: slug.charAt(0).toUpperCase() + slug.slice(1) + " Casino",
          slug: slug,
          features: ["VIP Cashback", "Crypto Cashouts", "Dedicated Account Managers"],
          affiliate_url: "https://eliyul.com"
        };

        // Determine regional restriction conditions
        const accessStatus = geoEngine.evaluateAccess(dbData?.geoRule ? [dbData.geoRule] : [], geo.country);

        if (accessStatus.status === 'blocked') {
          return new Response(`Jurisdiction Access Restriction: Content for ${casinoAsset.name} is unavailable inside ${geo.country}.`, { status: 403 });
        }

        // 5. Automated AI Content Translation / Generation Fallback
        let summaryContent = dbData?.review?.summary;
        if (!summaryContent) {
          // If D1 record is unpopulated, generate copy at the edge using Workers AI
          summaryContent = await aiEngine.generateReviewSummary(env, casinoAsset.name, geo.country);
        }

        const rawSeo = {
          title: `${casinoAsset.name} Review & High-Roller Bonuses [Geo: ${geo.country}]`,
          description: summaryContent.substring(0, 150)
        };

        const seoPayload = seoEngine.compileSeoPayload('review', {
          seo: rawSeo,
          casinoName: casinoAsset.name,
          affiliateUrl: casinoAsset.affiliate_url,
          summary: summaryContent
        }, url);

        const pageTemplate = `
          <article class="casino-profile">
            <h1>${casinoAsset.name} — Comprehensive Operational Analysis</h1>
            <div class="geo-badge">Target Jurisdiction Match: <strong>{{geo.country}}</strong></div>
            <p class="ai-summary">${summaryContent}</p>
            <h2>Premium VIP Features:</h2>
            <ul>
              ${casinoAsset.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <div class="cta-box">
              <a href="${casinoAsset.affiliate_url}" class="btn-vip">Secure Exclusive Match Package</a>
            </div>
          </article>
        `;

        return await renderEngine.view(layouts, pageTemplate, {
          ...seoPayload,
          geo
        });
      }
    }

    // Default 404 Fallback Within Language Architecture Namespace
    return new Response("Resource Allocation Fault: Sub-Path Missing from LevelCasino Target Manifest.", {
      status: 404,
      headers: { "Content-Type": "text/plain" }
    });
  }
};
