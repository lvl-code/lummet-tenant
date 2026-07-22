// =====================================================
// LEVELCASINO TEMPLATE ENGINE
// =====================================================

export class Renderer {

  constructor(env) {
    this.env = env;
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
    const headerNav = await getNavItems(this.env.DB, "header");
    const footerCasinos = await getNavItems(this.env.DB, "footer_casinos");
    const footerCompany = await getNavItems(this.env.DB, "footer_company");
    const footerSupport = await getNavItems(this.env.DB, "footer_support");
    const footerLegal = await getNavItems(this.env.DB, "footer_legal");

    return {
      header_nav: this.buildHeaderNav(headerNav),
      footer_casinos: this.buildFooterLinks(footerCasinos),
      footer_company: this.buildFooterLinks(footerCompany),
      footer_support: this.buildFooterLinks(footerSupport),
      footer_legal: this.buildFooterLinks(footerLegal)
    };
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
        // Load and inject active banners
    const country = data._geo_country || "RW";
    const bannersHtml = await this.loadActiveBanners(country);
    base = base.replace("{{BANNERS}}", bannersHtml);

    base = this.replaceVariables(base, data);

    return base;
  } 

}
