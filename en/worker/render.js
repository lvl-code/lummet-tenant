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

  return await file.text();
} 
  
  // =====================================================
  // REPLACE {{variables}}
  // =====================================================

  replaceVariables(template, data = {}) {

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

  return `
<title>${data.seo_title || ""}</title>

<meta
name="description"
content="${this.escapeHtml(data.seo_description)}"
>
<link
rel="canonical"
href="${data.canonical || ""}"
>
<meta
property="og:title"
content="${data.seo_title || ""}"
>

<meta
property="og:description"
content="${this.escapeHtml(data.seo_description)}"
>
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
    return base;
  } 

}
