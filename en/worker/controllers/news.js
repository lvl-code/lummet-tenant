// News article, news list and news taxonomy pages.
// Part of worker/controllers.js, which re-exports everything from here.
import { Renderer } from "../render.js";
import { getSiteContext } from "../site-context.js";
import * as authors from "../database/authors.js";
import * as news from "../database/news.js";
import * as newsroom from "../database/newsroom.js";
import * as nrRender from "../newsroom-render.js";
import * as nrTrust from "../newsroom-trust.js";
import * as nrHome from "../newsroom-home.js";
import * as nrAnalytics from "../newsroom-analytics.js";
import * as nrSearch from "../newsroom-search.js";
import { logEvent as logAnalyticsEvent } from "../database/analytics.js";
import { buildBreadcrumbs } from "../breadcrumbs.js";
import { injectInlineAds } from "./ads.js";
import { cacheHeaders, escapeHtml, formatDate, safeAlt, stripHtml, toIsoDate, truncateText } from "./shared.js";
import { render404 } from "./system-pages.js";

// ── Newsroom: landing pages under /en/news/... (sections, regions, countries,
//    topics, entities, series) plus slug redirects ──
// Resolution for /en/news/<slug> when no LIVE article has that slug:
//   1. 301 to the article's current slug if it was renamed (always on: only ever
//      fires for URLs that would otherwise 404),
//   2. section, region, country pages (flag news_new_taxonomy),
//   3. 404.
// A live article ALWAYS wins over any of these (its URL is already indexed).
async function renderNewsSectionOr404(request, env, slug, { allowRedirect = false } = {}) {
  try {
    if (allowRedirect) {
      const target = await newsroom.getRedirectTarget(env.DB, slug);
      if (target) return new Response(null, { status: 301, headers: { Location: `/en/news/${encodeURIComponent(target)}`, "Cache-Control": "public, max-age=3600" } });
    }
    const flags = await newsroom.getNewsFlags(env.DB);
    if (flags.news_new_taxonomy) {
      const res = await renderNewsSection(request, env, slug)
        || await renderNewsRegion(request, env, slug)
        || await renderNewsCountry(request, env, slug);
      if (res) return res;
    }
  } catch (e) {
    console.error("News landing fallback failed:", e.message);
  }
  return render404(request, env);
}

// Generic listing page. `spec.load({limit, offset})` returns { articles, total }.
async function renderNewsCollection(request, env, spec) {
  const url = new URL(request.url);
  const rawPage = url.searchParams.get("page");
  const page = rawPage === null ? 1 : Number(rawPage);
  if (!Number.isInteger(page) || page < 1 || page > 500) return render404(request, env);
  const PAGE_SIZE = 12;

  const renderer = new Renderer(env, request);
  const [site, listing] = await Promise.all([
    getSiteContext(request, env),
    spec.load({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  ]);

  const totalPages = Math.max(1, Math.ceil(listing.total / PAGE_SIZE));
  if (page > totalPages) return render404(request, env);   // no thin/duplicate out-of-range pages

  const canonical = spec.canonicalPath ? site.url(spec.canonicalPath)
    : site.url(page === 1 ? spec.basePath : `${spec.basePath}?page=${page}`);  // query noise never changes the canonical
  const description = spec.seoDescription || spec.description || `${spec.name} news from ${site.siteName}.`;
  const offset = (page - 1) * PAGE_SIZE;
  const cards = listing.articles.map((a, i) => spec.renderCard ? spec.renderCard(a, offset + i + 1) : nrRender.renderArticleCard(a, formatDate)).join("");
  const empty = listing.articles.length ? "" :
    `<p style="padding:40px 0;color:var(--gray)">${spec.emptyMessage || "No articles here yet."} <a href="/en/news">Browse all news</a>.</p>`;

  const schema = {
    "@context": "https://schema.org",
    "@type": spec.schemaType || "CollectionPage",
    "@id": `${canonical}#webpage`,
    "url": canonical,
    "name": spec.name,
    "description": description,
    "isPartOf": { "@type": "WebSite", "@id": `${site.origin}#website`, "name": site.siteName, "url": site.origin },
    ...(spec.schemaExtra || {}),
    ...(listing.articles.length ? {
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": listing.articles.map((a, i) => ({
          "@type": "ListItem", "position": offset + i + 1,
          "url": site.url(`/en/news/${a.slug}`), "name": a.title
        }))
      }
    } : {})
  };

  const noindex = listing.total === 0 || /noindex/i.test(spec.robots || "");
  const html = await renderer.render("news-section.html", {
    canonical,
    page_title: nrRender.esc(spec.name),
    page_description: nrRender.esc(spec.description || description),
    header_extra_html: spec.headerHtml || "",
    news_cards: cards,
    empty_state_html: empty,
    pagination_html: (spec.resultCountHtml || "") + nrRender.renderPagination(spec.basePath, page, totalPages, spec.queryString || ""),
    seo_title: spec.seoTitle || `${spec.name} | ${site.siteName}`,
    seo_description: description,
    robots: noindex ? "noindex, follow" : "index, follow"
  }, schema, [
    { label: "Home", url: "/en" },
    { label: "News", url: "/en/news" },
    ...(spec.crumbs || []),
    { label: spec.crumbLabel || spec.name, url: null }
  ]);

  return new Response(html, { headers: cacheHeaders() });
}

// News search v2 (flag news_search_v2): keyword + section / author / country / entity / type / date filters.
// Returns null when it cannot answer well (index not built yet) so the caller uses the existing page.
async function renderNewsSearch(request, env, flags, sp) {
  if (sp.q && !(await env.DB.prepare(`SELECT 1 AS x FROM news_search_docs LIMIT 1`).first())) return null;
  const url = new URL(request.url);
  const facets = await nrSearch.getSearchFacets(env.DB, env, { entityPages: !!flags.news_entity_pages });
  const qsParams = new URLSearchParams();
  for (const k of ["q", "section", "author", "country", "entity", "type", "from", "to"]) if (sp[k]) qsParams.set(k, sp[k]);
  const queryString = qsParams.toString();
  let shown = 0;
  return renderNewsCollection(request, env, {
    basePath: "/en/news", canonicalPath: "/en/news", queryString,
    name: sp.q ? `Search: ${sp.q}` : "Filtered news", crumbLabel: "Search",
    description: "", seoTitle: null, seoDescription: "Search the news archive.",
    robots: "noindex, follow", schemaType: "SearchResultsPage",   // result pages are never indexed
    emptyMessage: "No articles match your search.",
    headerHtml: nrRender.renderSearchForm({ params: sp, facets }),
    load: async ({ limit, offset }) => {
      const r = await nrSearch.searchNews(env.DB, { ...sp, page: Math.floor(offset / limit) + 1 }, { mode: "public", pageSize: limit });
      shown = r.total;
      return r.ok ? { articles: r.articles, total: r.total } : { articles: [], total: 0 };
    },
    get resultCountHtml() { return `<p class="nr-search__count" role="status">${shown} ${shown === 1 ? "result" : "results"}</p>`; }
  });
}

async function renderNewsSection(request, env, slug) {
  const section = await newsroom.getSectionBySlug(env.DB, slug);
  if (!section) return null;
  const ids = await newsroom.getSectionIds(env.DB, section.id);
  return renderNewsCollection(request, env, {
    basePath: `/en/news/${section.slug}`, name: section.name, description: section.description,
    seoTitle: section.seo_title, seoDescription: section.seo_description,
    load: (p) => newsroom.getSectionArticles(env.DB, ids, p)
  });
}

async function renderNewsRegion(request, env, slug) {
  const region = await newsroom.getRegionBySlug(env.DB, slug);
  if (!region) return null;
  return renderNewsCollection(request, env, {
    basePath: `/en/news/${region.slug}`, name: region.name,
    description: `${region.name} iGaming news and regulation.`,
    load: (p) => newsroom.getRegionArticles(env.DB, region.slug, p)
  });
}

async function renderNewsCountry(request, env, slug) {
  const country = await newsroom.getCountryBySlug(env.DB, slug);
  if (!country) return null;
  if (country.isAlias) {   // one indexable URL per country
    return new Response(null, { status: 301, headers: { Location: `/en/news/${country.canonical}`, "Cache-Control": "public, max-age=3600" } });
  }
  return renderNewsCollection(request, env, {
    basePath: `/en/news/${country.canonical}`, name: country.name,
    description: `Gambling industry news from ${country.name}.`,
    seoTitle: country.seo_title || null, seoDescription: null, robots: country.robots || "",
    load: (p) => newsroom.getCountryArticles(env.DB, country.code, p)
  });
}

// Two-segment pages: /en/news/topic/<slug>, /en/news/entity/<slug>, /en/news/series/<slug>
export async function renderNewsTaxonomyPage(request, env, kind, slug) {
  try {
    const flags = await newsroom.getNewsFlags(env.DB);
    if (kind === "entity" ? !flags.news_entity_pages : !flags.news_new_taxonomy) return render404(request, env);

    if (kind === "topic") {
      const t = await newsroom.getTopicBySlug(env.DB, slug);
      if (!t) return render404(request, env);
      return renderNewsCollection(request, env, {
        basePath: `/en/news/topic/${t.slug}`, name: t.name, description: t.description,
        seoTitle: t.seo_title, seoDescription: t.seo_description,
        load: (p) => newsroom.getTopicArticles(env.DB, t.id, p)
      });
    }
    if (kind === "series") {
      const s = await newsroom.getSeriesBySlug(env.DB, slug);
      if (!s) return render404(request, env);
      return renderNewsCollection(request, env, {
        basePath: `/en/news/series/${s.slug}`, name: s.name, description: s.description,
        seoTitle: s.seo_title, seoDescription: s.seo_description,
        load: (p) => newsroom.getSeriesArticles(env.DB, s.id, p),
        renderCard: (a, n) => `<div class="nr-series-part"><p class="nr-part">Part ${n}</p>${nrRender.renderArticleCard(a, formatDate)}</div>`
      });
    }
    if (kind === "entity") {
      const e = await newsroom.getEntityBySlug(env.DB, slug);
      if (!e) return render404(request, env);
      return renderNewsCollection(request, env, {
        basePath: `/en/news/entity/${e.slug}`, name: e.name, description: e.description,
        seoTitle: e.seo_title, seoDescription: e.seo_description,
        headerHtml: nrRender.renderEntityAbout(e),
        schemaExtra: { about: nrRender.entitySchema(e) },
        load: (p) => newsroom.getEntityArticles(env.DB, e.id, p)
      });
    }
  } catch (err) {
    console.error("News taxonomy page failed:", kind, err.message);
  }
  return render404(request, env);
}

export async function renderNews(request, env, slug, ctx = null) {
  const article = await news.getNews(env.DB, slug);
  if (!article) return renderNewsSectionOr404(request, env, slug, { allowRedirect: true });

  // Security: only render published, currently-live articles publicly
  if (!article.published || Number(article.published) !== 1) {
    return renderNewsSectionOr404(request, env, slug);
  }

  // Security: respect scheduled publishing — hide articles whose published_at is in the future
  if (article.published_at) {
    const pubDate = new Date(article.published_at);
    if (!Number.isNaN(pubDate.getTime()) && pubDate > new Date()) {
      return renderNewsSectionOr404(request, env, slug);
    }
  }

  // Analytics (Phase: page-view instrumentation). Placed after the
  // published/scheduled guards above so an unpublished or not-yet-live
  // article being probed never generates a CONTENT_VIEW row -- same
  // reasoning as why those guards return 404 rather than the real
  // content. No geoEngine.process() call, same as renderReview: news
  // articles don't evaluate a GEO access rule, so this uses the free
  // edge-provided country/city directly instead of adding a computation
  // to the render path purely to feed analytics.
  if (ctx && typeof ctx.waitUntil === 'function') {
    // Optional enrichment (flag news_analytics_enrichment, off by default): bot flag,
    // device class and UTM parameters, so crawlers stop counting as readers.
    // The flag read is cached (30 s) and shared with the newsroom loaders below.
    let enrich = {};
    try {
      if ((await newsroom.getNewsFlags(env.DB)).news_analytics_enrichment) enrich = nrAnalytics.enrichNewsView(request);
    } catch { /* recording extra fields is best-effort */ }
    ctx.waitUntil(
      logAnalyticsEvent(env.DB, {
        eventType: 'CONTENT_VIEW',
        newsId: article.id,
        countryCode: request.cf?.country || null,
        city: request.cf?.city || null,
        referrer: request.headers.get('referer') || null,
        landingPage: `/en/news/${slug}`,
        ...enrich
      }).catch(() => {})
    );
  }

  const renderer = new Renderer(env, request);

  // ── Related news by shared tags ──────────────────────
  const relatedNewsPromise = (async () => {
    if (!article.tags) return "";
    try {
      const related = await news.getRelatedNews(env.DB, article.slug, article.tags, 3);
      if (related.length === 0) return "";
      return related.map(item => {
        const img = item.featured_image_url || item.featured_image_thumbnail || "";
        const imgHtml = img
          ? `<div style="aspect-ratio:16/9;overflow:hidden;border-radius:8px"><img src="${escapeHtml(img)}" alt="${escapeHtml(safeAlt(item.featured_image_alt, item.title))}" style="width:100%;height:100%;object-fit:cover" loading="lazy" decoding="async"></div>`
          : "";
        const date = item.published_at || item.created_at;
        return `
            <article style="overflow:hidden;border:1px solid var(--light-gray);border-radius:10px;background:var(--white);transition:transform 0.2s,box-shadow 0.2s">
              <a href="/en/news/${encodeURIComponent(item.slug)}" style="display:block;color:inherit;text-decoration:none">
                ${imgHtml}
                <div style="padding:14px">
                  ${date ? `<time style="display:block;margin-bottom:6px;color:var(--gray);font-size:12px">${escapeHtml(formatDate(date))}</time>` : ""}
                  <h3 style="margin:0 0 6px;font-size:16px;line-height:1.3;color:var(--dark)">${escapeHtml(item.title)}</h3>
                  ${item.excerpt ? `<p style="margin:0;color:var(--gray);font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(item.excerpt)}</p>` : ""}
                </div>
              </a>
            </article>
          `;
      }).join("");
    } catch (e) {
      console.error("Related news error:", e.message);
      return "";
    }
  })();

  // These are all independent of each other, so run them concurrently.
  const [site, author, allComponents, dynamicSeo, relatedNewsHtml, displayContent, newsroomData] = await Promise.all([
    getSiteContext(request, env),
    article.author_id ? authors.getAuthorById(env.DB, article.author_id) : Promise.resolve(null),
    renderer.renderAllComponents("news", slug, ctx),
    renderer.loadDynamicSeo("news", slug),
    relatedNewsPromise,
    injectInlineAds(article.content || "", env, request, "news").catch(e => {
      console.error("Inline ad injection error:", e.message);
      return article.content || "";
    }),
    // Newsroom layer: null (and zero extra queries beyond a cached flag read)
    // unless a newsroom feature flag is on. Never fails the page.
    nrTrust.loadNewsroomForArticle(env.DB, article)
      .catch(e => { console.error("Newsroom load failed:", e.message); return null; }),
  ]);

  const canonical = dynamicSeo.canonical || site.url(`/en/news/${article.slug}`);

  const publishedDate = article.published_at || article.created_at;
  const modifiedDate = article.updated_at || publishedDate;
  const publishedIso = toIsoDate(publishedDate);
  const modifiedIso = toIsoDate(modifiedDate);
  const publishedDisplay = formatDate(publishedDate);
  const modifiedDisplay = formatDate(modifiedDate);

  const cleanContent = stripHtml(article.content || "");
  const description = dynamicSeo.seo_description || article.seo_description || article.excerpt || truncateText(article.content, 160);

  const articleAuthorName = author?.name || article.author || site.siteName;
  const featuredImage = article.featured_image_url || article.featured_image_thumbnail || "";
  const featuredImageAlt = safeAlt(article.featured_image_alt, article.title);

  // ── Social image: dedicated OG Image -> Featured Image -> site default ──
  // The News Dashboard lets an editor set an OG Image independently of the
  // Featured Image; when it's empty, the visible Featured Image is reused
  // for sharing instead of falling straight through to the site logo.
  const socialImageRaw = article.og_image_url || featuredImage || "";
  const socialImage = socialImageRaw ? site.url(socialImageRaw) : site.ogImageUrl;
  const socialImageAlt = article.og_image_url
    ? safeAlt(article.og_image_alt, article.title)
    : featuredImageAlt;
  // Only emit width/height when the selected social image's real
  // dimensions are known from the stored media record — never a guessed
  // 1200x675 for an image whose actual size we don't have.
  const socialImageWidth = article.og_image_url ? article.og_image_width : article.featured_image_width;
  const socialImageHeight = article.og_image_url ? article.og_image_height : article.featured_image_height;

  // Build author HTML in the controller — avoids template {{else}} issues
  let authorHtml = "";
  if (articleAuthorName) {
    const avatarHtml = (author?.avatar_url || article.author_avatar)
      ? `<img src="${escapeHtml(author?.avatar_url || article.author_avatar)}" alt="${escapeHtml(articleAuthorName)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">`
      : "";
    const nameHtml = (author?.slug || article.author_slug)
      ? `<a href="/en/author/${escapeHtml(author?.slug || article.author_slug)}" style="font-weight:700;text-decoration:none">${escapeHtml(articleAuthorName)}</a>`
      : `<strong>${escapeHtml(articleAuthorName)}</strong>`;
    // With the newsroom taxonomy flag on, prefer the author's job title (Senior Editor, Correspondent, ...).
    const displayRole = (newsroomData?.flags?.news_new_taxonomy && author?.job_title) || author?.role || article.author_role;
    const roleHtml = displayRole
      ? `<span style="color:var(--gray);font-size:12px;display:block">${escapeHtml(displayRole)}</span>`
      : "";
    authorHtml = `
      <div style="display:flex;align-items:center;gap:10px">
        ${avatarHtml}
        <div>
          <span style="color:var(--gray);font-size:12px">By</span><br>
          ${nameHtml}
          ${roleHtml}
        </div>
      </div>
    `;
  }


  // ── Tags as clickable links ──────────────────────────
  let tagsHtml = "";
  if (article.tags) {
    tagsHtml = String(article.tags)
      .split(",")
      .map(t => t.trim())
      .filter(Boolean)
      .map(tag => {
        const escaped = escapeHtml(tag);
        return `<a href="/en/news?tag=${encodeURIComponent(tag)}" class="news-tag" rel="tag" style="display:inline-block;padding:7px 14px;border-radius:999px;background:var(--bg);border:1px solid var(--light-gray);color:var(--dark);font-size:13px;font-weight:500;text-decoration:none;transition:all 0.2s">${escaped}</a>`;
      })
      .join("");
  }

  const wordCount = cleanContent ? cleanContent.split(/\s+/).filter(Boolean).length : 0;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${canonical}#newsarticle`,
    "url": canonical,
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
    "headline": article.title,
    "description": description,
    ...(featuredImage ? { "image": [featuredImage] } : {}),
    "datePublished": publishedIso,
    "dateModified": modifiedIso,
    "author": {
      "@type": "Person",
      "name": articleAuthorName,
      ...(author?.slug ? { "url": site.url(`/en/author/${author.slug}`) } : {}),
      ...(author?.avatar_url ? { "image": author.avatar_url } : {})
    },
    "publisher": {
      "@type": "Organization",
      "name": site.siteName,
      "url": site.origin,
      ...(site.logoUrl ? { "logo": { "@type": "ImageObject", "url": site.logoUrl } } : {})
    },
    "articleBody": cleanContent,
    "wordCount": wordCount,
    "articleSection": "News",
    "inLanguage": "en",
    ...(article.tags ? { "keywords": article.tags } : {})
  };

  let nrBlocks = { kicker_html: "", notice_html: "", timeline_html: "", after_html: "", related_html: "", schema: {} };
  try {
    if (newsroomData?.extras) {
      nrBlocks = nrRender.buildNewsroomBlocks({
        article, extras: newsroomData.extras, flags: newsroomData.flags,
        siteName: site.siteName, formatDate, policyLinks: newsroomData.policyLinks
      });
    }
  } catch (e) {
    console.error("Newsroom blocks failed (page renders without them):", e.message);
  }
  Object.assign(articleSchema, nrBlocks.schema);

  let articleCrumbs = buildBreadcrumbs("news", { title: article.title });
  const nrSection = newsroomData?.flags?.news_new_taxonomy ? newsroomData.extras?.section : null;
  if (nrSection && articleCrumbs.length > 1) {
    articleCrumbs = [
      ...articleCrumbs.slice(0, -1),
      { label: nrSection.name, url: `/en/news/${nrSection.slug}` },
      articleCrumbs[articleCrumbs.length - 1]
    ];
  }

  const html = await renderer.render("news.html", {
    ...article,
    // The template engine does not HTML-escape {{vars}}; escape the ones the
    // article template puts in text/attribute positions.
    title: escapeHtml(article.title),
    newsroom_kicker_html: nrBlocks.kicker_html,
    newsroom_notice_html: nrBlocks.notice_html,
    newsroom_timeline_html: nrBlocks.timeline_html,
    newsroom_after_html: nrBlocks.after_html,
    newsroom_discovery_html: nrBlocks.discovery_html,
    newsroom_related_html: nrBlocks.related_html,
    canonical,
    seo_title: dynamicSeo.seo_title || article.seo_title || article.title,
    seo_description: description,
    seo_keywords: dynamicSeo.seo_keywords || article.seo_keywords || "",
    og_type: "article",
    og_image: socialImage,
    og_image_alt: socialImageAlt,
    ...(socialImageWidth ? { og_image_width: socialImageWidth } : {}),
    ...(socialImageHeight ? { og_image_height: socialImageHeight } : {}),
    author_name: author?.name || article.author || "",
    author_avatar: author?.avatar_url || "",
    author_role: author?.role || "",
    author_slug: author?.slug || "",
    author_html: authorHtml,
    featured_image_url: escapeHtml(featuredImage),
    featured_image_alt: escapeHtml(featuredImageAlt),
    featured_image_caption: escapeHtml(article.featured_image_caption || ""),
    published_at: publishedDisplay,
    updated_at: modifiedDisplay,
    tags_html: tagsHtml,
    related_news_html: relatedNewsHtml,
    content: displayContent,
    components_top: allComponents.top,
    components_content_top: allComponents.content_top,
    components_content_bottom: allComponents.content_bottom,
    components_bottom: allComponents.bottom,
    components_sidebar: allComponents.sidebar
  }, articleSchema, articleCrumbs);

  return new Response(html, { headers: cacheHeaders() });
}

// News homepage v2 (flag news_v2_homepage). Only for the plain /en/news view;
// search and tag views keep the existing page. Returns null on any failure so
// the caller falls back to the existing page.
async function renderNewsHome(request, env, flags, renderer) {
  const [site, data, allComponents, dynamicSeo] = await Promise.all([
    getSiteContext(request, env),
    nrHome.loadHomepage(env.DB, env, flags),
    renderer.renderAllComponents("news_list", "news_list"),
    renderer.loadDynamicSeo("news_list", "news_list"),
  ]);

  const pageTitle = "News";
  const pageDescription = `Latest iGaming industry news and updates from ${site.siteName}.`;
  const canonical = dynamicSeo.canonical || site.url("/en/news");
  const items = [data.lead, ...data.latest].filter(Boolean);

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#webpage`,
    "url": canonical,
    "name": pageTitle,
    "description": pageDescription,
    "isPartOf": { "@type": "WebSite", "@id": `${site.origin}#website`, "name": site.siteName, "url": site.origin },
    ...(items.length ? {
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": items.map((a, i) => ({
          "@type": "ListItem", "position": i + 1, "url": site.url(`/en/news/${a.slug}`), "name": a.title
        }))
      }
    } : {})
  };

  const html = await renderer.render("news-home.html", {
    canonical,
    page_title: escapeHtml(pageTitle),
    page_description: escapeHtml(pageDescription),
    home_html: nrHome.renderHomepage(data, formatDate),
    components_top: allComponents.top,
    components_bottom: allComponents.bottom,
    seo_title: dynamicSeo.seo_title || `${pageTitle} | ${site.siteName}`,
    seo_description: dynamicSeo.seo_description || pageDescription,
    seo_keywords: dynamicSeo.seo_keywords || "",
    robots: items.length ? "index, follow" : "noindex, follow"
  }, listSchema, buildBreadcrumbs("newsList"));

  return new Response(html, { headers: cacheHeaders() });
}

export async function renderNewsList(request, env) {
  const renderer = new Renderer(env, request);

  const url = new URL(request.url);
  const searchQuery = (url.searchParams.get("q") || "").trim();
  const tagFilter = (url.searchParams.get("tag") || "").trim();

  // Search v2 (flag news_search_v2): any of q / section / author / country / entity / type / from / to.
  const searchParams = nrSearch.parseSearchParams(url.searchParams);
  if (!tagFilter && nrSearch.hasSearchFilters(searchParams)) {
    try {
      const flags = await newsroom.getNewsFlags(env.DB);
      if (flags.news_search_v2) {
        const res = await renderNewsSearch(request, env, flags, searchParams);
        if (res) return res;
      }
    } catch (e) {
      console.error("News search v2 failed, using the existing search:", e.message);
    }
  }

  if (!searchQuery && !tagFilter && !nrSearch.hasSearchFilters(searchParams)) {
    try {
      const flags = await newsroom.getNewsFlags(env.DB);
      if (flags.news_v2_homepage) return await renderNewsHome(request, env, flags, renderer);
    } catch (e) {
      console.error("News homepage v2 failed, using the existing page:", e.message);
    }
  }

  const newsListPromise = searchQuery
    ? news.searchNews(env.DB, searchQuery, 50)
    : tagFilter
      ? news.getNewsByTag(env.DB, tagFilter, 50)
      : news.getAllNews(env.DB);

  // Independent of each other — fetch concurrently.
  const [site, newsList, allComponents, dynamicSeo] = await Promise.all([
    getSiteContext(request, env),
    newsListPromise,
    renderer.renderAllComponents("news_list", "news_list"),
    renderer.loadDynamicSeo("news_list", "news_list"),
  ]);

  let pageTitle = "News";
  let pageDescription = `Latest iGaming industry news and updates from ${site.siteName}.`;
  if (searchQuery) {
    pageTitle = `Search: ${searchQuery}`;
    pageDescription = `Search results for "${searchQuery}" — ${site.siteName} News.`;
  } else if (tagFilter) {
    pageTitle = `Tag: ${tagFilter}`;
    pageDescription = `News articles tagged with "${tagFilter}" — ${site.siteName}.`;
  }

  const newsListUrl = dynamicSeo.canonical || site.url("/en/news");

  // ── Render news cards with featured images, excerpts, tags ──
  const newsCards = newsList.map(article => {
    const image = article.featured_image_url || article.featured_image_thumbnail || "";
    const excerpt = article.excerpt || truncateText(stripHtml(article.content || ""), 150);
    const date = article.published_at || article.created_at;

    const imageHtml = image
      ? `<div style="aspect-ratio:16/9;overflow:hidden"><img src="${escapeHtml(image)}" alt="${escapeHtml(safeAlt(article.featured_image_alt, article.title))}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s" loading="lazy" decoding="async"></div>`
      : `<div style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--gray);font-size:13px">No image</div>`;

    const authorHtml = article.author_name
      ? `<div style="display:flex;align-items:center;gap:8px;color:var(--gray);font-size:13px;margin-top:12px">${article.author_avatar ? `<img src="${escapeHtml(article.author_avatar)}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover" loading="lazy">` : ""}<span>${escapeHtml(article.author_name)}</span></div>`
      : "";

    // Tags as small chips (max 3)
    const tagsHtml = article.tags
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${String(article.tags).split(",").map(t => t.trim()).filter(Boolean).slice(0, 3).map(t => `<a href="/en/news?tag=${encodeURIComponent(t)}" style="display:inline-block;padding:3px 9px;border-radius:999px;background:var(--bg);color:var(--gray);font-size:12px;text-decoration:none">${escapeHtml(t)}</a>`).join("")}</div>`
      : "";

    return `
      <article style="overflow:hidden;border:1px solid var(--light-gray);border-radius:12px;background:var(--white);transition:transform 0.2s,box-shadow 0.2s;display:flex;flex-direction:column">
        <a href="/en/news/${encodeURIComponent(article.slug)}" style="display:block;color:inherit;text-decoration:none">
          ${imageHtml}
          <div style="padding:20px;flex:1;display:flex;flex-direction:column">
            ${date ? `<time style="color:var(--gray);font-size:13px;margin-bottom:8px" datetime="${toIsoDate(date)}">${escapeHtml(formatDate(date))}</time>` : ""}
            <h3 style="margin:0 0 10px;font-size:21px;line-height:1.25;color:var(--dark)">${escapeHtml(article.title)}</h3>
            ${excerpt ? `<p style="margin:0 0 12px;color:var(--gray);font-size:15px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(excerpt)}</p>` : ""}
            ${tagsHtml}
            ${authorHtml}
          </div>
        </a>
      </article>
    `;
  }).join("");

  const hasResults = newsList.length > 0;

  const emptyStateHtml = hasResults ? "" : `
    <div style="text-align:center;padding:60px 20px;color:var(--gray)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="margin-bottom:16px;opacity:0.4">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <h2 style="margin:0 0 8px;font-size:22px;color:var(--dark)">No articles found</h2>
      <p style="margin:0 0 20px">Try a different search term or browse all news.</p>
      <a href="/en/news" class="btn btn--ghost">View All News</a>
    </div>
  `;

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${newsListUrl}#webpage`,
    "url": newsListUrl,
    "name": pageTitle,
    "description": pageDescription,
    "isPartOf": {
      "@type": "WebSite",
      "@id": `${site.origin}#website`,
      "name": site.siteName,
      "url": site.origin
    },
    ...(hasResults ? {
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": newsList.map((article, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": site.url(`/en/news/${article.slug}`),
          "name": article.title
        }))
      }
    } : {})
  };

  const html = await renderer.render("news-list.html", {
    canonical: newsListUrl,
    // {{vars}} are not escaped by the template engine and pageTitle/pageDescription
    // embed the ?q= / ?tag= query values (reflected XSS otherwise).
    page_title: escapeHtml(pageTitle),
    page_description: escapeHtml(pageDescription),
    news_cards: newsCards,
    empty_state_html: emptyStateHtml,
    search_query: escapeHtml(searchQuery),
    tag_filter: escapeHtml(tagFilter),
    seo_title: dynamicSeo.seo_title || `${pageTitle} | ${site.siteName}`,
    seo_description: dynamicSeo.seo_description || pageDescription,
    seo_keywords: dynamicSeo.seo_keywords || "",
    components_top: allComponents.top,
    components_content_top: allComponents.content_top,
    components_content_bottom: allComponents.content_bottom,
    components_bottom: allComponents.bottom,
    components_sidebar: allComponents.sidebar
  }, listSchema, buildBreadcrumbs("newsList"));

  return new Response(html, { headers: cacheHeaders() });
}
