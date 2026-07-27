// =====================================================
// LEVELCASINO TEMPLATE ENGINE
// =====================================================

export class Renderer {

  constructor(env, request = null) {
    this.env = env;
    this.country = request?.cf?.country || "RW";
  }

  // =====================================================
  // LOAD TEMPLATE FILE
  // =====================================================
  async loadTemplate(name) {
    const file = await this.env.ASSETS.fetch(
      new Request(`https://assets.local/templates/${name}`)
    );
    if (!file.ok) return null;
    return await file.text();
  }

  // =====================================================
  // REPLACE {{variables}}
  // =====================================================
  replaceVariables(template, data = {}) {
    // Handle {{#if key}}...{{/if}} blocks
    if (!template || typeof template !== "string") {
    console.error("Template missing:", template);
    return "";
  }
    template = template.replace(
      /\{\{#if\s+(.*?)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, key, content) => {
        key = key.trim();
        const val = data[key];
        if (val && val !== "" && val !== null && val !== undefined && val !== false) {
          return content;
        }
        return "";
      }
    );
    // Handle {{key}} variables
    return template.replace(
      /\{\{(.*?)\}\}/g,
      (_, key) => {
        key = key.trim();
        return data[key] ?? "";
      }
    );
  }

  // =====================================================
  // INCLUDE COMPONENTS
  // =====================================================
    async injectComponents(html, breadcrumbHtml = null) {
    const header = await this.loadTemplate("layout/header.html");
    const footer = await this.loadTemplate("layout/footer.html");
    const sidebar = await this.loadTemplate("layout/sidebar.html");

    const breadcrumbs = breadcrumbHtml || await this.loadTemplate("components/breadcrumbs.html");

    html = html.replace("{{HEADER}}", header);
    html = html.replace("{{FOOTER}}", footer);
    html = html.replace("{{SIDEBAR}}", sidebar);
    html = html.replace("{{BREADCRUMBS}}", breadcrumbs);

    return html;
  }

  async renderComponents(pageType, pageSlug, injectionPoint = null) {
    const { renderPageComponents } = await import("./component-engine.js");
    return await renderPageComponents(this, this.env.DB, pageType, pageSlug, injectionPoint);
  }

  async renderAllComponents(pageType, pageSlug) {
    const { renderAllInjectionPoints } = await import("./component-engine.js");
    return await renderAllInjectionPoints(this, this.env.DB, pageType, pageSlug);
  }

  async renderReviewBlocks(reviewSlug) {
    const { renderReviewBlocks } = await import("./component-engine.js");
    return await renderReviewBlocks(this, this.env.DB, reviewSlug);
  }

  async loadDynamicSeo(pageType, pageSlug) {
    const { loadSeoMeta } = await import("./component-engine.js");
    const seo = await loadSeoMeta(this.env.DB, pageType, pageSlug);
    if (!seo) return {};
    return {
      seo_title: seo.title || "",
      seo_description: seo.description || "",
      canonical: seo.canonical || "",
      og_image: seo.og_image || "",
      seo_keywords: seo.keywords || "",
      seo_schema: seo.schema_json || "",
      seo_robots: seo.robots || "index, follow"
    };
  }

  async loadNavData() {
    const { getNavItems } = await import("./database/nav.js");
    const { getCached, setCached, CACHE_KEYS } = await import("./cache.js");

    const locations = ["header", "footer_casinos", "footer_company", "footer_support", "footer_legal", "mobile"];
    const results = await Promise.all(
      locations.map(async (loc) => {
        const cacheKey = CACHE_KEYS.NAV(loc);
        let items = await getCached(this.env, cacheKey);
        if (!items) {
          items = await getNavItems(this.env.DB, loc);
          await setCached(this.env, cacheKey, items, 600);
        }
        return { loc, items };
      })
    );

    const navData = {};
    for (const { loc, items } of results) {
      navData[loc] = items;
    }

    // Mobile nav: use dedicated "mobile" location, fall back to first 5 header items
    const mobileItems = (navData.mobile && navData.mobile.length > 0)
      ? navData.mobile
      : (navData.header || []).slice(0, 5);

    return {
      header_nav: this.buildHeaderNav(navData.header),
      footer_casinos: this.buildFooterLinks(navData.footer_casinos),
      footer_company: this.buildFooterLinks(navData.footer_company),
      footer_support: this.buildFooterLinks(navData.footer_support),
      footer_legal: this.buildFooterLinks(navData.footer_legal),
      mobile_nav: this.buildMobileNav(mobileItems)
    };
  }

  buildMobileNav(items) {
    return items.map(item => {
      const icon = item.icon || "";
      const external = item.is_external ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${item.url}"${external} class="mobile-nav-item" data-href="${item.url}">
        <span class="mobile-nav-icon">${icon}</span>
        <span class="mobile-nav-label">${item.label}</span>
      </a>`;
    }).join("\n");
  }

  buildHeaderNav(items) {
    return items.map(item => {
      const external = item.is_external ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${item.url}"${external}>${item.label}</a>`;
    }).join("\n");
  }

  buildFooterLinks(items) {
    return items.map(item => {
      const external = item.is_external ? ' target="_blank" rel="noopener noreferrer nofollow"' : "";
      return `<li><a href="${item.url}"${external}>${item.label}</a></li>`;
    }).join("\n");
  }
  async loadActiveBanners(country) {
    const { getActiveBanners } = await import("./database/banners.js");
    const banners = await getActiveBanners(this.env.DB, country);
    if (banners.length === 0) return [];
    return banners.map(banner => {
      const dismissible = banner.dismissible ? `<button class="banner-dismiss" onclick="this.parentElement.style.display='none';document.cookie='banner_${banner.id}=dismissed;max-age=86400;path=/'">&times;</button>` : "";
      const button = banner.button_text && banner.link ? `<a href="${banner.link}" class="banner-btn" style="background:${banner.text_color};color:${banner.bg_color}">${banner.button_text}</a>` : "";
      const html = `
        <div class="site-banner banner-${banner.position}" data-id="${banner.id}" style="background:${banner.bg_color};color:${banner.text_color}">
          <div class="container banner-inner">
            ${banner.title ? `<strong>${banner.title}</strong>` : ""}
            ${banner.content ? `<span>${banner.content}</span>` : ""}
            ${button}
          </div>
          ${dismissible}
        </div>`;
      return { position: banner.position, html };
    });
  }
  async loadActiveBannersbackup(country) {
    const { getActiveBanners } = await import("./database/banners.js");
    const banners = await getActiveBanners(this.env.DB, country);

    if (banners.length === 0) return "";

    return banners.map(banner => {
      const dismissible = banner.dismissible ? `<button class="banner-dismiss" onclick="this.parentElement.style.display='none';document.cookie='banner_${banner.id}=dismissed;max-age=86400;path=/'">&times;</button>` : "";
      const button = banner.button_text && banner.link ? `<a href="${banner.link}" class="banner-btn" style="background:${banner.text_color};color:${banner.bg_color}">${banner.button_text}</a>` : "";
      return `
        <div class="site-banner banner-${banner.position}" data-id="${banner.id}" style="background:${banner.bg_color};color:${banner.text_color}">
          <div class="container banner-inner">
            ${banner.title ? `<strong>${banner.title}</strong>` : ""}
            ${banner.content ? `<span>${banner.content}</span>` : ""}
            ${button}
          </div>
          ${dismissible}
        </div>`;
    }).join("");
  }


  // =====================================================
// BUILD SEO
// =====================================================

escapeHtml(str = "") {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

buildSEO(data = {}) {
  const title = data.seo_title || "Level Casino — Expert Casino Reviews";
  const description = this.escapeHtml(data.seo_description || "");
  const canonical = data.canonical || "";
  const ogImage = data.og_image || "https://level.casino/static/images/logo.png";

  return `
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${this.escapeHtml(title)}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="${canonical}">
<meta name="twitter:title" content="${this.escapeHtml(title)}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">
`;
}

  // =====================================================
  // JSON-LD
  // =====================================================

  buildSchema(schema = {}) {

    return `
<script type="application/ld+json">
${JSON.stringify(schema)}
</script>
`;
  }

  // =====================================================
  // FULL PAGE RENDER
  // =====================================================
  async render(pageTemplate, data = {}, schema = {}, breadcrumbs = null) {
    let page = await this.loadTemplate(`pages/${pageTemplate}`);

    // Load dynamic navigation data first
    const navData = await this.loadNavData();

    const allData = { ...navData, ...data };

    page = this.replaceVariables(page, allData);

    let base = await this.loadTemplate("layout/base.html");
    const seo = this.buildSEO(data);
    const jsonld = this.buildSchema(schema);

    base = base.replace("{{SEO}}", seo);
    base = base.replace("{{SCHEMA}}", jsonld);
    base = base.replace("{{CONTENT}}", page);

    let breadcrumbHtml = null;
    if (breadcrumbs && breadcrumbs.length > 0) {
      const parts = breadcrumbs.map(c =>
        c.url
          ? `<a href="${c.url}">${c.label}</a>`
          : `<span class="breadcrumb-current">${c.label}</span>`
      );
      breadcrumbHtml = `<nav class="breadcrumbs" id="breadcrumbs">${parts.join(" / ")}</nav>`;
    }
    base = await this.injectComponents(base, breadcrumbHtml);

    // Load and inject active banners
    try {
      const country = data._geo_country || this.country || "RW";
      const allBanners = await this.loadActiveBanners(country);
      const topBanners = allBanners.filter(b => b.position === "top");
      const bottomBanners = allBanners.filter(b => b.position === "bottom");
      base = base.replace("{{BANNERS_TOP}}", topBanners.map(b => b.html).join(""));
      base = base.replace("{{BANNERS_BOTTOM}}", bottomBanners.map(b => b.html).join(""));
    } catch (e) {
      console.error("Banner loading failed:", e.message);
      base = base.replace("{{BANNERS_TOP}}", "");
      base = base.replace("{{BANNERS_BOTTOM}}", "");
    }

    // NOW do the final variable replacement with merged data
    base = this.replaceVariables(base, allData);

    return base;
  }
  async renderbackup(pageTemplate, data = {}, schema = {}, breadcrumbs = null) {
    let page = await this.loadTemplate(`pages/${pageTemplate}`);
    page = this.replaceVariables(page, data);

    let base = await this.loadTemplate("layout/base.html");
    const seo = this.buildSEO(data);
    const jsonld = this.buildSchema(schema);

    base = base.replace("{{SEO}}", seo);
    base = base.replace("{{SCHEMA}}", jsonld);
    base = base.replace("{{CONTENT}}", page);

    let breadcrumbHtml = null;
    if (breadcrumbs && breadcrumbs.length > 0) {
      const parts = breadcrumbs.map(c =>
        c.url
          ? `<a href="${c.url}">${c.label}</a>`
          : `<span class="breadcrumb-current">${c.label}</span>`
      );
      breadcrumbHtml = `<nav class="breadcrumbs" id="breadcrumbs">${parts.join(" / ")}</nav>`;
    }
    base = await this.injectComponents(base, breadcrumbHtml);

        // Load dynamic navigation data
    const navData = await this.loadNavData();
    base = this.replaceVariables(base, navData);

    // Load and inject active banners — wrapped in try-catch so banner
    // failures never break page rendering
    try {
      const country = data._geo_country || this.country || "RW";
      const bannersHtml = await this.loadActiveBanners(country);
      base = base.replace("{{BANNERS}}", bannersHtml);
    } catch (e) {
      console.error("Banner loading failed:", e.message);
      base = base.replace("{{BANNERS}}", "");
    }

    base = this.replaceVariables(base, data);

    return base;


  } 

}
