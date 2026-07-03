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
  const res = await this.env.ASSETS.fetch(
    new Request(`/templates/${name}`)
  );

  if (!res.ok) {
    throw new Error("Template not found: " + name);
  }

  return await res.text();
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

  async injectComponents(html) {

    const header =
      await this.loadTemplate(
        "layout/header.html"
      );

    const footer =
      await this.loadTemplate(
        "layout/footer.html"
      );

    const sidebar =
      await this.loadTemplate(
        "layout/sidebar.html"
      );

    const breadcrumbs =
      await this.loadTemplate(
        "components/breadcrumbs.html"
      );

    html = html.replace(
      "{{HEADER}}",
      header
    );

    html = html.replace(
      "{{FOOTER}}",
      footer
    );

    html = html.replace(
      "{{SIDEBAR}}",
      sidebar
    );

    html = html.replace(
      "{{BREADCRUMBS}}",
      breadcrumbs
    );

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

  async render(
    pageTemplate,
    data = {},
    schema = {}
  ) {

    // ---------------------------------
    // page
    // ---------------------------------

    let page =
      await this.loadTemplate(
        `pages/${pageTemplate}`
      );

    page =
      this.replaceVariables(
        page,
        data
      );

    page =
      await this.injectComponents(
        page
      );

    // ---------------------------------
    // layout
    // ---------------------------------

    let base =
      await this.loadTemplate(
        "layout/base.html"
      );

    const seo =
      this.buildSEO(data);

    const jsonld =
      this.buildSchema(schema);

    base = base.replace(
      "{{SEO}}",
      seo
    );

    base = base.replace(
      "{{SCHEMA}}",
      jsonld
    );

    base = base.replace(
      "{{CONTENT}}",
      page
    );

    return base;
  }

}
