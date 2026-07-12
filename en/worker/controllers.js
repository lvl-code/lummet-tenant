import { Renderer } from "./render.js";
import * as categories from "./database/categories.js";
import * as casinos from "./database/casinos.js";
import * as reviews from "./database/reviews.js";
import * as pages from "./database/pages.js";
import * as countries from "./database/countries.js";
import * as news from "./database/news.js";
import { logClick }
from "./database/clicks.js";
import {
  getCurrentUser
} from "./auth.js";
import { getGeoRule } from "./database/geo.js";
import { geoEngine } from "./geo.js";


const COUNTRY_NAMES = {
  RW:"Rwanda",US:"United States",CA:"Canada",GB:"United Kingdom",DE:"Germany",
  FR:"France",IT:"Italy",ES:"Spain",NL:"Netherlands",AU:"Australia",
  NZ:"New Zealand",JP:"Japan",CN:"China",IN:"India",BR:"Brazil",MX:"Mexico",
  ZA:"South Africa",NG:"Nigeria",KE:"Kenya",EG:"Egypt",MA:"Morocco",
  GH:"Ghana",TZ:"Tanzania",UG:"Uganda",SE:"Sweden",NO:"Norway",DK:"Denmark",
  FI:"Finland",PL:"Poland",PT:"Portugal",GR:"Greece",TR:"Turkey",RU:"Russia",
  UA:"Ukraine",RO:"Romania",CZ:"Czech Republic",HU:"Hungary",SK:"Slovakia",
  BG:"Bulgaria",HR:"Croatia",RS:"Serbia",SI:"Slovenia",LT:"Lithuania",
  LV:"Latvia",EE:"Estonia",IE:"Ireland",BE:"Belgium",LU:"Luxembourg",
  AT:"Austria",CH:"Switzerland",IS:"Iceland",MT:"Malta",CY:"Cyprus",
  AE:"United Arab Emirates",SA:"Saudi Arabia",QA:"Qatar",KW:"Kuwait",
  BH:"Bahrain",OM:"Oman",JO:"Jordan",LB:"Lebanon",IL:"Israel",
  PK:"Pakistan",BD:"Bangladesh",LK:"Sri Lanka",TH:"Thailand",VN:"Vietnam",
  PH:"Philippines",ID:"Indonesia",MY:"Malaysia",SG:"Singapore",
  KR:"South Korea",HK:"Hong Kong",TW:"Taiwan",AR:"Argentina",CL:"Chile",
  CO:"Colombia",PE:"Peru",VE:"Venezuela",EC:"Ecuador",UY:"Uruguay",
  PY:"Paraguay",BO:"Bolivia",DO:"Dominican Republic",CR:"Costa Rica",
  PA:"Panama",GT:"Guatemala",HN:"Honduras",SV:"El Salvador",NI:"Nicaragua",
  CU:"Cuba",JM:"Jamaica",TT:"Trinidad and Tobago",BS:"Bahamas",BB:"Barbados",
};

function countryFullName(code) {
  return COUNTRY_NAMES[code] || code;
}



function buildBreadcrumbs(path, data = {}) {
  const crumbs = [{ label: "Home", url: "/en" }];

  if (path === "casinoList") {
    crumbs.push({ label: "All Casinos", url: "/en/casino" });
  } else if (path === "casino" && data.name) {
    crumbs.push({ label: "All Casinos", url: "/en/casino" });
    crumbs.push({ label: data.name, url: null });
  } else if (path === "reviewList") {
    crumbs.push({ label: "All Reviews", url: "/en/review" });
  } else if (path === "review" && data.title) {
    crumbs.push({ label: "All Reviews", url: "/en/review" });
    crumbs.push({ label: data.title, url: null });
  } else if (path === "newsList") {
    crumbs.push({ label: "News", url: "/en/news" });
  } else if (path === "news" && data.title) {
    crumbs.push({ label: "News", url: "/en/news" });
    crumbs.push({ label: data.title, url: null });
  } else if (path === "categoryList") {
    crumbs.push({ label: "Categories", url: "/en/category" });
  } else if (path === "category" && data.category) {
    crumbs.push({ label: "Categories", url: "/en/category" });
    crumbs.push({ label: data.category, url: null });
  } else if (path === "countryList") {
    crumbs.push({ label: "Countries", url: "/en/country" });
  } else if (path === "country" && data.name) {
    crumbs.push({ label: "Countries", url: "/en/country" });
    crumbs.push({ label: data.name, url: null });
  } else if (path === "dashboard") {
    crumbs.push({ label: "Dashboard", url: null });
  } else if (path === "page" && data.title) {
    crumbs.push({ label: data.title, url: null });
  } else if (path === "affiliate" && data.title) {
    crumbs.push({ label: data.title, url: null });
  }

  return crumbs;
}

export async function renderHome(request, env) {
  const renderer = new Renderer(env);
  const casinoList = await casinos.getAllCasinos(env.DB);
  const geoData = await prepareGeoData(env, request, casinoList);
  const sortedCasinos = sortCasinosByGeo(casinoList, geoData);

  // Split into available (shown by default) and others (hidden behind Load More)
  const available = sortedCasinos.filter(c => 
    geoData.statuses[c.slug] !== "blocked" && geoData.statuses[c.slug] !== "restricted"
  );
  const others = sortedCasinos.filter(c => 
    geoData.statuses[c.slug] === "blocked" || geoData.statuses[c.slug] === "restricted"
  );

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://level.casino",
    "name": "Level Casino",
    "description": "Expert casino reviews, exclusive bonuses, and real player data.",
    "publisher": {
      "@type": "Organization",
      "name": "Level Casino",
      "logo": {
        "@type": "ImageObject",
        "url": "https://level.casino/en/static/images/logo.png"
      }
    }
  };

  const html = await renderer.render("home.html", {
    seo_title: "Level Casino — Expert Casino Reviews & Bonuses",
    seo_description: "Expert casino reviews, exclusive bonuses, and real player data for casinos worldwide.",
    canonical: "https://level.casino/en",
    casino_cards: buildCasinoCards(available, geoData),
    casino_count: casinoList.length,
    hidden_casino_cards: buildCasinoCards(others, geoData),
    has_hidden: others.length > 0,
    hidden_count: others.length
  }, homeSchema, buildBreadcrumbs("home"));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}


export async function rendealHome(request, env) {
  const renderer = new Renderer(env);
  const casinoList = await casinos.getAllCasinos(env.DB);
  const geoData = await prepareGeoData(env, request, casinoList);
  const sortedCasinos = sortCasinosByGeo(casinoList, geoData);

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://level.casino",
    "name": "Level Casino",
    "description": "Expert casino reviews, exclusive bonuses, and real player data.",
    "publisher": {
      "@type": "Organization",
      "name": "Level Casino",
      "logo": {
        "@type": "ImageObject",
        "url": "https://level.casino/en/static/images/logo.png"
      }
    }
  };

  const html = await renderer.render("home.html", {
    seo_title: "Level Casino — Expert Casino Reviews & Bonuses",
    seo_description: "Expert casino reviews, exclusive bonuses, and real player data for casinos worldwide.",
    casino_cards: buildCasinoCards(sortedCasinos, geoData),
    casino_count: casinoList.length
  }, homeSchema, buildBreadcrumbs("home"));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}



export async function renderCasino(request, env, slug) {
  const casino = await casinos.getCasino(env.DB, slug);
  if (!casino) return render404(request, env);

  const renderer = new Renderer(env);

  // Parse features from JSON string
  let features = [];
  try { features = JSON.parse(casino.features || "[]"); } catch { features = []; }

  const featuresHtml = features
    .map(f => `<span class="feature-tag">${f}</span>`)
    .join("");

  // Build star display
  const rating = casino.rating || 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const ratingDisplay =
    "★".repeat(fullStars) +
    (hasHalf ? "½" : "") +
    "☆".repeat(5 - fullStars - (hasHalf ? 1 : 0));

  const edgeGeo = {
    country: request.cf?.country || "RW",
    city: request.cf?.city || "Unknown"
  };
  const geoInfo = geoEngine.process(request, edgeGeo);
  const geoRule = await getGeoRule(env.DB, slug, geoInfo.country);

  const casinoSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "GamesCasino",
      "name": casino.name,
      "image": casino.logo || "https://level.casino/en/static/images/logo.png",
      "url": casino.website_url || ""
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": rating,
      "bestRating": 5,
      "worstRating": 1
    },
    "author": {
      "@type": "Organization",
      "name": "Level Casino Expert Team"
    }
   };
  
  const html = await renderer.render("casino.html", {
    ...casino,
    canonical: `https://level.casino/en/casino/${slug}`,
    rating_display: ratingDisplay,
    features_html: featuresHtml,
    bonus_title: casino.bonus_title || "Welcome Bonus",
    bonus_value: casino.bonus_value || "",
    website_url: casino.website_url || "",
    seo_description: casino.seo_description || casino.name + " casino review.",
    status: casino.status || "published",
    geo: geoInfo,
    geoRule: geoRule || { status: "allowed", bonus_override: null }
  }, casinoSchema, buildBreadcrumbs("casino", { name: casino.name }));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}

function countryToFlag(code) {
  if (!code || code.length !== 2) return "🏳";
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()));
}

async function prepareGeoData(env, request, casinoList) {
  const edgeGeo = {
    country: request.cf?.country || "RW",
    city: request.cf?.city || "Unknown"
  };
  const geoInfo = geoEngine.process(request, edgeGeo);
  const slugs = casinoList.map(c => c.slug);
  if (slugs.length === 0) return { country: geoInfo.country, statuses: {} };

  // Batch query: get ALL geo rules for ALL these casinos (any country)
  const placeholders = slugs.map(() => '?').join(',');
  const result = await env.DB.prepare(`
    SELECT casino_slug, country_code, status FROM geo_rules
    WHERE casino_slug IN (${placeholders})
  `).bind(...slugs).all();

  // Group rules by casino slug
  const rulesByCasino = {};
  for (const row of (result.results || [])) {
    if (!rulesByCasino[row.casino_slug]) rulesByCasino[row.casino_slug] = [];
    rulesByCasino[row.casino_slug].push(row);
  }

  const statuses = {};
  for (const slug of slugs) {
    const rules = rulesByCasino[slug] || [];
    
    if (rules.length === 0) {
      // No rules at all → blocked everywhere
      statuses[slug] = "blocked";
    } else {
      // Check if this specific country has a rule
      const countryRule = rules.find(r => r.country_code === geoInfo.country);
      if (countryRule) {
        statuses[slug] = countryRule.status;
      } else {
        // No rule for this country — infer from other rules
        const hasAllowed = rules.some(r => r.status === "allowed");
        const hasBlocked = rules.some(r => r.status === "blocked");
        
        if (hasAllowed && !hasBlocked) {
          // Only 'allowed' rules exist → this country is blocked (allowlist mode)
          statuses[slug] = "blocked";
        } else if (hasBlocked && !hasAllowed) {
          // Only 'blocked' rules exist → this country is allowed (blocklist mode)
          statuses[slug] = "allowed";
        } else {
          // Mixed or unclear → blocked by default
          statuses[slug] = "blocked";
        }
      }
    }
  }
  
  return { country: geoInfo.country, statuses };
}

async function evaluateCasinoGeo(env, casinoSlug, countryCode) {
  const result = await env.DB.prepare(`
    SELECT country_code, status FROM geo_rules
    WHERE casino_slug = ?
  `).bind(casinoSlug).all();

  const rules = result.results || [];

  if (rules.length === 0) return "blocked";

  const countryRule = rules.find(r => r.country_code === countryCode);
  if (countryRule) return countryRule.status;

  const hasAllowed = rules.some(r => r.status === "allowed");
  const hasBlocked = rules.some(r => r.status === "blocked");

  if (hasAllowed && !hasBlocked) return "blocked";   // allowlist mode
  if (hasBlocked && !hasAllowed) return "allowed";    // blocklist mode
  return "blocked";                                    // mixed → safe default
}

async function prepoGeoData(env, request, casinoList) {
  const edgeGeo = {
    country: request.cf?.country || "RW",
    city: request.cf?.city || "Unknown"
  };
  const geoInfo = geoEngine.process(request, edgeGeo);
  const slugs = casinoList.map(c => c.slug);
  if (slugs.length === 0) return { country: geoInfo.country, statuses: {} };

  // Single batch query instead of N individual queries
  const placeholders = slugs.map(() => '?').join(',');
  const result = await env.DB.prepare(`
    SELECT casino_slug, status FROM geo_rules
    WHERE casino_slug IN (${placeholders}) AND country_code = ?
  `).bind(...slugs, geoInfo.country).all();

  const statuses = {};
  for (const slug of slugs) statuses[slug] = "unknown";
  for (const row of (result.results || [])) {
    statuses[row.casino_slug] = row.status;
  }
  return { country: geoInfo.country, statuses };
}


async function prepaGeoData(env, request, casinoList) {
  const edgeGeo = {
    country: request.cf?.country || "RW",
    city: request.cf?.city || "Unknown"
  };
  const geoInfo = geoEngine.process(request, edgeGeo);
  const statuses = {};
  for (const casino of casinoList) {
    const rule = await getGeoRule(env.DB, casino.slug, geoInfo.country);
    statuses[casino.slug] = rule ? rule.status : "allowed";
  }
  return { country: geoInfo.country, statuses };
}

function sortCasinosByGeo(casinoList, geoData) {
  if (!geoData) return casinoList;
  const allowed = casinoList.filter(c => geoData.statuses[c.slug] !== "blocked" && geoData.statuses[c.slug] !== "restricted");
  const blocked = casinoList.filter(c => geoData.statuses[c.slug] === "blocked" || geoData.statuses[c.slug] === "restricted");
  allowed.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  blocked.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return [...allowed, ...blocked];
}

function buildCasinoCards(casinoList, geoData = null) {
  return casinoList.map(casino => {
    const flag = geoData ? countryToFlag(geoData.country) : "";
    const geoStatus = geoData ? (geoData.statuses[casino.slug] || "unknown") : "unknown";
 //   const geoIcon = geoStatus === "allowed" ? "✓" : "✕";
 //   const geoClass = geoStatus === "allowed" ? "geo-badge--allowed" : "geo-badge--blocked";

    // Different icons and colors for each status
    let geoIcon, geoClass, geoLabel;
    if (geoStatus === "allowed") {
      geoIcon = "✓";
      geoClass = "geo-badge--allowed";
      geoLabel = "Available";
    } else if (geoStatus === "blocked") {
      geoIcon = "✕";
      geoClass = "geo-badge--blocked";
      geoLabel = "Not Available";
    } else {
      geoIcon = "?";     // ← question mark for unknown
      geoClass = "geo-badge--unknown";
      geoLabel = "Unknown";
    }
    const geoBadge = geoData ? `
      <div class="geo-badge ${geoClass}" title="${geoLabel} in ${countryFullName(geoData.country)}">
        <span class="geo-badge__flag">${flag}</span>
        <span class="geo-badge__icon">${geoIcon}</span>
      </div>` : "";
   // const geoBadge = geoData ? `
     // <div class="geo-badge ${geoClass}">
       // <span class="geo-badge__flag">${flag}</span>
       // <span class="geo-badge__icon">${geoIcon}</span>
     // </div>` : "";
    const geoStatusText = geoData ? `
  <div class="casino-card__geo-status geo-${geoStatus}">
    ${flag} ${geoLabel} for players from ${countryFullName(geoData.country)}
  </div>` : "";

// Then add ${geoStatusText} inside the card body, after the bonus div


    const complianceHtml = `
      <div class="casino-card__compliance">
        ${casino.license ? `<div class="compliance-row"><span class="compliance-label">License:</span> <span class="compliance-value">${casino.license}</span></div>` : ""}
        ${casino.owner ? `<div class="compliance-row"><span class="compliance-label">Operator:</span> <span class="compliance-value">${casino.owner}</span></div>` : ""}
        ${casino.website_url ? `<div class="compliance-row"><span class="compliance-label">18+ | PLAY RESPONSIBLY |</span> <a href="${casino.website_url}" target="_blank" rel="noopener" class="compliance-link">T&CS APPLY</a></div>` : ""}
      </div>`;

    return `
    <div class="casino-card">
      ${geoBadge}
      <div class="casino-card__header">
        <img src="${casino.logo || '/static/images/logo.png'}" alt="${casino.name}" class="casino-card__logo" onerror="this.src='/en/static/images/logo.png'" loading="lazy">
        <div class="casino-card__rating">${'★'.repeat(Math.round(casino.rating))}${'☆'.repeat(5 - Math.round(casino.rating))}</div>
      </div>
      <div class="casino-card__body">
        <h3>${casino.name}</h3>
        <div class="casino-card__bonus">
          <span class="bonus-title">${casino.bonus_title || 'Welcome Bonus'}</span>
          <span class="bonus-value">${casino.bonus_value || ''}</span>
        </div>
        ${geoStatusText}
        ${complianceHtml}
      </div>
      <div class="casino-card__actions">
        <a href="/en/casino/${casino.slug}" class="btn btn--secondary">Review</a>
        <a href="/en/go/${casino.slug}" class="btn btn--primary" rel="nofollow sponsored">Visit</a>
      </div>
    </div>`;
  }).join('');
}

function buidCasinoCards(casinoList, geoData = null) {
  return casinoList.map(casino => {
    const flag = geoData ? countryToFlag(geoData.country) : "";
    const geoStatus = geoData ? (geoData.statuses[casino.slug] || "allowed") : "allowed";
    const geoIcon = geoStatus === "allowed" ? "✓" : "✕";
    const geoClass = geoStatus === "allowed" ? "geo-badge--allowed" : "geo-badge--blocked";

    const geoBadge = geoData ? `
      <div class="geo-badge ${geoClass}">
        <span class="geo-badge__flag">${flag}</span>
        <span class="geo-badge__icon">${geoIcon}</span>
      </div>` : "";

    const complianceHtml = `
      <div class="casino-card__compliance">
        ${casino.license ? `<div class="compliance-row"><span class="compliance-label">License:</span> <span class="compliance-value">${casino.license}</span></div>` : ""}
        ${casino.owner ? `<div class="compliance-row"><span class="compliance-label">Operator:</span> <span class="compliance-value">${casino.owner}</span></div>` : ""}
        ${casino.website_url ? `<div class="compliance-row"><span class="compliance-label">Terms:</span> <a href="${casino.website_url}" target="_blank" rel="noopener" class="compliance-link">View Terms</a></div>` : ""}
      </div>`;

    return `
    <div class="casino-card">
      ${geoBadge}
      <div class="casino-card__header">
        <img src="${casino.logo || '/en/static/images/logo.png'}" alt="${casino.name}" class="casino-card__logo" onerror="this.src='/en/static/images/logo.png'">
        <div class="casino-card__rating">${'★'.repeat(Math.round(casino.rating))}${'☆'.repeat(5 - Math.round(casino.rating))}</div>
      </div>
      <div class="casino-card__body">
        <h3>${casino.name}</h3>
        <div class="casino-card__bonus">
          <span class="bonus-title">${casino.bonus_title || 'Welcome Bonus'}</span>
          <span class="bonus-value">${casino.bonus_value || ''}</span>
        </div>
        ${complianceHtml}
      </div>
      <div class="casino-card__actions">
        <a href="/en/casino/${casino.slug}" class="btn btn--secondary">Review</a>
        <a href="/en/go/${casino.slug}" class="btn btn--primary" rel="nofollow sponsored">Visit</a>
      </div>
    </div>`;
  }).join('');
}



export async function renderReview(request, env, slug) {
  const review = await reviews.getReview(env.DB, slug);
  if (!review) return render404(request, env);

  const renderer = new Renderer(env);

  let pros = [], cons = [];
  try { pros = JSON.parse(review.pros || "[]"); } catch {}
  try { cons = JSON.parse(review.cons || "[]"); } catch {}

  const prosHtml = pros.length
    ? `<ul>${pros.map(p => `<li>${p}</li>`).join("")}</ul>`
    : "<p class='muted'>No pros listed.</p>";

  const consHtml = cons.length
    ? `<ul>${cons.map(c => `<li>${c}</li>`).join("")}</ul>`
    : "<p class='muted'>No cons listed.</p>";

  // Geo evaluation for the casino connected to this review
  let geoCountry = "";
  let geoStatus = "allowed";
  let geoFlag = "";
  if (review.casino_slug) {
    const edgeGeo = {
      country: request.cf?.country || "RW",
      city: request.cf?.city || "Unknown"
    };
    const geoInfo = geoEngine.process(request, edgeGeo);
    geoCountry = geoInfo.country;
    geoFlag = countryToFlag(geoCountry);
    //const geoRule = await getGeoRule(env.DB, review.casino_slug, geoInfo.country);
    //geoStatus = geoRule ? geoRule.status : "allowed";
    // With:
    geoStatus = await evaluateCasinoGeo(env, review.casino_slug, geoInfo.country);

  }

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    "headline": review.title,
    "reviewBody": review.content || "",
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": review.rating || "5",
      "bestRating": 5
    },
    "itemReviewed": {
      "@type": "GamesCasino",
      "name": review.title.replace("Review", "").trim()
    },
    "author": {
      "@type": "Person",
      "name": "Level Casino Editor"
    }
  };

  const html = await renderer.render("review.html", {
    ...review,
    canonical: `https://level.casino/en/review/${slug}`,
    pros_html: prosHtml,
    cons_html: consHtml,
    casino_slug: review.casino_slug || "",
    geo_country: countryFullName(geoCountry),
    geo_status: geoStatus,
    geo_flag: geoFlag
  }, reviewSchema, buildBreadcrumbs("review", { title: review.title }));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}


export async function renderNews(
  request,
  env,
  slug
){

  const article =
    await news.getNews(
      env.DB,
      slug
    );

  if (!article) {
    return render404(request, env);
  }

  const renderer =
    new Renderer(env);
  // Fix 29: NewsArticle Schema
  const newsSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "datePublished": article.created_at,
    "description": article.content ? article.content.substring(0, 150) : "",
    "author": {
      "@type": "Person",
      "name": "iGaming Analyst"
    }
  };
  
  const html =
    await renderer.render(
      "news.html",
      { ...article, canonical: `https://level.casino/en/news/${slug}` },
      article,
      newsSchema,
      buildBreadcrumbs("news", { title: article.title })
    );

  return new Response(
    html,
    {
      headers:{
        "Content-Type":"text/html"
      }
    }
  );

}

async function hashIP(ip){

  if(!ip){
    return "";
  }

  const data =
    new TextEncoder()
      .encode(ip);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array
    .from(
      new Uint8Array(hash)
    )
    .map(b =>
      b.toString(16)
       .padStart(2,"0")
    )
    .join("");
}

export async function
handleAffiliateRedirect(
  request,
  env,
  slug
){

  const casino =
    await casinos.getCasino(
      env.DB,
      slug
    );

  if (!casino) {
    return render404(request, env);
  }

  const ipHash =
  await hashIP(
    request.headers.get(
      "CF-Connecting-IP"
    )
  );

await logClick(
  env.DB,
  slug,
  request.cf?.country || "RW",
  request.cf?.city || "",
  ipHash,
  request.headers.get(
    "user-agent"
  )
);
  return Response.redirect(
    casino.affiliate_url,
    302
  );
}


export async function renderDashboardPage(request, env) {

    const user = await getCurrentUser(request, env);

    if (!user) {
        return new Response(null, {
            status: 302,
            headers: {
                Location: "/en/login"
            }
        });
    }

    const renderer = new Renderer(env);

    const template =
        user.role === "admin"
            ? "admin/dashboard.html"
            : "users/dashboard.html";

    const html = await renderer.render(template, {
        seo_title: "Dashboard",
        seo_description: "Level Casino Dashboard",
        email: user.email,
        role: user.role
    });

    return new Response(html, {
        headers: {
            "Content-Type": "text/html"
        }
    });
}

export async function dashboardStatsAPI(request, env) {

    const user = await getCurrentUser(request, env);

    if (!user || user.role !== "admin") {
        return new Response("Forbidden", {
            status: 403
        });
    }

    const casinos = await env.DB.prepare(
        "SELECT COUNT(*) c FROM casinos"
    ).first();

    const reviews = await env.DB.prepare(
        "SELECT COUNT(*) c FROM reviews"
    ).first();

    const clicks = await env.DB.prepare(
        "SELECT COUNT(*) c FROM clicks"
    ).first();

    const pages = await env.DB.prepare(
        "SELECT COUNT(*) c FROM pages"
    ).first();

    return Response.json({
        casinos: casinos.c,
        reviews: reviews.c,
        clicks: clicks.c,
        pages: pages.c
    });
}

export function robots() {

  return new Response(
`User-agent: *
Allow: /

Sitemap:
https://level.casino/sitemap.xml`,
{
headers:{
"Content-Type":
"text/plain"
}
});

}

export async function rendeCountry(request, env, slug) {
  const code = slug.toUpperCase();
  const country = await countries.getCountry(env.DB, code);
  const countryData = country || {
    code, name: code, seo_title: null, seo_description: null
  };
  
  // Get allowed casinos
  let casinoList = await casinos.getCasinosByCountryAllowlist(env.DB, code);
  
  // Sort by rating descending (highest first)
  casinoList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  
  const geoData = await prepareGeoData(env, request, casinoList);
  const renderer = new Renderer(env);
  
  const countrySchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Best Online Casinos in ${countryData.name}`,
    "itemListElement": casinoList.map((c, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://level.casino/en/casino/${c.slug}`
    }))
  };
  
  const html = await renderer.render("country.html", {
    ...countryData,
    casino_cards: buildCasinoCards(casinoList, geoData),
    seo_title: countryData.seo_title || countryData.name + " Online Casinos",
    seo_description: countryData.seo_description || "Best online casinos available in " + countryData.name
  }, countrySchema, buildBreadcrumbs("country", { name: countryData.name }));
  
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}


export async function renderCountry(request, env, slug) {
  const code = slug.toUpperCase();
  const country = await countries.getCountry(env.DB, code);
  const countryData = country || {
    code, name: code, seo_title: null, seo_description: null
  };
  const casinoList = await casinos.getCasinosByCountryAllowlist(env.DB, code);

  // Sort by rating descending (highest first)
  casinoList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  
  const geoData = await prepareGeoData(env, request, casinoList);
  const renderer = new Renderer(env);
  const countrySchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Best Online Casinos in ${countryData.name}`,
    "itemListElement": casinoList.map((c, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://level.casino/en/casino/${c.slug}`
    }))
  };
  const html = await renderer.render("country.html", {
    ...countryData,
    canonical: `https://level.casino/en/country/${code}`,
    casino_cards: buildCasinoCards(casinoList, geoData),
    seo_title: countryData.seo_title || countryData.name + " Online Casinos",
    seo_description: countryData.seo_description || "Best online casinos available in " + countryData.name
  }, countrySchema, buildBreadcrumbs("country", { name: countryData.name }));
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}


export async function renderCategory(request, env, slug) {
  const category = await categories.getCategory(env.DB, slug);
  if (!category) return render404(request, env);

  const casinoList = await categories.getCategoryCasinos(env.DB, slug);
  const geoData = await prepareGeoData(env, request, casinoList);
  const sortedCasinos = sortCasinosByGeo(casinoList, geoData);

  const renderer = new Renderer(env);
  const categorySchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${category.name} Type Online Casinos`,
    "itemListElement": sortedCasinos.map((c, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://level.casino/en/casino/${c.slug}`
    }))
  };

  const html = await renderer.render("category.html", {
    slug,
    canonical: `https://level.casino/en/category/${slug}`,
    category: category.name,
    description: category.description,
    casino_cards: buildCasinoCards(sortedCasinos, geoData),
    seo_title: category.seo_title || category.name + " Casinos",
    seo_description: category.seo_description || "Top " + category.name + " casinos reviewed by Level Casino"
  }, categorySchema, buildBreadcrumbs("category", { category: category.name }));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}



function parseContentJson(contentJson) {
  if (!contentJson) return "";
  try {
    const parsed = JSON.parse(contentJson);
    if (typeof parsed === "string") return parsed;
    if (parsed.text) return parsed.text;
    if (parsed.html) return parsed.html;
    return Object.values(parsed).join("<br><br>");
  } catch {
    return contentJson;
  }
}

export async function renderDynamicPage(request, env, slug) {
  const page = await pages.getPage(env.DB, slug);
  if (!page) return render404(request, env);

  const renderer = new Renderer(env);
  // Fix 29: Generic WebPage Schema
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": page.title,
    "description": page.seo_description || ""
  };

  const html = await renderer.render("page.html", {
    ...page,
    canonical: `https://level.casino/en/${slug}`,
    content_json: parseContentJson(page.content_json)
  }, pageSchema,buildBreadcrumbs("page", { title: page.title }));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}

export async function renderAffiliate(request, env, slug) {
  const page = await pages.getPage(env.DB, slug);
  if (!page) return render404(request, env);

  const renderer = new Renderer(env);
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": page.title
  };

  const html = await renderer.render("affiliate.html", {
    ...page,
    content_json: parseContentJson(page.content_json)
  }, pageSchema, buildBreadcrumbs("affiliate", { title: page.title }));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}

export async function renderLogin(
  request,
  env
){

  const renderer =
    new Renderer(env);

  const html =
    await renderer.render(
      "login.html",
      {
        seo_title:
          "Login",
        seo_description:
          "Level Casino Login",
        canonical: "https://level.casino/en/login"
      }
    );

  return new Response(
    html,
    {
      headers:{
        "Content-Type":
          "text/html"
      }
    }
  );

}

export async function renderRegister(
  request,
  env
){

  const renderer =
    new Renderer(env);

  const html =
    await renderer.render(
      "register.html",
      {
        seo_title:
          "Register",
        seo_description:
          "Create Level Casino account",
        canonical: "https://level.casino/en/register"
      }
    );

  return new Response(
    html,
    {
      headers:{
        "Content-Type":
          "text/html"
      }
    }
  );

}

export async function render404(request, env) {
  const renderer = new Renderer(env);

  const html = await renderer.render("404.html", {
    seo_title: "404 - Page Not Found",
    seo_description: "Sorry, this page does not exist on Level Casino."
  });

  return new Response(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html"
    }
  });
}

export async function renderCasinoList(request, env) {
  const renderer = new Renderer(env);
  const casinoList = await casinos.getAllCasinos(env.DB);
  const geoData = await prepareGeoData(env, request, casinoList);
  const sortedCasinos = sortCasinosByGeo(casinoList, geoData);

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Complete Directory of Online Casinos",
    "itemListElement": sortedCasinos.map((c, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `https://level.casino/en/casino/${c.slug}`
    }))
  };

  const html = await renderer.render("category.html", {
    canonical: "https://level.casino/en/casino",
    category: "All Casinos",
    description: "Browse our complete directory of reviewed online casinos.",
    casino_cards: buildCasinoCards(sortedCasinos, geoData),
    seo_title: "All Online Casinos — Level Casino",
    seo_description: "Complete directory of reviewed online casinos with bonuses and ratings."
  }, listSchema, buildBreadcrumbs("casinoList"));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}


export async function rendeCasinoList(request, env) {
  const renderer = new Renderer(env);
  const casinoList = await casinos.getAllCasinos(env.DB);
  const geoData = await prepareGeoData(env, request, casinoList);
  const sortedCasinos = sortCasinosByGeo(casinoList, geoData);

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Complete Directory of Online Casinos",
    "itemListElement": sortedCasinos.map((c, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `https://level.casino/en/casino/${c.slug}`
    }))
  };

  const html = await renderer.render("category.html", {
    canonical: "https://level.casino/en/casino",
    category: "All Casinos",
    description: "Browse our complete directory of reviewed online casinos.",
    casino_cards: buildCasinoCards(sortedCasinos, geoData),
    seo_title: "All Online Casinos — Level Casino",
    seo_description: "Complete directory of reviewed online casinos with bonuses and ratings."
  }, listSchema, buildBreadcrumbs("casinoList"));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}


export async function renderReviewList(request, env) {
  const renderer = new Renderer(env);
  const reviewList = await env.DB.prepare(
    "SELECT * FROM reviews WHERE published = 1 ORDER BY created_at DESC"
  ).all();

  const reviewCards = (reviewList.results || []).map(r => `
    <div class="casino-card">
      <div class="casino-card__body">
        <h3><a href="/en/review/${r.slug}">${r.title}</a></h3>
        <div class="casino-card__rating">★ ${r.rating || "N/A"}</div>
        <p class="muted">${(r.content || "").substring(0, 120)}...</p>
      </div>
      <div class="casino-card__actions">
        <a href="/en/review/${r.slug}" class="btn btn--primary">Read Review</a>
      </div>
    </div>
  `).join("");

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "All Casino Reviews",
    "itemListElement": (reviewList.results || []).map((r, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `https://level.casino/en/review/${r.slug}`
    }))
  };

  const html = await renderer.render("category.html", {
    canonical: "https://level.casino/en/review",
    category: "All Reviews",
    description: "Browse our complete collection of casino reviews.",
    casino_cards: reviewCards,
    seo_title: "All Casino Reviews — Level Casino",
    seo_description: "In-depth casino reviews with pros, cons, and ratings."
  }, listSchema, buildBreadcrumbs("reviewList"));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}

export async function renderNewsList(request, env) {
  const renderer = new Renderer(env);
  const newsList = await news.getAllNews(env.DB);

  const newsCards = newsList.map(n => `
    <a href="/en/news/${n.slug}" class="news-card">
      <h3>${n.title}</h3>
      <p>${(n.content || "").substring(0, 120)}...</p>
      <span class="news-date">${new Date(n.created_at).toLocaleDateString()}</span>
    </a>
  `).join("");

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "iGaming Industry News Feed",
    "itemListElement": newsList.map((n, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `https://level.casino/en/news/${n.slug}`
    }))
  };

  const html = await renderer.render("category.html", {
    canonical: "https://level.casino/en/news",
    category: "Latest News",
    description: "Latest iGaming industry news and updates.",
    casino_cards: `<div class="news-grid">${newsCards}</div>`,
    seo_title: "Casino News — Level Casino",
    seo_description: "Latest iGaming and online casino industry news."
  }, listSchema, buildBreadcrumbs("newsList"));

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}


async function renderAdminPage(request, env, template, extraData = {}) {
  const user = await getCurrentUser(request, env);
  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const renderer = new Renderer(env);
  const html = await renderer.render(template, {
    canonical: "https://level.casino/en/news",
    seo_title: "Admin — Level Casino",
    seo_description: "Level Casino CMS Admin",
    ...extraData
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}



export async function renderDashboardCasinos(request, env) {
  return renderAdminPage(request, env, "admin/casinos.html");
}
export async function renderDashboardCasinoCreate(request, env) {
  return renderAdminPage(request, env, "admin/casino-create.html");
}
export async function renderDashboardReviews(request, env) {
  return renderAdminPage(request, env, "admin/reviews.html");
}
export async function renderDashboardNews(request, env) {
  return renderAdminPage(request, env, "admin/news.html");
}
export async function renderDashboardPages(request, env) {
  return renderAdminPage(request, env, "admin/pages.html");
}
export async function renderDashboardSettings(request, env) {
  return renderAdminPage(request, env, "admin/settings.html");
}
export async function renderDashboardAI(request, env) {
  return renderAdminPage(request, env, "admin/ai.html");
}


async function renderUserPage(request, env, template) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/en/login" }
    });
  }

  const renderer = new Renderer(env);
  const html = await renderer.render(template, {
    seo_title: "Level Casino — Dashboard",
    seo_description: "Manage your account",
    email: user.email,
    role: user.role
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}

export async function renderUserDashboard(request, env) {
  return renderUserPage(request, env, "users/dashboard.html");
}
export async function renderUserSubmitCasino(request, env) {
  return renderUserPage(request, env, "users/submit-casino.html");
}
export async function renderUserInquiries(request, env) {
  return renderUserPage(request, env, "users/inquiries.html");
}
export async function renderUserProfile(request, env) {
  return renderUserPage(request, env, "users/profile.html");
}
export async function renderUserNotifications(request, env) {
  return renderUserPage(request, env, "users/notifications.html");
}



export async function renderCategoryList(request, env) {
  const renderer = new Renderer(env);
  const cats = await categories.getAllCategories(env.DB);

  const categoryCards = cats.map(c => `
    <div class="feature-card">
      <h3><a href="/en/category/${c.slug}">${c.name}</a></h3>
      <p>${c.description || ""}</p>
    </div>
  `).join("");

  const html = await renderer.render("category.html", {
    category: "All Categories",
    description: "Browse casinos by category.",
    casino_cards: `<div class="features-grid">${categoryCards}</div>`,
    seo_title: "Casino Categories — Level Casino",
    seo_description: "Browse online casinos by category."
  }, {}, buildBreadcrumbs("categoryList"));

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

export async function renderCountryList(request, env) {
  const renderer = new Renderer(env);
  const countriesList = await countries.getAllCountries(env.DB);

  const countryChips = countriesList.map(c => `
    <a href="/en/country/${c.code}" class="chip">${c.name}</a>
  `).join("");

  const html = await renderer.render("category.html", {
    category: "All Countries",
    description: "Browse online casinos available in your country.",
    casino_cards: `<div class="country-chips" style="justify-content:center;padding:20px">${countryChips}</div>`,
    seo_title: "Online Casinos by Country — Level Casino",
    seo_description: "Find online casinos available in your country."
  }, {}, buildBreadcrumbs("countryList"));

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

export async function renderDashboardCategories(request, env) {
  return renderAdminPage(request, env, "admin/categories.html");
}

export async function renderDashboardCountries(request, env) {
  return renderAdminPage(request, env, "admin/countries.html");
}

export async function renderDashboardCasinoEdit(request, env, slug) {
  return renderAdminPage(request, env, "admin/casino-edit.html", { slug });
}
