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

  if (hasAllowed && !hasBlocked) return "not allowed";   // allowlist mode
  if (hasBlocked && !hasAllowed) return "allowed";    // blocklist mode
  return "blocked";                                    // mixed → safe default
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

function buildReviewCasinoCards(casinoList, geoData = null) {
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
      geoIcon = "✕";     // ← question mark for unknown
      geoClass = "geo-badge--unknown";
      geoLabel = "not Available";
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
        <h3>${casino.name} Review</h3>
        <div class="casino-card__bonus">
          <span class="bonus-title">${casino.bonus_title || 'Welcome Bonus'}</span>
          <span class="bonus-value">${casino.bonus_value || ''}</span>
        </div>
        ${geoStatusText}
        ${complianceHtml}
      </div>
      <div class="casino-card__actions">
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

  let casinoCardHtml = "";

if (review.casino_slug) {
  const casino = await casinos.getCasino(env.DB, review.casino_slug);

  if (casino) {
    casinoCardHtml = buildReviewCasinoCards(
      [casino],
      {
        country: geoCountry,
        statuses: {
          [casino.slug]: geoStatus
        }
      }
    );
  }
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
      "name": "Elie"
    }
  };

  const html = await renderer.render("review.html", {
    ...review,
    canonical: `https://level.casino/en/review/${slug}`,
    pros_html: prosHtml,
    cons_html: consHtml,
    casino_card_html: casinoCardHtml,
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

Hy , I am working on cloudflare worker project, I ...

Hy , I am working on cloudflare worker project, I need you to analyze full backed and suggest fixes especially focusing much on sitemap. I need my project to handle everything at root url which is set to be at /en/* directory. After make sure sitemap is full functioning at en/ . Analysis and suggest all possible production ready fixes needed to make sitemap full functioning make sure you suggest and generate exact update snippet or replacement snippet and all placement guidance. Go on. --ab7a92e507ad3fe2c682c94bbcd85ea465731c4c52855a93edc134e0afcc
Content-Disposition: form-data; name="index.js"

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// en/worker/database/categories.js
var categories_exports = {};
__export(categories_exports, {
  createCategory: () => createCategory,
  deleteCategory: () => deleteCategory,
  getAllCategories: () => getAllCategories,
  getCategory: () => getCategory,
  getCategoryCasinos: () => getCategoryCasinos,
  updateCategory: () => updateCategory
});
async function getCategory(db, slug) {
  return db.prepare(`
    SELECT *
    FROM categories
    WHERE slug=?
    LIMIT 1
  `).bind(slug).first();
}
async function getAllCategories(db) {
  const result = await db.prepare(`
      SELECT *
      FROM categories
      ORDER BY name
    `).all();
  return result.results || [];
}
async function getCategoryCasinos(db, slug) {
  const result = await db.prepare(`
      SELECT c.*
      FROM casino_categories cc
      JOIN casinos c
      ON c.id = cc.casino_id
      JOIN categories cat
      ON cat.id = cc.category_id
      WHERE cat.slug = ?
      ORDER BY
        c.featured DESC,
        c.sort_order ASC,
        c.rating DESC
    `).bind(slug).all();
  return result.results || [];
}
async function createCategory(db, data) {
  return db.prepare(`
    INSERT INTO categories(
      slug,
      name,
      description,
      seo_title,
      seo_description
    )
    VALUES(
      ?,?,?,?,?
    )
  `).bind(
    data.slug,
    data.name,
    data.description,
    data.seo_title,
    data.seo_description
  ).run();
}
async function updateCategory(db, slug, data) {
  return db.prepare(`
    UPDATE categories SET
      name=?, description=?, seo_title=?, seo_description=?
    WHERE slug=?
  `).bind(data.name, data.description, data.seo_title, data.seo_description, slug).run();
}
async function deleteCategory(db, slug) {
  return db.prepare(`
    DELETE FROM categories WHERE slug=?
  `).bind(slug).run();
}
var init_categories = __esm({
  "en/worker/database/categories.js"() {
    __name(getCategory, "getCategory");
    __name(getAllCategories, "getAllCategories");
    __name(getCategoryCasinos, "getCategoryCasinos");
    __name(createCategory, "createCategory");
    __name(updateCategory, "updateCategory");
    __name(deleteCategory, "deleteCategory");
  }
});

// en/worker/database/reviews.js
var reviews_exports = {};
__export(reviews_exports, {
  createReview: () => createReview,
  deleteReview: () => deleteReview,
  getCasinoReviews: () => getCasinoReviews,
  getReview: () => getReview,
  updateReview: () => updateReview
});
async function getReview(db, slug, countryCode = null) {
  if (countryCode) {
    const geoReview = await db.prepare(`
        SELECT *
        FROM reviews
        WHERE slug = ?
        AND country_code = ?
        LIMIT 1
      `).bind(slug, countryCode).first();
    if (geoReview) return geoReview;
  }
  return await db.prepare(`
      SELECT *
      FROM reviews
      WHERE slug = ?
      LIMIT 1
    `).bind(slug).first();
}
async function createReview(db, review) {
  return await db.prepare(`
      INSERT INTO reviews (
        casino_slug,
        country_code,
        slug,
        title,
        content,
        pros,
        cons,
        rating,
        seo_title,
        seo_description,
        ai_generated
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
    review.casino_slug,
    review.country_code,
    review.slug,
    review.title,
    review.content,
    JSON.stringify(review.pros || []),
    JSON.stringify(review.cons || []),
    review.rating,
    review.seo_title,
    review.seo_description,
    review.ai_generated ? 1 : 0
  ).run();
}
async function updateReview(db, slug, review) {
  return db.prepare(`
    UPDATE reviews
    SET
      title=?,
      content=?,
      pros=?,
      cons=?,
      rating=?,
      seo_title=?,
      seo_description=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE slug=?
  `).bind(
    review.title,
    review.content,
    JSON.stringify(review.pros || []),
    JSON.stringify(review.cons || []),
    review.rating,
    review.seo_title,
    review.seo_description,
    slug
  ).run();
}
async function getCasinoReviews(db, casinoSlug) {
  const result = await db.prepare(`
    SELECT *
    FROM reviews
    WHERE casino_slug=?
    ORDER BY created_at DESC
  `).bind(casinoSlug).all();
  return result.results;
}
async function deleteReview(db, slug) {
  return db.prepare(`
    DELETE FROM reviews WHERE slug=?
  `).bind(slug).run();
}
var init_reviews = __esm({
  "en/worker/database/reviews.js"() {
    __name(getReview, "getReview");
    __name(createReview, "createReview");
    __name(updateReview, "updateReview");
    __name(getCasinoReviews, "getCasinoReviews");
    __name(deleteReview, "deleteReview");
  }
});

// en/worker/database/pages.js
var pages_exports = {};
__export(pages_exports, {
  createPage: () => createPage,
  deletePage: () => deletePage,
  getAllPages: () => getAllPages,
  getPage: () => getPage,
  updatePage: () => updatePage
});
async function getPage(db, slug) {
  return await db.prepare(`
      SELECT *
      FROM pages
      WHERE slug = ?
      LIMIT 1
    `).bind(slug).first();
}
async function createPage(db, page) {
  return await db.prepare(`
      INSERT INTO pages (
        slug,
        type,
        template,
        title,
        content_json,
        seo_title,
        seo_description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
    page.slug,
    page.type,
    page.template,
    page.title,
    JSON.stringify(page.content_json || {}),
    page.seo_title,
    page.seo_description
  ).run();
}
async function updatePage(db, slug, page) {
  return db.prepare(`
 UPDATE pages
 SET
 title=?,
 content_json=?,
 seo_title=?,
 seo_description=?,
 updated_at=CURRENT_TIMESTAMP
 WHERE slug=?
 `).bind(
    page.title,
    JSON.stringify(page.content_json || {}),
    page.seo_title,
    page.seo_description,
    slug
  ).run();
}
async function deletePage(db, slug) {
  return db.prepare(`
    DELETE FROM pages WHERE slug=?
  `).bind(slug).run();
}
async function getAllPages(db) {
  const result = await db.prepare(`
    SELECT * FROM pages ORDER BY created_at DESC
  `).all();
  return result.results || [];
}
var init_pages = __esm({
  "en/worker/database/pages.js"() {
    __name(getPage, "getPage");
    __name(createPage, "createPage");
    __name(updatePage, "updatePage");
    __name(deletePage, "deletePage");
    __name(getAllPages, "getAllPages");
  }
});

// en/worker/database/countries.js
var countries_exports = {};
__export(countries_exports, {
  createCountry: () => createCountry,
  deleteCountry: () => deleteCountry,
  getAllCountries: () => getAllCountries,
  getCountry: () => getCountry,
  updateCountry: () => updateCountry
});
async function getCountry(db, code) {
  return await db.prepare(`
      SELECT *
      FROM countries
      WHERE code = ?
      LIMIT 1
    `).bind(code).first();
}
async function getAllCountries(db) {
  const result = await db.prepare(`
      SELECT *
      FROM countries
      ORDER BY name
    `).all();
  return result.results;
}
async function createCountry(db, data) {
  return db.prepare(`
    INSERT INTO countries (code, name, currency, language, legal_status, seo_title, seo_description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.code.toUpperCase(),
    data.name,
    data.currency,
    data.language,
    data.legal_status,
    data.seo_title,
    data.seo_description
  ).run();
}
async function updateCountry(db, code, data) {
  return db.prepare(`
    UPDATE countries SET
      name=?, currency=?, language=?, legal_status=?, seo_title=?, seo_description=?
    WHERE code=?
  `).bind(
    data.name,
    data.currency,
    data.language,
    data.legal_status,
    data.seo_title,
    data.seo_description,
    code.toUpperCase()
  ).run();
}
async function deleteCountry(db, code) {
  return db.prepare(`
    DELETE FROM countries WHERE code=?
  `).bind(code.toUpperCase()).run();
}
var init_countries = __esm({
  "en/worker/database/countries.js"() {
    __name(getCountry, "getCountry");
    __name(getAllCountries, "getAllCountries");
    __name(createCountry, "createCountry");
    __name(updateCountry, "updateCountry");
    __name(deleteCountry, "deleteCountry");
  }
});

// en/worker/database/users.js
async function createSession(db, token, userId, expiresAt) {
  return db.prepare(`
            INSERT INTO sessions (
                id,
                user_id,
                expires_at
            )
            VALUES (?, ?, ?)
        `).bind(
    token,
    userId,
    expiresAt
  ).run();
}
async function getSession(db, token) {
  return db.prepare(`
            SELECT
                sessions.*,
                users.email,
                users.role
            FROM sessions
            JOIN users
                ON users.id = sessions.user_id
            WHERE sessions.id = ?
            LIMIT 1
        `).bind(token).first();
}
async function deleteSession(db, token) {
  return db.prepare(`
            DELETE FROM sessions
            WHERE id = ?
        `).bind(token).run();
}
async function getUserByEmail(db, email) {
  return db.prepare(`
 SELECT *
 FROM users
 WHERE email=?
 LIMIT 1
 `).bind(email).first();
}
var init_users = __esm({
  "en/worker/database/users.js"() {
    __name(createSession, "createSession");
    __name(getSession, "getSession");
    __name(deleteSession, "deleteSession");
    __name(getUserByEmail, "getUserByEmail");
  }
});

// en/worker/auth.js
var auth_exports = {};
__export(auth_exports, {
  generateSessionToken: () => generateSessionToken,
  getCookie: () => getCookie,
  getCurrentUser: () => getCurrentUser,
  hashPassword: () => hashPassword,
  login: () => login,
  logout: () => logout,
  register: () => register,
  requireAuth: () => requireAuth,
  requireRole: () => requireRole,
  verifyPassword: () => verifyPassword
});
async function verifyTurnstile(token, env) {
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET || "",
        response: token
      })
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
async function checkRateLimit(env, ipHash, action) {
  const windowMinutes = 15;
  const maxAttempts = 5;
  const now = Date.now();
  const windowStart = new Date(now - windowMinutes * 60 * 1e3).toISOString();
  await env.DB.prepare(`
    DELETE FROM auth_attempts WHERE created_at < ?
  `).bind(windowStart).run();
  const row = await env.DB.prepare(`
    SELECT COUNT(*) as c FROM auth_attempts
    WHERE ip_hash = ? AND action = ? AND created_at >= ?
  `).bind(ipHash, action, windowStart).first();
  return (row?.c || 0) < maxAttempts;
}
async function logFailedAttempt(env, ipHash, action) {
  await env.DB.prepare(`
    INSERT INTO auth_attempts (ip_hash, action, created_at)
    VALUES (?, ?, ?)
  `).bind(ipHash, action, (/* @__PURE__ */ new Date()).toISOString()).run();
}
async function hashIPForAuth(ip) {
  if (!ip) return "";
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}
async function verifyPassword(password, storedHash) {
  if (!storedHash.includes(":")) {
    const encoder2 = new TextEncoder();
    const data = encoder2.encode(password);
    const hashBuffer2 = await crypto.subtle.digest("SHA-256", data);
    const legacyHash = Array.from(new Uint8Array(hashBuffer2)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (legacyHash === storedHash) {
      return true;
    }
    return false;
  }
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g).map((b) => parseInt(b, 16))
  );
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const computedHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return computedHash === hashHex;
}
function generateSessionToken() {
  return crypto.randomUUID();
}
async function login(request, env) {
  const body = await request.json();
  const email = body.email?.trim();
  const password = body.password;
  const turnstileToken = body["cf-turnstile-response"];
  if (!email || !password) {
    return json({ success: false, error: "Email and password required" }, 400);
  }
  const turnstileOk = await verifyTurnstile(turnstileToken, env);
  if (!turnstileOk) {
    return json({ success: false, error: "Security verification failed. Please try again." }, 403);
  }
  const ipHash = await hashIPForAuth(request.headers.get("CF-Connecting-IP"));
  const allowed = await checkRateLimit(env, ipHash, "login");
  if (!allowed) {
    return json({ success: false, error: "Too many attempts. Try again in 15 minutes." }, 429);
  }
  const user = await getUserByEmail(env.DB, email);
  if (!user) {
    await logFailedAttempt(env, ipHash, "login");
    return json({ success: false, error: "Invalid credentials" }, 401);
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    await logFailedAttempt(env, ipHash, "login");
    return json({ success: false, error: "Invalid credentials" }, 401);
  }
  const token = generateSessionToken();
  const expires = new Date(Date.now() + 1e3 * 60 * 60 * 24 * 30);
  await createSession(env.DB, token, user.id, expires.toISOString());
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`
    }
  });
}
async function logout(request, env) {
  const token = getCookie(
    request,
    "session"
  );
  if (token) {
    await deleteSession(
      env.DB,
      token
    );
  }
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/en/login",
      "Set-Cookie": "session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    }
  });
}
async function getCurrentUser(request, env) {
  const token = getCookie(
    request,
    "session"
  );
  if (!token) {
    return null;
  }
  const session = await getSession(
    env.DB,
    token
  );
  if (!session) {
    return null;
  }
  if (new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
    return null;
  }
  return session;
}
async function requireAuth(request, env) {
  const session = await getCurrentUser(request, env);
  let user = null;
  if (session?.user_id) {
    user = await env.DB.prepare(
      "SELECT id, email, role FROM users WHERE id = ?"
    ).bind(session.user_id).first();
  }
  if (!user) {
    return new Response(
      "Unauthorized",
      {
        status: 401
      }
    );
  }
  return user;
}
function requireRole(user, role) {
  const hierarchy = {
    viewer: 1,
    editor: 2,
    admin: 3
  };
  return hierarchy[user.role] >= hierarchy[role];
}
function getCookie(request, name) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) {
    return null;
  }
  const parts = cookie.split(";");
  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === name) {
      return value;
    }
  }
  return null;
}
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
async function register(request, env) {
  const body = await request.json();
  const email = body.email?.trim();
  const password = body.password;
  const turnstileToken = body["cf-turnstile-response"];
  if (!email || !password) {
    return json({ success: false, error: "Missing fields" }, 400);
  }
  if (password.length < 8) {
    return json({ success: false, error: "Password must be at least 8 characters" }, 400);
  }
  const turnstileOk = await verifyTurnstile(turnstileToken, env);
  if (!turnstileOk) {
    return json({ success: false, error: "Security verification failed. Please try again." }, 403);
  }
  const ipHash = await hashIPForAuth(request.headers.get("CF-Connecting-IP"));
  const allowed = await checkRateLimit(env, ipHash, "register");
  if (!allowed) {
    return json({ success: false, error: "Too many attempts. Try again in 15 minutes." }, 429);
  }
  const existing = await getUserByEmail(env.DB, email);
  if (existing) {
    await logFailedAttempt(env, ipHash, "register");
    return json({ success: false, error: "User already exists" }, 409);
  }
  const passwordHash = await hashPassword(password);
  await env.DB.prepare(`
    INSERT INTO users(email, password_hash, role)
    VALUES (?, ?, 'editor')
  `).bind(email, passwordHash).run();
  return json({ success: true });
}
var init_auth = __esm({
  "en/worker/auth.js"() {
    init_users();
    __name(verifyTurnstile, "verifyTurnstile");
    __name(checkRateLimit, "checkRateLimit");
    __name(logFailedAttempt, "logFailedAttempt");
    __name(hashIPForAuth, "hashIPForAuth");
    __name(hashPassword, "hashPassword");
    __name(verifyPassword, "verifyPassword");
    __name(generateSessionToken, "generateSessionToken");
    __name(login, "login");
    __name(logout, "logout");
    __name(getCurrentUser, "getCurrentUser");
    __name(requireAuth, "requireAuth");
    __name(requireRole, "requireRole");
    __name(getCookie, "getCookie");
    __name(json, "json");
    __name(register, "register");
  }
});

// en/worker/database/geo.js
var geo_exports = {};
__export(geo_exports, {
  deleteGeoRulesForCasino: () => deleteGeoRulesForCasino,
  getGeoRule: () => getGeoRule,
  getGeoRulesForCasino: () => getGeoRulesForCasino,
  saveGeoRule: () => saveGeoRule,
  setCasinoGeoRules: () => setCasinoGeoRules
});
async function getGeoRule(db, casinoSlug, countryCode) {
  return await db.prepare(`
      SELECT *
      FROM geo_rules
      WHERE casino_slug = ?
      AND country_code = ?
      LIMIT 1
    `).bind(casinoSlug, countryCode).first();
}
async function saveGeoRule(db, rule) {
  return db.prepare(`
 INSERT INTO geo_rules(
 casino_slug,
 country_code,
 status,
 bonus_override
 )
 VALUES(?,?,?,?)
 `).bind(
    rule.casino_slug,
    rule.country_code,
    rule.status,
    rule.bonus_override
  ).run();
}
async function getGeoRulesForCasino(db, casinoSlug) {
  const result = await db.prepare(`
      SELECT * FROM geo_rules
      WHERE casino_slug = ?
      ORDER BY country_code
    `).bind(casinoSlug).all();
  return result.results || [];
}
async function deleteGeoRulesForCasino(db, casinoSlug) {
  return await db.prepare(`
      DELETE FROM geo_rules
      WHERE casino_slug = ?
    `).bind(casinoSlug).run();
}
async function setCasinoGeoRules(db, casinoSlug, rules) {
  await deleteGeoRulesForCasino(db, casinoSlug);
  if (!rules.length) return;
  for (const rule of rules) {
    await db.prepare(`
        INSERT INTO geo_rules (casino_slug, country_code, status, bonus_override)
        VALUES (?, ?, ?, ?)
      `).bind(casinoSlug, rule.country_code, rule.status, rule.bonus_override || null).run();
  }
}
var init_geo = __esm({
  "en/worker/database/geo.js"() {
    __name(getGeoRule, "getGeoRule");
    __name(saveGeoRule, "saveGeoRule");
    __name(getGeoRulesForCasino, "getGeoRulesForCasino");
    __name(deleteGeoRulesForCasino, "deleteGeoRulesForCasino");
    __name(setCasinoGeoRules, "setCasinoGeoRules");
  }
});

// en/worker/routes.js
function getRoute(request) {
  const url = new URL(request.url);
  let path = url.pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  if (path === "/en" || path === "/en/home") {
    return {
      type: "home"
    };
  }
  if (path === "/en/casino") return { type: "casinoList" };
  if (path === "/en/review") return { type: "reviewList" };
  if (path === "/en/news") return { type: "newsList" };
  const casinoMatch = path.match(/^\/en\/casino\/([^/]+)$/);
  if (casinoMatch) {
    return {
      type: "casino",
      slug: casinoMatch[1]
    };
  }
  const reviewMatch = path.match(/^\/en\/review\/([^/]+)$/);
  if (reviewMatch) {
    return {
      type: "review",
      slug: reviewMatch[1]
    };
  }
  const newsMatch = path.match(/^\/en\/news\/([^/]+)$/);
  if (newsMatch) {
    return {
      type: "news",
      slug: newsMatch[1]
    };
  }
  const countryMatch = path.match(/^\/en\/country\/([^\/]+)$/);
  if (countryMatch) {
    return {
      type: "country",
      slug: countryMatch[1]
    };
  }
  const categoryMatch = path.match(/^\/en\/category\/([^\/]+)$/);
  if (categoryMatch) {
    return {
      type: "category",
      slug: categoryMatch[1]
    };
  }
  const affiliateMatch = path.match(/^\/en\/affiliate\/([^\/]+)$/);
  if (affiliateMatch) {
    return {
      type: "affiliate",
      slug: affiliateMatch[1]
    };
  }
  const goMatch = path.match(/^\/en\/go\/([^\/]+)$/);
  if (goMatch) {
    return {
      type: "go",
      slug: goMatch[1]
    };
  }
  if (path === "/en/dashboard") return { type: "dashboard" };
  if (path === "/en/dashboard/casinos") return { type: "dashboardCasinos" };
  if (path === "/en/dashboard/casino/create") return { type: "dashboardCasinoCreate" };
  if (path === "/en/dashboard/reviews") return { type: "dashboardReviews" };
  if (path === "/en/dashboard/news") return { type: "dashboardNews" };
  if (path === "/en/dashboard/pages") return { type: "dashboardPages" };
  if (path === "/en/dashboard/settings") return { type: "dashboardSettings" };
  if (path === "/en/dashboard/ai") return { type: "dashboardAI" };
  if (path === "/en/category") return { type: "categoryList" };
  if (path === "/en/country") return { type: "countryList" };
  if (path === "/en/dashboard/categories") return { type: "dashboardCategories" };
  if (path === "/en/dashboard/countries") return { type: "dashboardCountries" };
  const casinoEditMatch = path.match(/^\/en\/dashboard\/casino\/edit\/([^/]+)$/);
  if (casinoEditMatch) return { type: "dashboardCasinoEdit", slug: casinoEditMatch[1] };
  if (path === "/en/login") {
    return {
      type: "login"
    };
  }
  if (path === "/en/register") {
    return {
      type: "register"
    };
  }
  if (path === "/en/user/dashboard") return { type: "userDashboard" };
  if (path === "/en/user/submit-casino") return { type: "userSubmitCasino" };
  if (path === "/en/user/inquiries") return { type: "userInquiries" };
  if (path === "/en/user/profile") return { type: "userProfile" };
  if (path === "/en/user/notifications") return { type: "userNotifications" };
  if (path.startsWith("/api/") || path.startsWith("/en/api/")) {
    return {
      type: "api",
      path: path.replace(/^\/en/, "")
    };
  }
  if (path === "/sitemap.xml") {
    return {
      type: "sitemap"
    };
  }
  if (path === "/sitemap-casinos.xml") {
    return {
      type: "sitemap-casinos"
    };
  }
  if (path === "/sitemap-reviews.xml") {
    return {
      type: "sitemap-reviews"
    };
  }
  if (path === "/robots.txt") {
    return {
      type: "robots"
    };
  }
  const dynamicPage = path.match(/^\/en\/(.+)$/);
  if (dynamicPage) {
    return {
      type: "page",
      slug: dynamicPage[1]
    };
  }
  return {
    type: "not_found"
  };
}
__name(getRoute, "getRoute");

// en/worker/render.js
var Renderer = class {
  static {
    __name(this, "Renderer");
  }
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
    return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  buildSEO(data = {}) {
    const title = data.seo_title || "Level Casino \u2014 Expert Casino Reviews";
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
<\/script>
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
      const parts = breadcrumbs.map(
        (c) => c.url ? `<a href="${c.url}">${c.label}</a>` : `<span class="breadcrumb-current">${c.label}</span>`
      );
      breadcrumbHtml = `<nav class="breadcrumbs" id="breadcrumbs">${parts.join(" / ")}</nav>`;
    }
    base = await this.injectComponents(base, breadcrumbHtml);
    return base;
  }
};

// en/worker/controllers.js
init_categories();

// en/worker/database/casinos.js
async function getCasino(db, slug) {
  return await db.prepare(`
      SELECT * FROM casinos
      WHERE slug = ? AND published = 1 AND status = 'published'
      LIMIT 1
    `).bind(slug).first();
}
__name(getCasino, "getCasino");
async function getAllCasinos(db) {
  const result = await db.prepare(`
      SELECT * FROM casinos
      WHERE published = 1 AND status = 'published'
      ORDER BY featured DESC, sort_order ASC, rating DESC
    `).all();
  return result.results;
}
__name(getAllCasinos, "getAllCasinos");
async function createCasino(db, casino) {
  const result = await db.prepare(`
      INSERT INTO casinos (
        slug,
        name,
        logo,
        website_url,
        affiliate_url,
        rating,
        bonus_title,
        bonus_value,
        features,
        seo_title,
        seo_description,
        featured,
        sort_order,
        status,
        logo_media_id,
        hero_image_media_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
    casino.slug,
    casino.name,
    casino.logo,
    casino.website_url,
    casino.affiliate_url,
    casino.rating || 0,
    casino.bonus_title,
    casino.bonus_value,
    JSON.stringify(casino.features || []),
    casino.seo_title,
    casino.seo_description,
    casino.featured || 0,
    casino.sort_order || 0,
    casino.status || "draft",
    casino.logo_media_id || null,
    casino.hero_image_media_id || null
  ).run();
  return result.meta.last_row_id;
}
__name(createCasino, "createCasino");
async function updateCasino(db, slug, casino) {
  return await db.prepare(`
      UPDATE casinos
      SET
        name = ?,
        logo = ?,
        website_url = ?,
        affiliate_url = ?,
        rating = ?,
        bonus_title = ?,
        bonus_value = ?,
        features = ?,
        seo_title = ?,
        seo_description = ?,
        featured = ?,
        sort_order = ?,
        status = ?,
        logo_media_id = ?,
        hero_image_media_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?
    `).bind(
    casino.name,
    casino.logo,
    casino.website_url,
    casino.affiliate_url,
    casino.rating,
    casino.bonus_title,
    casino.bonus_value,
    JSON.stringify(casino.features || []),
    casino.seo_title,
    casino.seo_description,
    casino.featured || 0,
    casino.sort_order || 0,
    casino.status || "draft",
    casino.logo_media_id || null,
    casino.hero_image_media_id || null,
    slug
  ).run();
}
__name(updateCasino, "updateCasino");
async function deleteCasino(db, slug) {
  return await db.prepare(`
      DELETE FROM casinos
      WHERE slug = ?
    `).bind(slug).run();
}
__name(deleteCasino, "deleteCasino");
async function setCasinoCategories(db, casino_id, category_ids) {
  await db.prepare(`
    DELETE FROM casino_categories
    WHERE casino_id = ?
  `).bind(casino_id).run();
  if (!category_ids.length) {
    return;
  }
  for (const category_id of category_ids) {
    await db.prepare(`
      INSERT INTO casino_categories (
        casino_id,
        category_id
      )
      VALUES (?, ?)
    `).bind(casino_id, category_id).run();
  }
}
__name(setCasinoCategories, "setCasinoCategories");
async function getCasinoIdBySlug(db, slug) {
  const row = await db.prepare(`
    SELECT id
    FROM casinos
    WHERE slug = ?
    LIMIT 1
  `).bind(slug).first();
  return row?.id ?? null;
}
__name(getCasinoIdBySlug, "getCasinoIdBySlug");
async function getCasinosByCountryAllowlist(db, countryCode) {
  const result = await db.prepare(`
      SELECT c.* FROM casinos c
      WHERE c.published = 1 AND c.status = 'published'
      AND c.slug IN (
        SELECT casino_slug FROM geo_rules
        WHERE country_code = ? AND status = 'allowed'
      )
      ORDER BY c.featured DESC, c.sort_order ASC, c.rating DESC
    `).bind(countryCode).all();
  return result.results;
}
__name(getCasinosByCountryAllowlist, "getCasinosByCountryAllowlist");

// en/worker/controllers.js
init_reviews();
init_pages();
init_countries();

// en/worker/database/news.js
async function getNews(db, slug) {
  return db.prepare(`
    SELECT *
    FROM news
    WHERE slug=?
    LIMIT 1
  `).bind(slug).first();
}
__name(getNews, "getNews");
async function getAllNews(db) {
  const result = await db.prepare(`
      SELECT *
      FROM news
      WHERE published=1
      ORDER BY created_at DESC
    `).all();
  return result.results || [];
}
__name(getAllNews, "getAllNews");
async function createNews(db, data) {
  return db.prepare(`
    INSERT INTO news(
      slug,
      title,
      content,
      author,
      seo_title,
      seo_description
    )
    VALUES(
      ?,?,?,?,?,?
    )
  `).bind(
    data.slug,
    data.title,
    data.content,
    data.author || "Admin",
    data.seo_title,
    data.seo_description
  ).run();
}
__name(createNews, "createNews");
async function updateNews(db, slug, data) {
  return db.prepare(`
    UPDATE news
    SET
      title=?,
      content=?,
      seo_title=?,
      seo_description=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE slug=?
  `).bind(
    data.title,
    data.content,
    data.seo_title,
    data.seo_description,
    slug
  ).run();
}
__name(updateNews, "updateNews");
async function deleteNews(db, slug) {
  return db.prepare(`
    DELETE FROM news
    WHERE slug=?
  `).bind(slug).run();
}
__name(deleteNews, "deleteNews");

// en/worker/database/clicks.js
async function logClick(db, casinoSlug, country, city, ipHash, userAgent) {
  return await db.prepare(`
      INSERT INTO clicks (
        casino_slug,
        country_code,
        city,
        ip_hash,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?)
    `).bind(
    casinoSlug,
    country,
    city,
    ipHash,
    userAgent
  ).run();
}
__name(logClick, "logClick");

// en/worker/controllers.js
init_auth();
init_geo();

// en/worker/geo.js
var geoEngine = {
  process(request, edgeGeo) {
    const url = new URL(request.url);
    const overrideCountry = url.searchParams.get("geo");
    const country = overrideCountry ? overrideCountry.toUpperCase() : edgeGeo.country || "RW";
    const city = overrideCountry ? "Simulated City" : edgeGeo.city || "Unknown";
    return {
      country,
      city,
      isSimulated: !!overrideCountry,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  },
  /**
   * Evaluates country status against a casino's geo-distribution rule matrix
   */
  evaluateAccess(geoRules, userCountry) {
    const rule = geoRules.find((r) => r.country === userCountry);
    if (rule) {
      return {
        status: rule.status,
        // 'allowed', 'blocked', 'restricted'
        bonusOverride: rule.bonus_override || null,
        notes: rule.notes || ""
      };
    }
    return {
      status: "allowed",
      bonusOverride: null,
      notes: "Default settings applied"
    };
  }
};

// en/worker/controllers.js
var COUNTRY_NAMES = {
  RW: "Rwanda",
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
  CN: "China",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  EG: "Egypt",
  MA: "Morocco",
  GH: "Ghana",
  TZ: "Tanzania",
  UG: "Uganda",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  PT: "Portugal",
  GR: "Greece",
  TR: "Turkey",
  RU: "Russia",
  UA: "Ukraine",
  RO: "Romania",
  CZ: "Czech Republic",
  HU: "Hungary",
  SK: "Slovakia",
  BG: "Bulgaria",
  HR: "Croatia",
  RS: "Serbia",
  SI: "Slovenia",
  LT: "Lithuania",
  LV: "Latvia",
  EE: "Estonia",
  IE: "Ireland",
  BE: "Belgium",
  LU: "Luxembourg",
  AT: "Austria",
  CH: "Switzerland",
  IS: "Iceland",
  MT: "Malta",
  CY: "Cyprus",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  QA: "Qatar",
  KW: "Kuwait",
  BH: "Bahrain",
  OM: "Oman",
  JO: "Jordan",
  LB: "Lebanon",
  IL: "Israel",
  PK: "Pakistan",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  ID: "Indonesia",
  MY: "Malaysia",
  SG: "Singapore",
  KR: "South Korea",
  HK: "Hong Kong",
  TW: "Taiwan",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  VE: "Venezuela",
  EC: "Ecuador",
  UY: "Uruguay",
  PY: "Paraguay",
  BO: "Bolivia",
  DO: "Dominican Republic",
  CR: "Costa Rica",
  PA: "Panama",
  GT: "Guatemala",
  HN: "Honduras",
  SV: "El Salvador",
  NI: "Nicaragua",
  CU: "Cuba",
  JM: "Jamaica",
  TT: "Trinidad and Tobago",
  BS: "Bahamas",
  BB: "Barbados"
};
function countryFullName(code) {
  return COUNTRY_NAMES[code] || code;
}
__name(countryFullName, "countryFullName");
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
__name(buildBreadcrumbs, "buildBreadcrumbs");
async function renderHome(request, env) {
  const renderer = new Renderer(env);
  const casinoList = await getAllCasinos(env.DB);
  const geoData = await prepareGeoData(env, request, casinoList);
  const sortedCasinos = sortCasinosByGeo(casinoList, geoData);
  const available = sortedCasinos.filter(
    (c) => geoData.statuses[c.slug] !== "blocked" && geoData.statuses[c.slug] !== "restricted"
  );
  const others = sortedCasinos.filter(
    (c) => geoData.statuses[c.slug] === "blocked" || geoData.statuses[c.slug] === "restricted"
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
    seo_title: "Level Casino \u2014 Expert Casino Reviews & Bonuses",
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
__name(renderHome, "renderHome");
async function renderCasino(request, env, slug) {
  const casino = await getCasino(env.DB, slug);
  if (!casino) return render404(request, env);
  const renderer = new Renderer(env);
  let features = [];
  try {
    features = JSON.parse(casino.features || "[]");
  } catch {
    features = [];
  }
  const featuresHtml = features.map((f) => `<span class="feature-tag">${f}</span>`).join("");
  const rating = casino.rating || 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const ratingDisplay = "\u2605".repeat(fullStars) + (hasHalf ? "\xBD" : "") + "\u2606".repeat(5 - fullStars - (hasHalf ? 1 : 0));
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
__name(renderCasino, "renderCasino");
function countryToFlag(code) {
  if (!code || code.length !== 2) return "\u{1F3F3}";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));
}
__name(countryToFlag, "countryToFlag");
async function prepareGeoData(env, request, casinoList) {
  const edgeGeo = {
    country: request.cf?.country || "RW",
    city: request.cf?.city || "Unknown"
  };
  const geoInfo = geoEngine.process(request, edgeGeo);
  const slugs = casinoList.map((c) => c.slug);
  if (slugs.length === 0) return { country: geoInfo.country, statuses: {} };
  const placeholders = slugs.map(() => "?").join(",");
  const result = await env.DB.prepare(`
    SELECT casino_slug, country_code, status FROM geo_rules
    WHERE casino_slug IN (${placeholders})
  `).bind(...slugs).all();
  const rulesByCasino = {};
  for (const row of result.results || []) {
    if (!rulesByCasino[row.casino_slug]) rulesByCasino[row.casino_slug] = [];
    rulesByCasino[row.casino_slug].push(row);
  }
  const statuses = {};
  for (const slug of slugs) {
    const rules = rulesByCasino[slug] || [];
    if (rules.length === 0) {
      statuses[slug] = "blocked";
    } else {
      const countryRule = rules.find((r) => r.country_code === geoInfo.country);
      if (countryRule) {
        statuses[slug] = countryRule.status;
      } else {
        const hasAllowed = rules.some((r) => r.status === "allowed");
        const hasBlocked = rules.some((r) => r.status === "blocked");
        if (hasAllowed && !hasBlocked) {
          statuses[slug] = "blocked";
        } else if (hasBlocked && !hasAllowed) {
          statuses[slug] = "allowed";
        } else {
          statuses[slug] = "blocked";
        }
      }
    }
  }
  return { country: geoInfo.country, statuses };
}
__name(prepareGeoData, "prepareGeoData");
async function evaluateCasinoGeo(env, casinoSlug, countryCode) {
  const result = await env.DB.prepare(`
    SELECT country_code, status FROM geo_rules
    WHERE casino_slug = ?
  `).bind(casinoSlug).all();
  const rules = result.results || [];
  if (rules.length === 0) return "blocked";
  const countryRule = rules.find((r) => r.country_code === countryCode);
  if (countryRule) return countryRule.status;
  const hasAllowed = rules.some((r) => r.status === "allowed");
  const hasBlocked = rules.some((r) => r.status === "blocked");
  if (hasAllowed && !hasBlocked) return "not allowed";
  if (hasBlocked && !hasAllowed) return "allowed";
  return "blocked";
}
__name(evaluateCasinoGeo, "evaluateCasinoGeo");
function sortCasinosByGeo(casinoList, geoData) {
  if (!geoData) return casinoList;
  const allowed = casinoList.filter((c) => geoData.statuses[c.slug] !== "blocked" && geoData.statuses[c.slug] !== "restricted");
  const blocked = casinoList.filter((c) => geoData.statuses[c.slug] === "blocked" || geoData.statuses[c.slug] === "restricted");
  allowed.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  blocked.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return [...allowed, ...blocked];
}
__name(sortCasinosByGeo, "sortCasinosByGeo");
function buildCasinoCards(casinoList, geoData = null) {
  return casinoList.map((casino) => {
    const flag = geoData ? countryToFlag(geoData.country) : "";
    const geoStatus = geoData ? geoData.statuses[casino.slug] || "unknown" : "unknown";
    let geoIcon, geoClass, geoLabel;
    if (geoStatus === "allowed") {
      geoIcon = "\u2713";
      geoClass = "geo-badge--allowed";
      geoLabel = "Available";
    } else if (geoStatus === "blocked") {
      geoIcon = "\u2715";
      geoClass = "geo-badge--blocked";
      geoLabel = "Not Available";
    } else {
      geoIcon = "?";
      geoClass = "geo-badge--unknown";
      geoLabel = "Unknown";
    }
    const geoBadge = geoData ? `
      <div class="geo-badge ${geoClass}" title="${geoLabel} in ${countryFullName(geoData.country)}">
        <span class="geo-badge__flag">${flag}</span>
        <span class="geo-badge__icon">${geoIcon}</span>
      </div>` : "";
    const geoStatusText = geoData ? `
  <div class="casino-card__geo-status geo-${geoStatus}">
    ${flag} ${geoLabel} for players from ${countryFullName(geoData.country)}
  </div>` : "";
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
        <img src="${casino.logo || "/static/images/logo.png"}" alt="${casino.name}" class="casino-card__logo" onerror="this.src='/en/static/images/logo.png'" loading="lazy">
        <div class="casino-card__rating">${"\u2605".repeat(Math.round(casino.rating))}${"\u2606".repeat(5 - Math.round(casino.rating))}</div>
      </div>
      <div class="casino-card__body">
        <h3>${casino.name}</h3>
        <div class="casino-card__bonus">
          <span class="bonus-title">${casino.bonus_title || "Welcome Bonus"}</span>
          <span class="bonus-value">${casino.bonus_value || ""}</span>
        </div>
        ${geoStatusText}
        ${complianceHtml}
      </div>
      <div class="casino-card__actions">
        <a href="/en/casino/${casino.slug}" class="btn btn--secondary">Review</a>
        <a href="/en/go/${casino.slug}" class="btn btn--primary" rel="nofollow sponsored">Visit</a>
      </div>
    </div>`;
  }).join("");
}
__name(buildCasinoCards, "buildCasinoCards");
function buildReviewCasinoCards(casinoList, geoData = null) {
  return casinoList.map((casino) => {
    const flag = geoData ? countryToFlag(geoData.country) : "";
    const geoStatus = geoData ? geoData.statuses[casino.slug] || "unknown" : "unknown";
    let geoIcon, geoClass, geoLabel;
    if (geoStatus === "allowed") {
      geoIcon = "\u2713";
      geoClass = "geo-badge--allowed";
      geoLabel = "Available";
    } else if (geoStatus === "blocked") {
      geoIcon = "\u2715";
      geoClass = "geo-badge--blocked";
      geoLabel = "Not Available";
    } else {
      geoIcon = "\u2715";
      geoClass = "geo-badge--unknown";
      geoLabel = "not Available";
    }
    const geoBadge = geoData ? `
      <div class="geo-badge ${geoClass}" title="${geoLabel} in ${countryFullName(geoData.country)}">
        <span class="geo-badge__flag">${flag}</span>
        <span class="geo-badge__icon">${geoIcon}</span>
      </div>` : "";
    const geoStatusText = geoData ? `
  <div class="casino-card__geo-status geo-${geoStatus}">
    ${flag} ${geoLabel} for players from ${countryFullName(geoData.country)}
  </div>` : "";
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
        <img src="${casino.logo || "/static/images/logo.png"}" alt="${casino.name}" class="casino-card__logo" onerror="this.src='/en/static/images/logo.png'" loading="lazy">
        <div class="casino-card__rating">${"\u2605".repeat(Math.round(casino.rating))}${"\u2606".repeat(5 - Math.round(casino.rating))}</div>
      </div>
      <div class="casino-card__body">
        <h3>${casino.name} Review</h3>
        <div class="casino-card__bonus">
          <span class="bonus-title">${casino.bonus_title || "Welcome Bonus"}</span>
          <span class="bonus-value">${casino.bonus_value || ""}</span>
        </div>
        ${geoStatusText}
        ${complianceHtml}
      </div>
      <div class="casino-card__actions">
        <a href="/en/go/${casino.slug}" class="btn btn--primary" rel="nofollow sponsored">Visit</a>
      </div>
    </div>`;
  }).join("");
}
__name(buildReviewCasinoCards, "buildReviewCasinoCards");
async function renderReview(request, env, slug) {
  const review = await getReview(env.DB, slug);
  if (!review) return render404(request, env);
  const renderer = new Renderer(env);
  let pros = [], cons = [];
  try {
    pros = JSON.parse(review.pros || "[]");
  } catch {
  }
  try {
    cons = JSON.parse(review.cons || "[]");
  } catch {
  }
  const prosHtml = pros.length ? `<ul>${pros.map((p) => `<li>${p}</li>`).join("")}</ul>` : "<p class='muted'>No pros listed.</p>";
  const consHtml = cons.length ? `<ul>${cons.map((c) => `<li>${c}</li>`).join("")}</ul>` : "<p class='muted'>No cons listed.</p>";
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
    geoStatus = await evaluateCasinoGeo(env, review.casino_slug, geoInfo.country);
  }
  let casinoCardHtml = "";
  if (review.casino_slug) {
    const casino = await getCasino(env.DB, review.casino_slug);
    if (casino) {
      casinoCardHtml = buildReviewCasinoCards(
        [casino],
        {
          country: geoCountry,
          statuses: {
            [casino.slug]: geoStatus
          }
        }
      );
    }
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
      "name": "Elie"
    }
  };
  const html = await renderer.render("review.html", {
    ...review,
    canonical: `https://level.casino/en/review/${slug}`,
    pros_html: prosHtml,
    cons_html: consHtml,
    casino_card_html: casinoCardHtml,
    casino_slug: review.casino_slug || "",
    geo_country: countryFullName(geoCountry),
    geo_status: geoStatus,
    geo_flag: geoFlag
  }, reviewSchema, buildBreadcrumbs("review", { title: review.title }));
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
__name(renderReview, "renderReview");
async function renderNews(request, env, slug) {
  const article = await getNews(
    env.DB,
    slug
  );
  if (!article) {
    return render404(request, env);
  }
  const renderer = new Renderer(env);
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
  const html = await renderer.render(
    "news.html",
    { ...article, canonical: `https://level.casino/en/news/${slug}` },
    article,
    newsSchema,
    buildBreadcrumbs("news", { title: article.title })
  );
  return new Response(
    html,
    {
      headers: {
        "Content-Type": "text/html"
      }
    }
  );
}
__name(renderNews, "renderNews");
async function hashIP(ip) {
  if (!ip) {
    return "";
  }
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );
  return Array.from(
    new Uint8Array(hash)
  ).map(
    (b) => b.toString(16).padStart(2, "0")
  ).join("");
}
__name(hashIP, "hashIP");
async function handleAffiliateRedirect(request, env, slug) {
  const casino = await getCasino(
    env.DB,
    slug
  );
  if (!casino) {
    return render404(request, env);
  }
  const ipHash = await hashIP(
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
__name(handleAffiliateRedirect, "handleAffiliateRedirect");
async function renderDashboardPage(request, env) {
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
  const template = user.role === "admin" ? "admin/dashboard.html" : "users/dashboard.html";
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
__name(renderDashboardPage, "renderDashboardPage");
async function dashboardStatsAPI(request, env) {
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
__name(dashboardStatsAPI, "dashboardStatsAPI");
function robots() {
  return new Response(
    `User-agent: *
Allow: /

Sitemap:
https://level.casino/sitemap.xml`,
    {
      headers: {
        "Content-Type": "text/plain"
      }
    }
  );
}
__name(robots, "robots");
async function renderCountry(request, env, slug) {
  const code = slug.toUpperCase();
  const country = await getCountry(env.DB, code);
  const countryData = country || {
    code,
    name: code,
    seo_title: null,
    seo_description: null
  };
  const casinoList = await getCasinosByCountryAllowlist(env.DB, code);
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
__name(renderCountry, "renderCountry");
async function renderCategory(request, env, slug) {
  const category = await getCategory(env.DB, slug);
  if (!category) return render404(request, env);
  const casinoList = await getCategoryCasinos(env.DB, slug);
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
__name(renderCategory, "renderCategory");
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
__name(parseContentJson, "parseContentJson");
async function renderDynamicPage(request, env, slug) {
  const page = await getPage(env.DB, slug);
  if (!page) return render404(request, env);
  const renderer = new Renderer(env);
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
  }, pageSchema, buildBreadcrumbs("page", { title: page.title }));
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
__name(renderDynamicPage, "renderDynamicPage");
async function renderAffiliate(request, env, slug) {
  const page = await getPage(env.DB, slug);
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
__name(renderAffiliate, "renderAffiliate");
async function renderLogin(request, env) {
  const renderer = new Renderer(env);
  const html = await renderer.render(
    "login.html",
    {
      seo_title: "Login",
      seo_description: "Level Casino Login",
      canonical: "https://level.casino/en/login"
    }
  );
  return new Response(
    html,
    {
      headers: {
        "Content-Type": "text/html"
      }
    }
  );
}
__name(renderLogin, "renderLogin");
async function renderRegister(request, env) {
  const renderer = new Renderer(env);
  const html = await renderer.render(
    "register.html",
    {
      seo_title: "Register",
      seo_description: "Create Level Casino account",
      canonical: "https://level.casino/en/register"
    }
  );
  return new Response(
    html,
    {
      headers: {
        "Content-Type": "text/html"
      }
    }
  );
}
__name(renderRegister, "renderRegister");
async function render404(request, env) {
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
__name(render404, "render404");
async function renderCasinoList(request, env) {
  const renderer = new Renderer(env);
  const casinoList = await getAllCasinos(env.DB);
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
    seo_title: "All Online Casinos \u2014 Level Casino",
    seo_description: "Complete directory of reviewed online casinos with bonuses and ratings."
  }, listSchema, buildBreadcrumbs("casinoList"));
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
__name(renderCasinoList, "renderCasinoList");
async function renderReviewList(request, env) {
  const renderer = new Renderer(env);
  const reviewList = await env.DB.prepare(
    "SELECT * FROM reviews WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  const reviewCards = (reviewList.results || []).map((r) => `
    <div class="casino-card">
      <div class="casino-card__body">
        <h3><a href="/en/review/${r.slug}">${r.title}</a></h3>
        <div class="casino-card__rating">\u2605 ${r.rating || "N/A"}</div>
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
    seo_title: "All Casino Reviews \u2014 Level Casino",
    seo_description: "In-depth casino reviews with pros, cons, and ratings."
  }, listSchema, buildBreadcrumbs("reviewList"));
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
__name(renderReviewList, "renderReviewList");
async function renderNewsList(request, env) {
  const renderer = new Renderer(env);
  const newsList = await getAllNews(env.DB);
  const newsCards = newsList.map((n) => `
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
    seo_title: "Casino News \u2014 Level Casino",
    seo_description: "Latest iGaming and online casino industry news."
  }, listSchema, buildBreadcrumbs("newsList"));
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
__name(renderNewsList, "renderNewsList");
async function renderAdminPage(request, env, template, extraData = {}) {
  const user = await getCurrentUser(request, env);
  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }
  const renderer = new Renderer(env);
  const html = await renderer.render(template, {
    canonical: "https://level.casino/en/news",
    seo_title: "Admin \u2014 Level Casino",
    seo_description: "Level Casino CMS Admin",
    ...extraData
  });
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
__name(renderAdminPage, "renderAdminPage");
async function renderDashboardCasinos(request, env) {
  return renderAdminPage(request, env, "admin/casinos.html");
}
__name(renderDashboardCasinos, "renderDashboardCasinos");
async function renderDashboardCasinoCreate(request, env) {
  return renderAdminPage(request, env, "admin/casino-create.html");
}
__name(renderDashboardCasinoCreate, "renderDashboardCasinoCreate");
async function renderDashboardReviews(request, env) {
  return renderAdminPage(request, env, "admin/reviews.html");
}
__name(renderDashboardReviews, "renderDashboardReviews");
async function renderDashboardNews(request, env) {
  return renderAdminPage(request, env, "admin/news.html");
}
__name(renderDashboardNews, "renderDashboardNews");
async function renderDashboardPages(request, env) {
  return renderAdminPage(request, env, "admin/pages.html");
}
__name(renderDashboardPages, "renderDashboardPages");
async function renderDashboardSettings(request, env) {
  return renderAdminPage(request, env, "admin/settings.html");
}
__name(renderDashboardSettings, "renderDashboardSettings");
async function renderDashboardAI(request, env) {
  return renderAdminPage(request, env, "admin/ai.html");
}
__name(renderDashboardAI, "renderDashboardAI");
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
    seo_title: "Level Casino \u2014 Dashboard",
    seo_description: "Manage your account",
    email: user.email,
    role: user.role
  });
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
__name(renderUserPage, "renderUserPage");
async function renderUserDashboard(request, env) {
  return renderUserPage(request, env, "users/dashboard.html");
}
__name(renderUserDashboard, "renderUserDashboard");
async function renderUserSubmitCasino(request, env) {
  return renderUserPage(request, env, "users/submit-casino.html");
}
__name(renderUserSubmitCasino, "renderUserSubmitCasino");
async function renderUserInquiries(request, env) {
  return renderUserPage(request, env, "users/inquiries.html");
}
__name(renderUserInquiries, "renderUserInquiries");
async function renderUserProfile(request, env) {
  return renderUserPage(request, env, "users/profile.html");
}
__name(renderUserProfile, "renderUserProfile");
async function renderUserNotifications(request, env) {
  return renderUserPage(request, env, "users/notifications.html");
}
__name(renderUserNotifications, "renderUserNotifications");
async function renderCategoryList(request, env) {
  const renderer = new Renderer(env);
  const cats = await getAllCategories(env.DB);
  const categoryCards = cats.map((c) => `
    <div class="feature-card">
      <h3><a href="/en/category/${c.slug}">${c.name}</a></h3>
      <p>${c.description || ""}</p>
    </div>
  `).join("");
  const html = await renderer.render("category.html", {
    category: "All Categories",
    description: "Browse casinos by category.",
    casino_cards: `<div class="features-grid">${categoryCards}</div>`,
    seo_title: "Casino Categories \u2014 Level Casino",
    seo_description: "Browse online casinos by category."
  }, {}, buildBreadcrumbs("categoryList"));
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
__name(renderCategoryList, "renderCategoryList");
async function renderCountryList(request, env) {
  const renderer = new Renderer(env);
  const countriesList = await getAllCountries(env.DB);
  const countryChips = countriesList.map((c) => `
    <a href="/en/country/${c.code}" class="chip">${c.name}</a>
  `).join("");
  const html = await renderer.render("category.html", {
    category: "All Countries",
    description: "Browse online casinos available in your country.",
    casino_cards: `<div class="country-chips" style="justify-content:center;padding:20px">${countryChips}</div>`,
    seo_title: "Online Casinos by Country \u2014 Level Casino",
    seo_description: "Find online casinos available in your country."
  }, {}, buildBreadcrumbs("countryList"));
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
__name(renderCountryList, "renderCountryList");
async function renderDashboardCategories(request, env) {
  return renderAdminPage(request, env, "admin/categories.html");
}
__name(renderDashboardCategories, "renderDashboardCategories");
async function renderDashboardCountries(request, env) {
  return renderAdminPage(request, env, "admin/countries.html");
}
__name(renderDashboardCountries, "renderDashboardCountries");
async function renderDashboardCasinoEdit(request, env, slug) {
  return renderAdminPage(request, env, "admin/casino-edit.html", { slug });
}
__name(renderDashboardCasinoEdit, "renderDashboardCasinoEdit");

// en/worker/api.js
init_reviews();
init_pages();
init_geo();

// en/worker/database/settings.js
async function saveSettings(db, settings) {
  for (const key in settings) {
    await db.prepare(`
  INSERT OR REPLACE INTO settings(
   key,
   value,
   updated_at
  )
  VALUES(
   ?,
   ?,
   CURRENT_TIMESTAMP
  )
  `).bind(
      key,
      String(settings[key])
    ).run();
  }
  return true;
}
__name(saveSettings, "saveSettings");

// en/worker/database/ai.js
async function logAIGeneration(db, entityType, entitySlug, prompt, model) {
  return await db.prepare(`
      INSERT INTO ai_generations (
        entity_type,
        entity_slug,
        prompt,
        model
      )
      VALUES (?, ?, ?, ?)
    `).bind(
    entityType,
    entitySlug,
    prompt,
    model
  ).run();
}
__name(logAIGeneration, "logAIGeneration");

// en/worker/api.js
init_categories();
init_auth();

// en/worker/ai.js
var aiEngine = {
  /**
   * Safe execution wrapper for Cloudflare's native Workers AI system
   */
  async runInference(env, model, inputs) {
    if (!env.AI) {
      console.warn("Workers AI binding is missing. Falling back to static values.");
      return null;
    }
    try {
      return await env.AI.run(model, inputs);
    } catch (error) {
      console.error(`Edge AI Inference Failure: ${error.message}`);
      return null;
    }
  },
  /**
   * Generates highly targeted, high-roller focused review copy on demand
   */
  async generateReviewSummary(env, casinoName, countryCode, languages = "English") {
    const model = "@cf/meta/llama-3-8b-instruct";
    const systemPrompt = `You are an expert iGaming industry copywriter specializing in premium, high-stakes casino analysis. 
Your target audience consists of high-rollers and VIP players. Write a compelling, factual 3-sentence evaluation summary. 
Focus on high-tier VIP reward transparency, cashout speed limits, and licensing authority trust factors. Do not use generic fluff.`;
    const userPrompt = `Write a premium localized casino review intro summary for "${casinoName}" customized specifically for players browsing from jurisdiction code: ${countryCode}. Output the final copy strictly in ${languages}.`;
    const result = await this.runInference(env, model, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 150
    });
    return result?.response ? result.response.trim() : `Premium review context for ${casinoName} tracking live under jurisdiction ${countryCode}.`;
  },
  /**
   * Generates hyper-optimized SEO titles and metadata objects for localized landing matrix variants
   */
  async generateDynamicSeo(env, targetDomain, contextData) {
    const model = "@cf/meta/llama-3-8b-instruct";
    const systemPrompt = `You are an elite SEO engineer managing the domain portfolio asset ${targetDomain}. 
Generate a strict JSON layout string containing a title tag and meta description optimized for Click-Through Rates (CTR). 
Never include code block wrappers like \`\`\`json in your response. Return raw plain-text valid JSON object only.`;
    const userPrompt = `Context: Type is ${contextData.type}, Slug is ${contextData.slug}, Target Country is ${contextData.country}. 
Create an localized SEO title (under 60 chars) and meta description (under 155 chars) targeting localized VIP casino search intent.`;
    const result = await this.runInference(env, model, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3
    });
    try {
      if (result?.response) {
        return JSON.parse(result.response.trim());
      }
    } catch (e) {
      console.error("AI returned malformed JSON structure:", e);
    }
    return {
      title: `${contextData.slug.toUpperCase()} Casino Review & VIP Sign-up Bonuses [Geo: ${contextData.country}]`,
      description: `Get real-time player data, active withdrawal framework details, and high-stakes match incentives for ${contextData.slug} inside ${contextData.country}.`
    };
  },
  /**
  * Generates a full-length casino review using Workers AI
  */
  async generateFullReview(env, casinoName, countryCode, slug) {
    const model = "@cf/meta/llama-3-8b-instruct";
    const systemPrompt = `You are an expert iGaming industry copywriter specializing in premium casino reviews.
Write a comprehensive, SEO-optimized casino review of at least 800 words.
Structure your response with clear sections: Overview, Games & Software, Bonuses & Promotions, Payment Methods, Licensing & Security, Pros & Cons, and FAQ.
Do not use markdown headers. Use plain text with section titles on their own line.`;
    const userPrompt = `Write a professional casino review for "${casinoName}" targeted at players from ${countryCode}.
Include specific pros and cons. Include a FAQ section with 3-5 questions.
Make it factual and avoid generic fluff.`;
    const result = await this.runInference(env, model, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 1200
    });
    return result?.response ? result.response.trim() : `${casinoName} is a premium online casino offering a comprehensive gaming experience for players in ${countryCode}. Contact your administrator to configure the AI binding for full review generation.`;
  }
};

// en/worker/api.js
async function handleAPI(request, env, path, user = null) {
  if (path === "/api/v1/auth/login") {
    return login(request, env);
  }
  if (path === "/api/v1/auth/register") {
    return register(request, env);
  }
  if (path === "/api/v1/auth/logout") {
    return logout(request, env);
  }
  if (path === "/api/v1/geo/check") {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    if (!slug) return failure("slug is required");
    const country = request.cf?.country || "RW";
    const allRules = await env.DB.prepare(`  
    SELECT country_code, status FROM geo_rules  
    WHERE casino_slug = ?  
  `).bind(slug).all();
    const rules = allRules.results || [];
    const countryRule = rules.find((r) => r.country_code === country);
    let status;
    if (countryRule) {
      status = countryRule.status;
    } else if (rules.length === 0) {
      status = "blocked";
    } else {
      const hasAllowed = rules.some((r) => r.status === "allowed");
      const hasBlocked = rules.some((r) => r.status === "blocked");
      if (hasAllowed && !hasBlocked) {
        status = "blocked";
      } else if (hasBlocked && !hasAllowed) {
        status = "allowed";
      } else {
        status = "blocked";
      }
    }
    const COUNTRY_NAMES2 = { RW: "Rwanda", US: "United States", CA: "Canada", GB: "United Kingdom", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain", NL: "Netherlands", AU: "Australia", NZ: "New Zealand", JP: "Japan", CN: "China", IN: "India", BR: "Brazil", MX: "Mexico", ZA: "South Africa", NG: "Nigeria", KE: "Kenya", EG: "Egypt", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland", PT: "Portugal", GR: "Greece", TR: "Turkey", RU: "Russia", UA: "Ukraine", AE: "United Arab Emirates", SA: "Saudi Arabia", QA: "Qatar", KR: "South Korea", TH: "Thailand", VN: "Vietnam", PH: "Philippines", ID: "Indonesia", MY: "Malaysia", SG: "Singapore", AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru", AT: "Austria", CH: "Switzerland", IE: "Ireland", BE: "Belgium", CZ: "Czech Republic", HU: "Hungary", RO: "Romania", BG: "Bulgaria", HR: "Croatia", MT: "Malta", CY: "Cyprus", LU: "Luxembourg", IS: "Iceland" };
    return json2({
      status,
      country,
      countryName: COUNTRY_NAMES2[country] || country,
      bonusOverride: countryRule?.bonus_override || null
    });
  }
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
    const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
    const hash = await hashPassword2(body.password);
    await env.DB.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')"
    ).bind(body.email, hash).run();
    return json2({ success: true, message: "Admin created. Remove this endpoint now." });
  }
  if (path === "/api/v1/public/reviews/list") {
    const result = await env.DB.prepare(`
    SELECT r.*, c.name as casino_name, c.logo as casino_logo
    FROM reviews r
    LEFT JOIN casinos c ON c.slug = r.casino_slug
    WHERE r.published = 1
    ORDER BY r.created_at DESC
  `).all();
    return json2({ reviews: result.results });
  }
  if (path === "/api/v1/public/casino-reviews") {
    const url = new URL(request.url);
    const casinoSlug = url.searchParams.get("casino_slug");
    if (!casinoSlug) return json2({ reviews: [] });
    const result = await env.DB.prepare(`
    SELECT * FROM reviews
    WHERE casino_slug = ? AND published = 1
    ORDER BY created_at DESC
  `).bind(casinoSlug).all();
    return json2({ reviews: result.results });
  }
  if (path === "/api/v1/public/casinos/list") {
    const casinos = await env.DB.prepare(`
    SELECT slug, name, logo, rating FROM casinos
    WHERE published = 1 AND status = 'published'
    ORDER BY featured DESC, sort_order ASC, rating DESC
  `).all();
    return json2({ casinos: casinos.results });
  }
  if (!user) {
    return failure("Unauthorized", 401);
  }
  const writeMethods = ["POST", "PUT", "DELETE"];
  if (writeMethods.includes(request.method) && user.role !== "admin") {
    return json2({
      success: false,
      error: "Forbidden"
    }, 403);
  }
  if (path === "/api/v1/dashboard") {
    return dashboardStatsAPI(request, env);
  }
  if (path === "/api/v1/old/geo/check") {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    if (!slug) return failure("slug is required");
    const country = request.cf?.country || "RW";
    const rule = await getGeoRule(env.DB, slug, country);
    if (rule) {
      return json2({
        status: rule.status,
        country,
        bonusOverride: rule.bonus_override || null
      });
    }
    return json2({
      status: "allowed",
      country,
      bonusOverride: null
    });
  }
  try {
    if (path === "/api/v1/casino/create" && request.method === "POST") {
      return createCasino2(request, env);
    }
    if (path === "/api/v1/casino/update" && request.method === "POST") {
      return updateCasino2(request, env);
    }
    if (path === "/api/v1/casino/delete" && request.method === "POST") {
      return deleteCasino2(request, env);
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
`).all();
      return json2({ casinos: casinos.results });
    }
    if (path === "/api/v1/reviews/list") {
      const result = await env.DB.prepare(`
    SELECT * FROM reviews WHERE published = 1 ORDER BY created_at DESC
  `).all();
      return json2({ reviews: result.results });
    }
    if (path === "/api/v1/news/list") {
      const result = await env.DB.prepare(`
    SELECT * FROM news WHERE published = 1 ORDER BY created_at DESC
  `).all();
      return json2({ news: result.results });
    }
    if (path === "/api/v1/pages/list") {
      const result = await env.DB.prepare(`
    SELECT * FROM pages ORDER BY created_at DESC
  `).all();
      return json2({ pages: result.results });
    }
    if (path === "/api/v1/categories/list") {
      const result = await env.DB.prepare(`
    SELECT * FROM categories ORDER BY name
  `).all();
      return json2({ categories: result.results });
    }
    if (path === "/api/v1/media/list") {
      const result = await env.DB.prepare(`
    SELECT * FROM media ORDER BY created_at DESC
  `).all();
      return json2({ media: result.results });
    }
    if (path === "/api/v1/settings/get") {
      const result = await env.DB.prepare(`
    SELECT key, value FROM settings
  `).all();
      const settings = {};
      for (const row of result.results) {
        settings[row.key] = row.value;
      }
      return json2({ settings });
    }
    if (path === "/api/v1/stats") {
      const casinos = await env.DB.prepare("SELECT COUNT(*) c FROM casinos").first();
      const reviews = await env.DB.prepare("SELECT COUNT(*) c FROM reviews").first();
      const clicks = await env.DB.prepare("SELECT COUNT(*) c FROM clicks").first();
      const pages = await env.DB.prepare("SELECT COUNT(*) c FROM pages").first();
      return json2({
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
      return json2({ casinos: result.results });
    }
    if (path === "/api/v1/stats/countries") {
      const result = await env.DB.prepare(`
      SELECT country_code, COUNT(*) as clicks
      FROM clicks
      GROUP BY country_code
      ORDER BY clicks DESC
      LIMIT 100
    `).all();
      return json2({ countries: result.results });
    }
    if (path === "/api/v1/news/create" && request.method === "POST") {
      return createNews2(request, env);
    }
    if (path === "/api/v1/news/update" && request.method === "POST") {
      return updateNews2(request, env);
    }
    if (path === "/api/v1/news/delete" && request.method === "POST") {
      return deleteNews2(request, env);
    }
    if (path === "/api/v1/review/create" && request.method === "POST") {
      return createReview2(request, env);
    }
    if (path === "/api/v1/review/update" && request.method === "POST") {
      return updateReview2(request, env);
    }
    if (path === "/api/v1/page/create" && request.method === "POST") {
      return createPage2(request, env);
    }
    if (path === "/api/v1/page/update" && request.method === "POST") {
      return updatePage2(request, env);
    }
    if (path === "/api/v1/geo/save" && request.method === "POST") {
      return saveGeoRule2(request, env);
    }
    if (path === "/api/v1/geo/sync" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["casino_slug", "rules"]);
      const { setCasinoGeoRules: setCasinoGeoRules2 } = await Promise.resolve().then(() => (init_geo(), geo_exports));
      await setCasinoGeoRules2(env.DB, body.casino_slug, body.rules);
      return success();
    }
    if (path === "/api/v1/geo/list" && request.method === "GET") {
      const url = new URL(request.url);
      const casinoSlug = url.searchParams.get("casino_slug");
      if (!casinoSlug) return failure("casino_slug is required");
      const { getGeoRulesForCasino: getGeoRulesForCasino2 } = await Promise.resolve().then(() => (init_geo(), geo_exports));
      const rules = await getGeoRulesForCasino2(env.DB, casinoSlug);
      return json2({ rules });
    }
    if (path === "/api/v1/ai/review" && request.method === "POST") {
      return generateReview(request, env);
    }
    if (path === "/api/v1/settings/save" && request.method === "POST") {
      return saveSettings2(request, env);
    }
    if (path === "/api/v1/category/create" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug", "name"]);
      await createCategory(env.DB, body);
      return success();
    }
    if (path === "/api/v1/category/update" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug", "name"]);
      const { updateCategory: updateCategory2 } = await Promise.resolve().then(() => (init_categories(), categories_exports));
      await updateCategory2(env.DB, body.slug, body);
      return success();
    }
    if (path === "/api/v1/category/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug"]);
      const { deleteCategory: deleteCategory2 } = await Promise.resolve().then(() => (init_categories(), categories_exports));
      await deleteCategory2(env.DB, body.slug);
      return success();
    }
    if (path === "/api/v1/country/create" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["code", "name"]);
      const { createCountry: createCountry2 } = await Promise.resolve().then(() => (init_countries(), countries_exports));
      await createCountry2(env.DB, body);
      return success();
    }
    if (path === "/api/v1/country/update" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["code", "name"]);
      const { updateCountry: updateCountry2 } = await Promise.resolve().then(() => (init_countries(), countries_exports));
      await updateCountry2(env.DB, body.code, body);
      return success();
    }
    if (path === "/api/v1/country/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["code"]);
      const { deleteCountry: deleteCountry2 } = await Promise.resolve().then(() => (init_countries(), countries_exports));
      await deleteCountry2(env.DB, body.code);
      return success();
    }
    if (path === "/api/v1/countries/list") {
      const result = await env.DB.prepare("SELECT * FROM countries ORDER BY name").all();
      return json2({ countries: result.results });
    }
    if (path === "/api/v1/review/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug"]);
      const { deleteReview: deleteReview2 } = await Promise.resolve().then(() => (init_reviews(), reviews_exports));
      await deleteReview2(env.DB, body.slug);
      return success();
    }
    if (path === "/api/v1/page/delete" && request.method === "POST") {
      const body = await request.json();
      validate(body, ["slug"]);
      const { deletePage: deletePage2 } = await Promise.resolve().then(() => (init_pages(), pages_exports));
      await deletePage2(env.DB, body.slug);
      return success();
    }
    return json2({
      success: false,
      error: "Endpoint not found"
    }, 404);
  } catch (error) {
    return json2({
      success: false,
      error: error.message
    }, 500);
  }
}
__name(handleAPI, "handleAPI");
function json2(data, status = 200) {
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
__name(json2, "json");
function success(data = {}) {
  return json2({
    success: true,
    ...data
  });
}
__name(success, "success");
function failure(message, status = 400) {
  return json2({
    success: false,
    error: message
  }, status);
}
__name(failure, "failure");
function validate(body, required) {
  for (const field of required) {
    if (body[field] === void 0 || body[field] === null || body[field] === "") {
      throw new Error(`${field} is required`);
    }
  }
}
__name(validate, "validate");
async function createCasino2(request, env) {
  const body = await request.json();
  validate(body, [
    "slug",
    "name",
    "affiliate_url"
  ]);
  const casinoId = await createCasino(env.DB, body);
  if (Array.isArray(body.category_ids)) {
    await setCasinoCategories(
      env.DB,
      casinoId,
      body.category_ids
    );
  }
  return success();
}
__name(createCasino2, "createCasino");
async function updateCasino2(request, env) {
  const body = await request.json();
  validate(body, [
    "slug",
    "name",
    "affiliate_url"
  ]);
  await updateCasino(
    env.DB,
    body.slug,
    body
  );
  const casinoId = await getCasinoIdBySlug(
    env.DB,
    body.slug
  );
  if (casinoId && Array.isArray(body.category_ids)) {
    await setCasinoCategories(
      env.DB,
      casinoId,
      body.category_ids
    );
  }
  return success();
}
__name(updateCasino2, "updateCasino");
async function deleteCasino2(request, env) {
  const body = await request.json();
  validate(body, ["slug"]);
  await deleteCasino(
    env.DB,
    body.slug
  );
  return success();
}
__name(deleteCasino2, "deleteCasino");
async function createReview2(request, env) {
  const body = await request.json();
  validate(body, ["slug", "title", "content", "casino_slug"]);
  await createReview(
    env.DB,
    body
  );
  return success();
}
__name(createReview2, "createReview");
async function updateReview2(request, env) {
  const body = await request.json();
  validate(body, ["slug", "title", "content"]);
  await updateReview(
    env.DB,
    body.slug,
    body
  );
  return success();
}
__name(updateReview2, "updateReview");
async function createPage2(request, env) {
  const body = await request.json();
  validate(body, ["slug", "type", "template", "title"]);
  await createPage(
    env.DB,
    body
  );
  return success();
}
__name(createPage2, "createPage");
async function updatePage2(request, env) {
  const body = await request.json();
  validate(body, ["slug", "title"]);
  await updatePage(
    env.DB,
    body.slug,
    body
  );
  return success();
}
__name(updatePage2, "updatePage");
async function saveGeoRule2(request, env) {
  const body = await request.json();
  validate(body, ["casino_slug", "country_code", "status"]);
  await saveGeoRule(
    env.DB,
    body
  );
  return success();
}
__name(saveGeoRule2, "saveGeoRule");
async function saveSettings2(request, env) {
  const body = await request.json();
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    return failure("Settings object cannot be empty");
  }
  await saveSettings(
    env.DB,
    body
  );
  return success();
}
__name(saveSettings2, "saveSettings");
async function generateReview(request, env) {
  const body = await request.json();
  validate(body, ["casino", "country", "slug"]);
  const content = await aiEngine.generateFullReview(
    env,
    body.casino,
    body.country,
    body.slug
  );
  await logAIGeneration(
    env.DB,
    "review",
    body.slug,
    `Full review generation for ${body.casino} (${body.country})`,
    "@cf/meta/llama-3-8b-instruct"
  );
  return json2({
    success: true,
    content
  });
}
__name(generateReview, "generateReview");
async function createNews2(request, env) {
  const body = await request.json();
  validate(body, [
    "slug",
    "title",
    "content"
  ]);
  await createNews(env.DB, body);
  return success();
}
__name(createNews2, "createNews");
async function updateNews2(request, env) {
  const body = await request.json();
  validate(body, [
    "slug",
    "title",
    "content"
  ]);
  await updateNews(
    env.DB,
    body.slug,
    body
  );
  return success();
}
__name(updateNews2, "updateNews");
async function deleteNews2(request, env) {
  const body = await request.json();
  validate(body, ["slug"]);
  await deleteNews(
    env.DB,
    body.slug
  );
  return success();
}
__name(deleteNews2, "deleteNews");

// en/worker/sitemap.js
var sitemapEngine = {
  async generate(db, type = "all") {
    if (!db) {
      return new Response("<error>D1 Connection Fault</error>", {
        status: 500,
        headers: { "Content-Type": "application/xml" }
      });
    }
    const currentDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    if (type === "all") {
      xml += `  <url>
    <loc>https://level.casino/en/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;
      xml += `  <url>
    <loc>https://level.casino/en/casino</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;
      xml += `  <url>
    <loc>https://level.casino/en/review</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
      xml += `  <url>
    <loc>https://level.casino/en/news</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
      xml += `  <url>
    <loc>https://level.casino/en/category</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      xml += `  <url>
    <loc>https://level.casino/en/country</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }
    if (type === "all" || type === "casinos") {
      const r = await db.prepare(`SELECT slug, updated_at FROM casinos WHERE published = 1 AND status = 'published' ORDER BY updated_at DESC LIMIT 1000`).all();
      (r.results || []).forEach((item) => {
        const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
        xml += `  <url>
    <loc>https://level.casino/en/casino/${item.slug}</loc>
    <lastmod>${lm}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      });
    }
    if (type === "all" || type === "reviews") {
      const r = await db.prepare(`SELECT slug, updated_at FROM reviews WHERE published = 1 ORDER BY updated_at DESC LIMIT 1000`).all();
      (r.results || []).forEach((item) => {
        const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
        xml += `  <url>
    <loc>https://level.casino/en/review/${item.slug}</loc>
    <lastmod>${lm}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }
    if (type === "all") {
      const r = await db.prepare(`SELECT slug, updated_at FROM news WHERE published = 1 ORDER BY created_at DESC LIMIT 500`).all();
      (r.results || []).forEach((item) => {
        const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
        xml += `  <url>
    <loc>https://level.casino/en/news/${item.slug}</loc>
    <lastmod>${lm}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      });
      const cr = await db.prepare(`SELECT slug FROM categories LIMIT 100`).all();
      (cr.results || []).forEach((item) => {
        xml += `  <url>
    <loc>https://level.casino/en/category/${item.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      });
      const ctr = await db.prepare(`SELECT code FROM countries LIMIT 250`).all();
      (ctr.results || []).forEach((item) => {
        xml += `  <url>
    <loc>https://level.casino/en/country/${item.code}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      });
      const pr = await db.prepare(`SELECT slug FROM pages WHERE published = 1 LIMIT 500`).all();
      (pr.results || []).forEach((item) => {
        xml += `  <url>
    <loc>https://level.casino/en/${item.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      });
    }
    xml += `</urlset>`;
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Robots-Tag": "index, follow",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }
};

// en/worker/index.js
init_auth();

// en/worker/cron.js
async function cleanupExpiredSessions(env) {
  await env.DB.prepare(`
        DELETE FROM sessions
        WHERE expires_at < CURRENT_TIMESTAMP
    `).run();
}
__name(cleanupExpiredSessions, "cleanupExpiredSessions");

// en/worker/index.js
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/static/") || url.pathname.startsWith("/en/static/")) {
      return env.ASSETS.fetch(request);
    }
    const route = getRoute(request);
    switch (route.type) {
      case "home":
        return renderHome(request, env);
      case "login":
        return renderLogin(
          request,
          env
        );
      case "register":
        return renderRegister(
          request,
          env
        );
      case "casino":
        return renderCasino(
          request,
          env,
          route.slug
        );
      case "review":
        return renderReview(
          request,
          env,
          route.slug
        );
      case "news":
        return renderNews(
          request,
          env,
          route.slug
        );
      case "country":
        return renderCountry(
          request,
          env,
          route.slug
        );
      case "category":
        return renderCategory(
          request,
          env,
          route.slug
        );
      case "affiliate":
        return renderAffiliate(
          request,
          env,
          route.slug
        );
      case "go":
        return handleAffiliateRedirect(
          request,
          env,
          route.slug
        );
      case "dashboard":
        return renderDashboardPage(
          request,
          env
        );
      case "casinoList":
        return renderCasinoList(request, env);
      case "reviewList":
        return renderReviewList(request, env);
      case "newsList":
        return renderNewsList(request, env);
      case "categoryList":
        return renderCategoryList(request, env);
      case "countryList":
        return renderCountryList(request, env);
      case "dashboardCasinos":
        return renderDashboardCasinos(request, env);
      case "dashboardCasinoCreate":
        return renderDashboardCasinoCreate(request, env);
      case "dashboardReviews":
        return renderDashboardReviews(request, env);
      case "dashboardNews":
        return renderDashboardNews(request, env);
      case "dashboardPages":
        return renderDashboardPages(request, env);
      case "dashboardSettings":
        return renderDashboardSettings(request, env);
      case "dashboardAI":
        return renderDashboardAI(request, env);
      case "dashboardCategories":
        return renderDashboardCategories(request, env);
      case "dashboardCountries":
        return renderDashboardCountries(request, env);
      case "dashboardCasinoEdit":
        return renderDashboardCasinoEdit(request, env, route.slug);
      case "userDashboard":
        return renderUserDashboard(request, env);
      case "userSubmitCasino":
        return renderUserSubmitCasino(request, env);
      case "userInquiries":
        return renderUserInquiries(request, env);
      case "userProfile":
        return renderUserProfile(request, env);
      case "userNotifications":
        return renderUserNotifications(request, env);
      case "api":
        const user = await getCurrentUser(
          request,
          env
        );
        return handleAPI(
          request,
          env,
          route.path,
          user
        );
      case "sitemap":
        return sitemapEngine.generate(env.DB, "all");
      case "sitemap-casinos":
        return sitemapEngine.generate(env.DB, "casinos");
      case "sitemap-reviews":
        return sitemapEngine.generate(env.DB, "reviews");
      case "robots":
        return robots();
      case "page":
        return renderDynamicPage(
          request,
          env,
          route.slug
        );
      case "not_found":
        return render404(request, env);
      default:
        return render404(request, env);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      cleanupExpiredSessions(env)
    );
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

--ab7a92e507ad3fe2c682c94bbcd85ea465731c4c52855a93edc134e0afcc--

Agent
Your sitemap has 7 critical issues preventing it from functioning at /en/. Here's the full analysis and production-ready fixes with exact code snippets.

Issues Found
#	Issue	Impact
1	Sitemap routes only exist at /sitemap.xml, not /en/sitemap.xml	/en/sitemap.xml falls through to the dynamic page handler → 404
2	robots.txt references https://level.casino/sitemap.xml (root, not /en/)	Search crawlers can't discover the sitemap at the correct path
3	createReview, createNews, createPage don't set published = 1	Sitemap queries filter WHERE published = 1 → return zero rows → empty sitemap
4	No sitemap index file	Sub-sitemaps (sitemap-casinos.xml, sitemap-reviews.xml) exist but are undiscoverable
5	No error handling around individual D1 queries in sitemap	One missing column = entire sitemap returns 500
6	No sub-sitemaps for news, categories, countries, pages	Only casinos and reviews have dedicated sub-sitemaps
7	renderNews() passes 5 args to render() which only accepts 4	JSON-LD schema is silently dropped; breadcrumbs broken on news pages
Fix 1: routes.js — Add /en/ sitemap routes
Locate the sitemap/robots section in getRoute() (around line after the API route check, before the dynamicPage match):

// CURRENT (BROKEN):
if (path === "/sitemap.xml") {
    return { type: "sitemap" };
}
if (path === "/sitemap-casinos.xml") {
    return { type: "sitemap-casinos" };
}
if (path === "/sitemap-reviews.xml") {
    return { type: "sitemap-reviews" };
}
if (path === "/robots.txt") {
    return { type: "robots" };
}
Replace with:

// Sitemap routes — accessible at both root and /en/
if (path === "/sitemap.xml" || path === "/en/sitemap.xml") {
    return { type: "sitemap" };
}
if (path === "/sitemap-index.xml" || path === "/en/sitemap-index.xml") {
    return { type: "sitemap-index" };
}
if (path === "/sitemap-casinos.xml" || path === "/en/sitemap-casinos.xml") {
    return { type: "sitemap-casinos" };
}
if (path === "/sitemap-reviews.xml" || path === "/en/sitemap-reviews.xml") {
    return { type: "sitemap-reviews" };
}
if (path === "/sitemap-news.xml" || path === "/en/sitemap-news.xml") {
    return { type: "sitemap-news" };
}
if (path === "/sitemap-categories.xml" || path === "/en/sitemap-categories.xml") {
    return { type: "sitemap-categories" };
}
if (path === "/sitemap-countries.xml" || path === "/en/sitemap-countries.xml") {
    return { type: "sitemap-countries" };
}
if (path === "/sitemap-pages.xml" || path === "/en/sitemap-pages.xml") {
    return { type: "sitemap-pages" };
}
if (path === "/robots.txt") {
    return { type: "robots" };
}
⚠️ Placement is critical — this block MUST stay before const dynamicPage = path.match(/^\/en\/(.+)$/); otherwise /en/sitemap.xml gets swallowed by the dynamic page fallback and returns 404.

Also add a root redirect at the very top of getRoute(), right after the trailing-slash trim:

// Add right after: if (path.length > 1 && path.endsWith("/")) { path = path.slice(0, -1); }
if (path === "/" || path === "") {
    return { type: "redirect", target: "/en" };
}
Fix 2: sitemap.js — Complete rewrite with error handling + sitemap index
Replace the entire sitemapEngine object with:

var sitemapEngine = {
  BASE_URL: "https://level.casino",

  async generateIndex(db) {
    const currentDate = new Date().toISOString().split("T")[0];
    const subSitemaps = [
      { loc: "/en/sitemap.xml", lastmod: currentDate },
      { loc: "/en/sitemap-casinos.xml", lastmod: currentDate },
      { loc: "/en/sitemap-reviews.xml", lastmod: currentDate },
      { loc: "/en/sitemap-news.xml", lastmod: currentDate },
      { loc: "/en/sitemap-categories.xml", lastmod: currentDate },
      { loc: "/en/sitemap-countries.xml", lastmod: currentDate },
      { loc: "/en/sitemap-pages.xml", lastmod: currentDate },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const s of subSitemaps) {
      xml += `  <sitemap>\n    <loc>${this.BASE_URL}${s.loc}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>\n`;
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

  async generate(db, type = "all") {
    if (!db) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        { status: 500, headers: { "Content-Type": "application/xml; charset=utf-8" } }
      );
    }

    const currentDate = new Date().toISOString().split("T")[0];
    let urls = [];

    // Static URLs (only in the "all" sitemap)
    if (type === "all") {
      urls.push({ loc: "/en/", lastmod: currentDate, changefreq: "daily", priority: "1.0" });
      urls.push({ loc: "/en/casino", lastmod: currentDate, changefreq: "daily", priority: "0.9" });
      urls.push({ loc: "/en/review", lastmod: currentDate, changefreq: "daily", priority: "0.8" });
      urls.push({ loc: "/en/news", lastmod: currentDate, changefreq: "daily", priority: "0.7" });
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

    // Reviews
    if (type === "all" || type === "reviews") {
      try {
        const r = await db.prepare(
          `SELECT slug, updated_at FROM reviews WHERE published = 1 ORDER BY updated_at DESC LIMIT 50000`
        ).all();
        for (const item of r.results || []) {
          const lm = item.updated_at ? item.updated_at.split(" ")[0] : currentDate;
          urls.push({ loc: `/en/review/${item.slug}`, lastmod: lm, changefreq: "weekly", priority: "0.7" });
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

    // Categories
    if (type === "all" || type === "categories") {
      try {
        const r = await db.prepare(`SELECT slug FROM categories LIMIT 50000`).all();
        for (const item of r.results || []) {
          urls.push({ loc: `/en/category/${item.slug}`, lastmod: currentDate, changefreq: "weekly", priority: "0.6" });
        }
      } catch (e) { console.error("Sitemap categories query failed:", e.message); }
    }

    // Countries
    if (type === "all" || type === "countries") {
      try {
        const r = await db.prepare(`SELECT code FROM countries LIMIT 50000`).all();
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

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const u of urls) {
      xml += `  <url>\n    <loc>${this.BASE_URL}${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
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
Key improvements:

Each D1 query is wrapped in try/catch — one failing query no longer nukes the entire sitemap
Added generateIndex() method for sitemap index support
Added sub-sitemap types: news, categories, countries, pages
LIMIT 50000 (sitemap protocol max) instead of arbitrary 1000/500/250
BASE_URL constant for easy domain changes
Fix 3: controllers.js — Update robots() function
Find the robots() function and replace it:

// CURRENT (BROKEN):
function robots() {
  return new Response(
    `User-agent: *
Allow: /

Sitemap:
https://level.casino/sitemap.xml`,
    { headers: { "Content-Type": "text/plain" } }
  );
}

// REPLACE WITH:
function robots() {
  return new Response(
    `User-agent: *
Allow: /

Sitemap: https://level.casino/en/sitemap-index.xml
Sitemap: https://level.casino/en/sitemap.xml
Sitemap: https://level.casino/en/sitemap-casinos.xml
Sitemap: https://level.casino/en/sitemap-reviews.xml
Sitemap: https://level.casino/en/sitemap-news.xml
Sitemap: https://level.casino/en/sitemap-categories.xml
Sitemap: https://level.casino/en/sitemap-countries.xml
Sitemap: https://level.casino/en/sitemap-pages.xml`,
    { headers: { "Content-Type": "text/plain" } }
  );
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
