// =====================================================
// GLOBAL COMPONENT ENGINE
// Loads, parses, and renders database-driven components
// =====================================================

import { getPageComponents } from "./database/components.js";
import { getReviewBlocks } from "./database/review_blocks.js";
import { getSeoMeta } from "./database/seo_meta.js";

/**
 * Load all components assigned to a page, in position order.
 * Returns an array of parsed component objects ready for rendering.
 */
export async function loadPageComponents(db, pageType, pageSlug) {
  const rows = await getPageComponents(db, pageType, pageSlug);
  const components = [];

  for (const row of rows) {
    const component = {
      id: row.id,
      type: row.type,
      name: row.name,
      title: row.title || "",
      content: row.content || "",
      settings: {},
      position: row.position
    };

    // Parse content based on type
    if (row.content) {
      if (row.type === "faq_group" || row.type === "casino_grid" || row.type === "comparison_table") {
        try { component.content = JSON.parse(row.content); } catch { component.content = []; }
      }
    }

    // Parse settings
    if (row.settings_json) {
      try { component.settings = JSON.parse(row.settings_json); } catch { component.settings = {}; }
    }

    components.push(component);
  }

  return components;
}

/**
 * Render a single component into HTML using its template.
 * The renderer instance is passed in to reuse template loading.
 */
export async function renderComponent(renderer, component) {
  const templateName = `components/${component.type}.html`;
  let template;
  try {
    template = await renderer.loadTemplate(templateName);
  } catch {
    template = null;
  }
  if (!template) {
    return renderFallback(component);
  }
  // Prepare data for template variable replacement
  const data = {
    title: component.title || "",
    content: typeof component.content === "string" ? component.content : "",
    name: component.name || "",
    ...component.settings
  };

  // For faq_group, build FAQ items HTML
  if (component.type === "faq_group" && Array.isArray(component.content)) {
    data.faq_items = component.content.map((f, i) => `
      <div class="faq-item">
        <button class="faq-question" onclick="this.parentElement.classList.toggle('active')">${f.q || f.question || ""}</button>
        <div class="faq-answer"><p>${f.a || f.answer || ""}</p></div>
      </div>
    `).join("");
    data.faq_jsonld = JSON.stringify(component.content.map(f => ({
      "@type": "Question",
      "name": f.q || f.question || "",
      "acceptedAnswer": { "@type": "Answer", "text": f.a || f.answer || "" }
    })));
  }

  // For author, parse content JSON
  if (component.type === "author" && typeof component.content === "string") {
    try {
      const author = JSON.parse(component.content);
      Object.assign(data, author);
    } catch {}
  }

  return renderer.replaceVariables(template, data);
}

/**
 * Render all components for a page into a single HTML string.
 */
export async function renderPageComponents(renderer, db, pageType, pageSlug) {
  const components = await loadPageComponents(db, pageType, pageSlug);
  const htmlParts = [];

  for (const component of components) {
    const html = await renderComponent(renderer, component);
    htmlParts.push(html);
  }

  return htmlParts.join("\n");
}

/**
 * Load review blocks for a review and render them.
 */
export async function loadReviewBlocks(db, reviewSlug) {
  return await getReviewBlocks(db, reviewSlug);
}

export async function renderReviewBlocks(renderer, db, reviewSlug) {
  const blocks = await loadReviewBlocks(db, reviewSlug);
  const htmlParts = [];

  for (const block of blocks) {
    const data = {
      block_id: `block-${block.id}`,
      block_title: block.title,
      block_content: block.content
    };
    const html = await renderer.loadTemplate("components/review-block.html");
    htmlParts.push(renderer.replaceVariables(html, data));
  }

  return htmlParts.join("\n");
}

/**
 * Load SEO meta for a page. Falls back to null if not found.
 */
export async function loadSeoMeta(db, pageType, pageSlug) {
  return await getSeoMeta(db, pageType, pageSlug);
}

/**
 * Fallback renderer for component types without a template.
 */
function renderFallback(component) {
  if (component.type === "text" || component.type === "html") {
    return `<section class="component-text"><h2>${component.title || ""}</h2><div>${component.content || ""}</div></section>`;
  }
  if (component.type === "cta") {
    let settings = {};
    try { settings = JSON.parse(component.settings_json || "{}"); } catch {}
    return `<section class="component-cta"><h2>${component.title || ""}</h2><div>${component.content || ""}</div><a href="${settings.link || "#"}" class="btn btn--primary">${settings.button_text || "Learn More"}</a></section>`;
  }
  return `<section class="component-${component.type}"><h2>${component.title || component.name || ""}</h2><div>${typeof component.content === "string" ? component.content : ""}</div></section>`;
}
