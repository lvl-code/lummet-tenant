// =====================================================
// LEVELCASINO API v1
// Cloudflare Worker Controller Layer
// =====================================================
import * as authorsDB from "./database/authors.js";
import * as casinos from "./database/casinos.js";
import * as reviews from "./database/reviews.js";
import * as pages from "./database/pages.js";
import * as geo from "./database/geo.js";
import * as settings from "./database/settings.js";
import * as ai from "./database/ai.js";
import * as categories from "./database/categories.js";
import * as news from "./database/news.js";
import {
  login,
  logout,
  register
}
from "./auth.js";
import { dashboardStatsAPI } from "./controllers.js";
import { aiEngine } from "./ai.js";
import * as componentsDB from "./database/components.js";
import * as reviewBlocksDB from "./database/review_blocks.js";
import * as seoMetaDB from "./database/seo_meta.js";
// =====================================================
// MAIN API HANDLER
// =====================================================

export async function handleAPI(
  request,
  env,
  path,
  user = null
) {

  // ----------------------------------
  // Require Login
  // ----------------------------------
  if(path === "/api/v1/auth/login"){
  return login(request,env);
}

if (path === "/api/v1/auth/register") {
  return register(request, env);
}

if(path === "/api/v1/auth/logout"){
  return logout(request,env);
}


if (path === "/api/v1/geo/check") {  
  const url = new URL(request.url);  
  const slug = url.searchParams.get("slug");  
  if (!slug) return failure("slug is required");  
  
  const country = request.cf?.country || "RW";  
    
  // Get ALL rules for this casino  
  const allRules = await env.DB.prepare(`  
    SELECT country_code, status FROM geo_rules  
    WHERE casino_slug = ?  
  `).bind(slug).all();  
    
  const rules = allRules.results || [];  
    
  // Check if this specific country has a rule  
  const countryRule = rules.find(r => r.country_code === country);  
    
  let status;  
  if (countryRule) {  
    status = countryRule.status;  
  } else if (rules.length === 0) {  
    // No rules at all → blocked  
    status = "blocked";  
  } else {  
    // No rule for this country — infer  
    const hasAllowed = rules.some(r => r.status === "allowed");  
    const hasBlocked = rules.some(r => r.status === "blocked");  
      
    if (hasAllowed && !hasBlocked) {  
      status = "blocked"; // Allowlist mode → blocked  
    } else if (hasBlocked && !hasAllowed) {  
      status = "allowed"; // Blocklist mode → allowed  
    } else {  
      status = "blocked"; // Mixed → blocked  
    }  
  }  
  
  const COUNTRY_NAMES = {RW:"Rwanda",US:"United States",CA:"Canada",GB:"United Kingdom",DE:"Germany",FR:"France",IT:"Italy",ES:"Spain",NL:"Netherlands",AU:"Australia",NZ:"New Zealand",JP:"Japan",CN:"China",IN:"India",BR:"Brazil",MX:"Mexico",ZA:"South Africa",NG:"Nigeria",KE:"Kenya",EG:"Egypt",SE:"Sweden",NO:"Norway",DK:"Denmark",FI:"Finland",PL:"Poland",PT:"Portugal",GR:"Greece",TR:"Turkey",RU:"Russia",UA:"Ukraine",AE:"United Arab Emirates",SA:"Saudi Arabia",QA:"Qatar",KR:"South Korea",TH:"Thailand",VN:"Vietnam",PH:"Philippines",ID:"Indonesia",MY:"Malaysia",SG:"Singapore",AR:"Argentina",CL:"Chile",CO:"Colombia",PE:"Peru",AT:"Austria",CH:"Switzerland",IE:"Ireland",BE:"Belgium",CZ:"Czech Republic",HU:"Hungary",RO:"Romania",BG:"Bulgaria",HR:"Croatia",MT:"Malta",CY:"Cyprus",LU:"Luxembourg",IS:"Iceland"};
  return json({
    status,
    country,
    countryName: COUNTRY_NAMES[country] || country,
    bonusOverride: countryRule?.bonus_override || null
  }); 
}  
  // One-time admin bootstrap — DELETE after first use
  if (path === "/api/v1/setup/admin" && request.method === "POST") {
    const body = await request.json();
    if (!body.email || !body.password) {
      return failure("Email and password required");
    }
    const existing = await env.DB.prepare(
      "SELECT COUNT(*) c FROM users WHERE role = 'admin'"
    ).first();
    if (existing.c > 0) {
      return failure("Admin already exists. Remove this endpoint for security.", 403);
    }
    const { hashPassword } = await import("./auth.js");
    const hash = await hashPassword(body.password);
    await env.DB.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')"
    ).bind(body.email, hash).run();
    return json({ success: true, message: "Admin created. Remove this endpoint now." });
  }

if (path === "/api/v1/public/reviews/list") {
  const result = await env.DB.prepare(`
    SELECT r.*, c.name as casino_name, c.logo as casino_logo
    FROM reviews r
    LEFT JOIN casinos c ON c.slug = r.casino_slug
    WHERE r.published = 1
    ORDER BY r.created_at DESC
  `).all();
  return json({ reviews: result.results });
}

if (path === "/api/v1/public/casino-reviews") {
  const url = new URL(request.url);
  const casinoSlug = url.searchParams.get("casino_slug");
  if (!casinoSlug) return json({ reviews: [] });
  const result = await env.DB.prepare(`
    SELECT * FROM reviews
    WHERE casino_slug = ? AND published = 1
    ORDER BY created_at DESC
  `).bind(casinoSlug).all();
  return json({ reviews: result.results });
}

  // Add this BEFORE the auth check, around line 30-40
if (path === "/api/v1/public/casinos/list") {
  const casinos = await env.DB.prepare(`
    SELECT slug, name, logo, rating FROM casinos
    WHERE published = 1 AND status = 'published'
    ORDER BY featured DESC, sort_order ASC, rating DESC
  `).all();
  return json({ casinos: casinos.results });
}
if (path === "/api/v1/public/news/list") {
  const result = await env.DB.prepare(`
    SELECT *
    FROM news
    WHERE published = 1
    ORDER BY created_at DESC
  `).all();

  return json({ news: result.results });
}

if (path === "/api/v1/public/casinos/geo") {
  const country = request.cf?.country || "RW";
  const casinoList = await env.DB.prepare(`
    SELECT slug, name, logo, rating, bonus_title, bonus_value, website_url
    FROM casinos
    WHERE published = 1 AND status = 'published'
    ORDER BY featured DESC, sort_order ASC, rating DESC
  `).all();

  const casinos = casinoList.results || [];
  if (casinos.length === 0) return json({ casinos: [] });

  // Get all geo rules for these casinos
  const slugs = casinos.map(c => c.slug);
  const placeholders = slugs.map(() => '?').join(',');
  const rulesResult = await env.DB.prepare(`
    SELECT casino_slug, country_code, status FROM geo_rules
    WHERE casino_slug IN (${placeholders})
  `).bind(...slugs).all();

  const rulesByCasino = {};
  for (const row of (rulesResult.results || [])) {
    if (!rulesByCasino[row.casino_slug]) rulesByCasino[row.casino_slug] = [];
    rulesByCasino[row.casino_slug].push(row);
  }

  const geoCasinos = casinos.map(casino => {
    const rules = rulesByCasino[casino.slug] || [];
    let geoStatus = "blocked";

    if (rules.length === 0) {
      geoStatus = "blocked";
    } else {
      const countryRule = rules.find(r => r.country_code === country);
      if (countryRule) {
        geoStatus = countryRule.status;
      } else {
        const hasAllowed = rules.some(r => r.status === "allowed");
        const hasBlocked = rules.some(r => r.status === "blocked");
        if (hasAllowed && !hasBlocked) geoStatus = "blocked";
        else if (hasBlocked && !hasAllowed) geoStatus = "allowed";
        else geoStatus = "blocked";
      }
    }

    return { ...casino, geo_status: geoStatus };
  });
    // Geo-rank: available first (by rating desc), then unavailable (by rating desc)
  geoCasinos.sort((a, b) => {
    const aAvail = a.geo_status === "allowed" ? 1 : 0;
    const bAvail = b.geo_status === "allowed" ? 1 : 0;
    if (aAvail !== bAvail) return bAvail - aAvail;
    return (b.rating || 0) - (a.rating || 0);
  });

  return json({ casinos: geoCasinos, country });
}

if (path === "/api/v1/public/reviews/geo") {
  const country = request.cf?.country || "RW";
  const result = await env.DB.prepare(`
    SELECT r.*, c.name as casino_name, c.logo as casino_logo, c.slug as casino_slug
    FROM reviews r
    LEFT JOIN casinos c ON c.slug = r.casino_slug
    WHERE r.published = 1
    ORDER BY r.created_at DESC
  `).all();

  const reviews = result.results || [];
  if (reviews.length === 0) return json({ reviews: [] });

  // Get geo rules for all casinos referenced by reviews
  const casinoSlugs = [...new Set(reviews.filter(r => r.casino_slug).map(r => r.casino_slug))];
  if (casinoSlugs.length === 0) return json({ reviews, country });

  const placeholders = casinoSlugs.map(() => '?').join(',');
  const rulesResult = await env.DB.prepare(`
    SELECT casino_slug, country_code, status FROM geo_rules
    WHERE casino_slug IN (${placeholders})
  `).bind(...casinoSlugs).all();

  const rulesByCasino = {};
  for (const row of (rulesResult.results || [])) {
    if (!rulesByCasino[row.casino_slug]) rulesByCasino[row.casino_slug] = [];
    rulesByCasino[row.casino_slug].push(row);
  }

  const geoReviews = reviews.map(review => {
    if (!review.casino_slug) return { ...review, geo_status: "unknown" };
    const rules = rulesByCasino[review.casino_slug] || [];
    let geoStatus = "blocked";

    if (rules.length === 0) {
      geoStatus = "blocked";
    } else {
      const countryRule = rules.find(r => r.country_code === country);
      if (countryRule) {
        geoStatus = countryRule.status;
      } else {
        const hasAllowed = rules.some(r => r.status === "allowed");
        const hasBlocked = rules.some(r => r.status === "blocked");
        if (hasAllowed && !hasBlocked) geoStatus = "blocked";
        else if (hasBlocked && !hasAllowed) geoStatus = "allowed";
        else geoStatus = "blocked";
      }
    }

    return { ...review, geo_status: geoStatus };
  });
    // Geo-rank: available first (by rating desc), then unavailable (by rating desc)
  geoReviews.sort((a, b) => {
    const aAvail = a.geo_status === "allowed" ? 1 : 0;
    const bAvail = b.geo_status === "allowed" ? 1 : 0;
    if (aAvail !== bAvail) return bAvail - aAvail;
    return (b.rating || 0) - (a.rating || 0);
  });

  return json({ reviews: geoReviews, country });
}



  if (!user) {
    return failure("Unauthorized", 401);
  }
  const writeMethods = ["POST","PUT","DELETE"];

if(
  writeMethods.includes(request.method) &&
  user.role !== "admin"
){
  return json({
    success:false,
    error:"Forbidden"
  },403);
}
if (path === "/api/v1/dashboard") {
  return dashboardStatsAPI(request, env);
}


if (path === "/api/v1/old/geo/check") {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    if (!slug) return failure("slug is required");

    const country = request.cf?.country || "RW";
    const rule = await geo.getGeoRule(env.DB, slug, country);

    if (rule) {
      return json({
        status: rule.status,
        country,
        bonusOverride: rule.bonus_override || null
      });
    }

    return json({
      status: "allowed",
      country,
      bonusOverride: null
    });
  }

  try {

    // ==================================
    // CASINOS
    // ==================================

    if (
      path === "/api/v1/casino/create" &&
      request.method === "POST"
    ) {
      return createCasino(request, env);
    }

    if (
      path === "/api/v1/casino/update" &&
      request.method === "POST"
    ) {
      return updateCasino(request, env);
    }

    if (
      path === "/api/v1/casino/delete" &&
      request.method === "POST"
    ) {
      return deleteCasino(request, env);
    }

    if (path === "/api/v1/casinos/list") {
  const casinos = await env.DB.prepare(`
SELECT
  id,
  slug,
  name,
  rating,
  featured,
  sort_order,
  status,
  published
FROM casinos
ORDER BY
  featured DESC,
  sort_order ASC,
  rating DESC
`)
.all();

  return json({ casinos: casinos.results });
}

if (path === "/api/v1/casino/get") {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) return failure("slug is required");

  const casino = await env.DB.prepare(`
    SELECT *
    FROM casinos
    WHERE slug = ?
    LIMIT 1
  `).bind(slug).first();

  if (!casino) return failure("Casino not found",404);

  const categoryRows = await env.DB.prepare(`
    SELECT category_id
    FROM casino_categories
    WHERE casino_id = ?
  `).bind(casino.id).all();

  casino.category_ids = (categoryRows.results || []).map(r => r.category_id);

  return json({
    success: true,
    casino
  });
}

// ==================================
// READ ENDPOINTS (add to api.js route handler)
// ==================================

// List reviews
if (path === "/api/v1/reviews/list") {
  const result = await env.DB.prepare(`
    SELECT * FROM reviews WHERE published = 1 ORDER BY created_at DESC
  `).all();
  return json({ reviews: result.results });
}

// List news
if (path === "/api/v1/news/list") {
  const result = await env.DB.prepare(`
    SELECT * FROM news WHERE published = 1 ORDER BY created_at DESC
  `).all();
  return json({ news: result.results });
}
if (path === "/api/v1/pages/list") {
  const result = await env.DB.prepare(`
    SELECT * FROM pages ORDER BY created_at DESC
  `).all();
  return json({ pages: result.results });
}

// List categories
if (path === "/api/v1/categories/list") {
  const result = await env.DB.prepare(`
    SELECT * FROM categories ORDER BY name
  `).all();
  return json({ categories: result.results });
}

// List media
if (path === "/api/v1/media/list") {
  const result = await env.DB.prepare(`
    SELECT * FROM media ORDER BY created_at DESC
  `).all();
  return json({ media: result.results });
}

// Get settings
if (path === "/api/v1/settings/get") {
  const result = await env.DB.prepare(`
    SELECT key, value FROM settings
  `).all();
  const settings = {};
  for (const row of result.results) {
    settings[row.key] = row.value;
  }
  return json({ settings });
}

// Get stats (already exists but move here for consistency)
if (path === "/api/v1/stats") {
  const casinos = await env.DB.prepare("SELECT COUNT(*) c FROM casinos").first();
  const reviews = await env.DB.prepare("SELECT COUNT(*) c FROM reviews").first();
  const clicks = await env.DB.prepare("SELECT COUNT(*) c FROM clicks").first();
  const pages = await env.DB.prepare("SELECT COUNT(*) c FROM pages").first();
  return json({
    casinos: casinos.c,
    reviews: reviews.c,
    clicks: clicks.c,
    pages: pages.c
  });
}
if (path === "/api/v1/stats/top-casinos") {
    const result = await env.DB.prepare(`
      SELECT casino_slug, COUNT(*) as clicks
      FROM clicks
      GROUP BY casino_slug
      ORDER BY clicks DESC
      LIMIT 20
    `).all();
    return json({ casinos: result.results });
  }

  if (path === "/api/v1/stats/countries") {
    const result = await env.DB.prepare(`
      SELECT country_code, COUNT(*) as clicks
      FROM clicks
      GROUP BY country_code
      ORDER BY clicks DESC
      LIMIT 100
    `).all();
    return json({ countries: result.results });
  }

    // ==================================
// NEWS
// ==================================

if (
  path === "/api/v1/news/create" &&
  request.method === "POST"
) {
  return createNews(request, env);
}

if (
  path === "/api/v1/news/update" &&
  request.method === "POST"
) {
  return updateNews(request, env);
}

if (
  path === "/api/v1/news/delete" &&
  request.method === "POST"
) {
  return deleteNews(request, env);
}
    
    // ==================================
    // REVIEWS
    // ==================================

    if (
      path === "/api/v1/review/create" &&
      request.method === "POST"
    ) {
      return createReview(request, env);
    }

    if (
      path === "/api/v1/review/update" &&
      request.method === "POST"
    ) {
      return updateReview(request, env);
    }

    // ==================================
    // PAGES
    // ==================================

    if (
      path === "/api/v1/page/create" &&
      request.method === "POST"
    ) {
      return createPage(request, env);
    }

    if (
      path === "/api/v1/page/update" &&
      request.method === "POST"
    ) {
      return updatePage(request, env);
    }

    // ==================================
    // GEO RULES
    // ==================================

    if (
      path === "/api/v1/geo/save" &&
      request.method === "POST"
    ) {
      return saveGeoRule(request, env);
    }
        // ==================================
    // GEO RULES — BULK SYNC + LISTING
    // ==================================

    if (path === "/api/v1/geo/sync" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["casino_slug", "rules"]);
      const { setCasinoGeoRules } = await import("./database/geo.js");
      await setCasinoGeoRules(env.DB, body.casino_slug, body.rules);
      return success();
    }

    if (path === "/api/v1/geo/list" && request.method === "GET") {
      const url = new URL(request.url);
      const casinoSlug = url.searchParams.get("casino_slug");
      if (!casinoSlug) return failure("casino_slug is required");
      const { getGeoRulesForCasino } = await import("./database/geo.js");
      const rules = await getGeoRulesForCasino(env.DB, casinoSlug);
      return json({ rules });
    }


    // ==================================
    // AI REVIEW
    // ==================================

    if (
      path === "/api/v1/ai/review" &&
      request.method === "POST"
    ) {
      return generateReview(request, env);
    }


    // ==================================
    // SETTINGS
    // ==================================

    if (
      path === "/api/v1/settings/save" &&
      request.method === "POST"
    ) {
      return saveSettings(request, env);
    }

    // ==================================
    // CATEGORIES CRUD
    // ==================================

    if (path === "/api/v1/category/create" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug", "name"]);
      await categories.createCategory(env.DB, body);
      return success();
    }

    if (path === "/api/v1/category/update" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug", "name"]);
      const { updateCategory } = await import("./database/categories.js");
      await updateCategory(env.DB, body.slug, body);
      return success();
    }


    if (path === "/api/v1/category/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug"]);
      const { deleteCategory } = await import("./database/categories.js");
      await deleteCategory(env.DB, body.slug);
      return success();
    }



    // ==================================
    // COUNTRIES CRUD
    // ==================================
    if (path === "/api/v1/country/create" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["code", "name"]);
      const { createCountry } = await import("./database/countries.js");
      await createCountry(env.DB, body);
      return success();
    }

    if (path === "/api/v1/country/update" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["code", "name"]);
      const { updateCountry } = await import("./database/countries.js");
      await updateCountry(env.DB, body.code, body);
      return success();
    }

    if (path === "/api/v1/country/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["code"]);
      const { deleteCountry } = await import("./database/countries.js");
      await deleteCountry(env.DB, body.code);
      return success();
    }


    if (path === "/api/v1/countries/list") {
      const result = await env.DB.prepare("SELECT * FROM countries ORDER BY name").all();
      return json({ countries: result.results });
    }


    // ==================================
    // REVIEW DELETE + PAGE DELETE
    // ==================================

    if (path === "/api/v1/review/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug"]);
      const { deleteReview } = await import("./database/reviews.js");
      await deleteReview(env.DB, body.slug);
      return success();
    }

    if (path === "/api/v1/page/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug"]);
      const { deletePage } = await import("./database/pages.js");
      await deletePage(env.DB, body.slug);
      return success();
    }
    // ==================================
    // COMPONENTS CRUD
    // ==================================

    if (path === "/api/v1/components/list") {
      const url = new URL(request.url);
      const type = url.searchParams.get("type");
      const result = await componentsDB.getAllComponents(env.DB, type);
      return json({ components: result });
    }

    if (path === "/api/v1/component/get" && request.method === "GET") {
      const url = new URL(request.url);
      const id = parseInt(url.searchParams.get("id"));
      if (!id) return failure("id is required");
      const component = await componentsDB.getComponent(env.DB, id);
      if (!component) return failure("Component not found", 404);
      return json({ success: true, component });
    }

    if (path === "/api/v1/component/create" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["name", "type"]);
      const id = await componentsDB.createComponent(env.DB, body);
      return json({ success: true, id });
    }

    if (path === "/api/v1/component/update" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id", "name", "type"]);
      await componentsDB.updateComponent(env.DB, body.id, body);
      return success();
    }

    if (path === "/api/v1/component/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id"]);
      await componentsDB.deleteComponent(env.DB, body.id);
      return success();
    }

    // ==================================
    // PAGE-COMPONENT ASSIGNMENTS
    // ==================================

    if (path === "/api/v1/components/assign" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["page_type", "page_slug", "component_id"]);
      await componentsDB.assignComponentToPage(env.DB, body);
      return success();
    }

    if (path === "/api/v1/components/bulk-assign" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["page_type", "component_id"]);
      await componentsDB.bulkAssignComponent(env.DB, body);
      return success();
    }
    if (path === "/api/v1/components/unassign" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id"]);
      await componentsDB.removePageComponent(env.DB, body.id);
      return success();
    }

    if (path === "/api/v1/components/page" && request.method === "GET") {
      const url = new URL(request.url);
      const pageType = url.searchParams.get("page_type");
      const pageSlug = url.searchParams.get("page_slug");
      if (!pageType || !pageSlug) return failure("page_type and page_slug are required");
      const assignments = await componentsDB.getAllPageAssignments(env.DB, pageType, pageSlug);
      return json({ assignments });
    }

    if (path === "/api/v1/components/reorder" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["items"]);
      for (const item of body.items) {
        await componentsDB.updatePageComponentPosition(env.DB, item.id, item.position);
      }
      return success();
    }

    if (path === "/api/v1/components/toggle" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id", "enabled"]);
      await componentsDB.togglePageComponent(env.DB, body.id, body.enabled);
      return success();
    }

    if (path === "/api/v1/components/update-assignment" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id"]);
      await componentsDB.updatePageComponentAssignment(env.DB, body.id, body);
      return success();
    }


    // ==================================
    // REVIEW BLOCKS CRUD
    // ==================================

    if (path === "/api/v1/review-blocks/list" && request.method === "GET") {
      const url = new URL(request.url);
      const reviewSlug = url.searchParams.get("review_slug");
      if (!reviewSlug) return failure("review_slug is required");
      const blocks = await reviewBlocksDB.getReviewBlocks(env.DB, reviewSlug);
      return json({ blocks });
    }

    if (path === "/api/v1/review-blocks/create" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["review_slug", "title", "content"]);
      const id = await reviewBlocksDB.createReviewBlock(env.DB, body);
      return json({ success: true, id });
    }

    if (path === "/api/v1/review-blocks/update" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id", "title", "content"]);
      await reviewBlocksDB.updateReviewBlock(env.DB, body.id, body);
      return success();
    }

    if (path === "/api/v1/review-blocks/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id"]);
      await reviewBlocksDB.deleteReviewBlock(env.DB, body.id);
      return success();
    }

    if (path === "/api/v1/review-blocks/sync" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["review_slug", "blocks"]);
      await reviewBlocksDB.syncReviewBlocks(env.DB, body.review_slug, body.blocks);
      return success();
    }

    // ==================================
    // SEO META CRUD
    // ==================================

    if (path === "/api/v1/seo/list") {
      const result = await seoMetaDB.getAllSeoMeta(env.DB);
      return json({ seo: result });
    }

    if (path === "/api/v1/seo/get" && request.method === "GET") {
      const url = new URL(request.url);
      const pageType = url.searchParams.get("page_type");
      const pageSlug = url.searchParams.get("page_slug");
      if (!pageType || !pageSlug) return failure("page_type and page_slug are required");
      const seo = await seoMetaDB.getSeoMeta(env.DB, pageType, pageSlug);
      return json({ seo: seo || null });
    }

    if (path === "/api/v1/seo/save" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["page_type", "page_slug"]);
      await seoMetaDB.upsertSeoMeta(env.DB, body);
      return success();
    }

    if (path === "/api/v1/seo/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["page_type", "page_slug"]);
      await seoMetaDB.deleteSeoMeta(env.DB, body.page_type, body.page_slug);
      return success();
    }
    // ==================================
    // AUTHORS CRUD
    // ==================================

    if (path === "/api/v1/authors/list") {
      const result = await authorsDB.getAllAuthorsAdmin(env.DB);
      return json({ authors: result });
    }

    if (path === "/api/v1/author/get" && request.method === "GET") {
      const url = new URL(request.url);
      const id = parseInt(url.searchParams.get("id"));
      if (!id) return failure("id is required");
      const author = await authorsDB.getAuthorById(env.DB, id);
      if (!author) return failure("Author not found", 404);
      return json({ success: true, author });
    }

    if (path === "/api/v1/author/create" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug", "name"]);
      const id = await authorsDB.createAuthor(env.DB, body);
      return json({ success: true, id });
    }

    if (path === "/api/v1/author/update" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id", "slug", "name"]);
      await authorsDB.updateAuthor(env.DB, body.id, body);
      return success();
    }

    if (path === "/api/v1/author/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["id"]);
      await authorsDB.deleteAuthor(env.DB, body.id);
      return success();
    }

    if (path === "/api/v1/author/content" && request.method === "GET") {
      const url = new URL(request.url);
      const id = parseInt(url.searchParams.get("id"));
      if (!id) return failure("id is required");
      const content = await authorsDB.getAuthorContent(env.DB, id);
      const stats = await authorsDB.getAuthorStats(env.DB, id);
      return json({ content, stats });
    }
        // ==================================
    // CATEGORY GET BY ID (for edit)
    // ==================================

    if (path === "/api/v1/category/get-by-id" && request.method === "GET") {
      const url = new URL(request.url);
      const id = parseInt(url.searchParams.get("id"));
      if (!id) return failure("id is required");
      const { getCategoryById } = await import("./database/categories.js");
      const category = await getCategoryById(env.DB, id);
      if (!category) return failure("Category not found", 404);
      return json({ success: true, category });
    }

    // ==================================
    // COUNTRY GET BY ID (for edit)
    // ==================================

    if (path === "/api/v1/country/get-by-id" && request.method === "GET") {
      const url = new URL(request.url);
      const id = parseInt(url.searchParams.get("id"));
      if (!id) return failure("id is required");
      const { getCountryById } = await import("./database/countries.js");
      const country = await getCountryById(env.DB, id);
      if (!country) return failure("Country not found", 404);
      return json({ success: true, country });
    }




    return json({
      success: false,
      error: "Endpoint not found"
    }, 404);

  } catch (error) {

    return json({
      success: false,
      error: error.message
    }, 500);

  }
}

// =====================================================
// HELPERS
// =====================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

function success(data = {}) {

    return json({
        success: true,
        ...data
    });

}

function failure(message, status = 400) {

    return json({
        success: false,
        error: message
    }, status);

}

function validate(body, required) {

    for (const field of required) {

        if (
            body[field] === undefined ||
            body[field] === null ||
            body[field] === ""
        ) {
            throw new Error(`${field} is required`);
        }

    }

}


// =====================================================
// CASINOS
// =====================================================

async function createCasino(request, env) {

  const body = await request.json();
  validate(body, [
    "slug",
    "name",
    "affiliate_url"
  ]);

  const casinoId = await casinos.createCasino(env.DB, body);
  if (Array.isArray(body.category_ids)) {
    await casinos.setCasinoCategories(
      env.DB,
      casinoId,
      body.category_ids
    );
  }
  return success();
}

async function updateCasino(request, env) {

  const body = await request.json();

  validate(body, [
    "slug",
    "name",
    "affiliate_url"
  ]);

  await casinos.updateCasino(
    env.DB,
    body.slug,
    body
  );

  const casinoId = await casinos.getCasinoIdBySlug(
    env.DB,
    body.slug
  );

  if (casinoId && Array.isArray(body.category_ids)) {
    await casinos.setCasinoCategories(
      env.DB,
      casinoId,
      body.category_ids
    );
  }
  return success();
}

async function deleteCasino(request, env) {
  const body = await request.json();
  validate(body, ["slug"]);
  await casinos.deleteCasino(
    env.DB,
    body.slug
  );

  return success();
}


// =====================================================
// REVIEWS
// =====================================================

async function createReview(request, env) {
  const body = await request.json();
  validate(body, ["slug", "title", "content", "casino_slug"]);
  await reviews.createReview(
    env.DB,
    body
  );

  return success();
}

async function updateReview(request, env) {
  const body = await request.json();
  validate(body, ["slug", "title", "content"]);
  await reviews.updateReview(
    env.DB,
    body.slug,
    body
  );

  return success();
}



// =====================================================
// PAGES
// =====================================================

async function createPage(request, env) {
  const body = await request.json();
  validate(body, ["slug", "type", "template", "title"]);
  await pages.createPage(
    env.DB,
    body
  );

  return success();
}

async function updatePage(request, env) {
  const body = await request.json();
  validate(body, ["slug", "title"]);
  await pages.updatePage(
    env.DB,
    body.slug,
    body
  );

  return success();
}


// =====================================================
// GEO RULES
// =====================================================

async function saveGeoRule(request, env) {
  const body = await request.json();
  validate(body, ["casino_slug", "country_code", "status"]);
  await geo.saveGeoRule(
    env.DB,
    body
  );

  return success();
}


// =====================================================
// SETTINGS
// =====================================================

async function saveSettings(request, env) {
  const body = await request.json();

  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    return failure("Settings object cannot be empty");
  }

  await settings.saveSettings(
    env.DB,
    body
  );

  return success();
}


// =====================================================
// AI REVIEW GENERATION
// =====================================================

async function generateReview(request, env) {
  const body = await request.json();
  validate(body, ["casino", "country", "slug"]);

  const content = await aiEngine.generateFullReview(
    env,
    body.casino,
    body.country,
    body.slug
  );

  await ai.logAIGeneration(
    env.DB,
    "review",
    body.slug,
    `Full review generation for ${body.casino} (${body.country})`,
    "@cf/meta/llama-3-8b-instruct"
  );

  return json({
    success: true,
    content
  });
}


// ==================================
// NEWS
// ==================================

async function createNews(request, env) {
  const body = await request.json();

  validate(body, [
    "slug",
    "title",
    "content"
  ]);

  await news.createNews(env.DB, body);

  return success();
}

async function updateNews(request, env) {
  const body = await request.json();

  validate(body, [
    "slug",
    "title",
    "content"
  ]);

  await news.updateNews(
    env.DB,
    body.slug,
    body
  );

  return success();
}

async function deleteNews(request, env) {
  const body = await request.json();

  validate(body, ["slug"]);

  await news.deleteNews(
    env.DB,
    body.slug
  );

  return success();
}


function requireAdmin(user) {
  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }
  return null;
}
