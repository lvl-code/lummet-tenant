// =====================================================
// LEVELCASINO ROUTER
// Equivalent to Django urls.py
// =====================================================

export function getRoute(request) {

  const url = new URL(request.url);

  let path = url.pathname;

  // remove trailing slash except root
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  // =====================================================
  // HOME
  // =====================================================

  if (path === "/en" || path === "/en/home") {
    return {
      type: "home"
    };
  }

    // LISTING PAGES
  if (path === "/en/casino") return { type: "casinoList" };
  if (path === "/en/review") return { type: "reviewList" };
  if (path === "/en/news") return { type: "newsList" };


  // =====================================================
  // CASINO
  // /en/casino/bcgame
  // =====================================================

  const casinoMatch =
    path.match(/^\/en\/casino\/([^/]+)$/);

  if (casinoMatch) {
    return {
      type: "casino",
      slug: casinoMatch[1]
    };
  }

  // =====================================================
  // REVIEW
  // /en/review/bcgame
  // =====================================================

  const reviewMatch =
    path.match(/^\/en\/review\/([^/]+)$/);

  if (reviewMatch) {
    return {
      type: "review",
      slug: reviewMatch[1]
    };
  }

  // =====================================================
  // NEWS
  // /en/news/new-license
  // =====================================================

  const newsMatch =
    path.match(/^\/en\/news\/([^/]+)$/);

  if (newsMatch) {
    return {
      type: "news",
      slug: newsMatch[1]
    };
  }

  // =====================================================
  // COUNTRY
  // /en/country/rwanda
  // =====================================================

  const countryMatch =
    path.match(/^\/en\/country\/([^\/]+)$/);

  if (countryMatch) {
    return {
      type: "country",
      slug: countryMatch[1]
    };
  }

  // =====================================================
  // CATEGORY
  // /en/category/crypto
  // =====================================================

  const categoryMatch =
    path.match(/^\/en\/category\/([^\/]+)$/);

  if (categoryMatch) {
    return {
      type: "category",
      slug: categoryMatch[1]
    };
  }

  // =====================================================
  // AFFILIATE LANDING PAGE
  // /en/affiliate/become-affiliate
  // =====================================================

  const affiliateMatch =
    path.match(/^\/en\/affiliate\/([^\/]+)$/);

  if (affiliateMatch) {
    return {
      type: "affiliate",
      slug: affiliateMatch[1]
    };
  }

  // =====================================================
  // GO TRACKING
  // /en/go/bcgame
  // =====================================================

  const goMatch =
    path.match(/^\/en\/go\/([^\/]+)$/);

  if (goMatch) {
    return {
      type: "go",
      slug: goMatch[1]
    };
  }

  // =====================================================
  // DASHBOARD
  // =====================================================
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

  if (path === "/en/dashboard/geo")
   return { type:"dashboardGeo" };

  if (path === "/en/dashboard/sitemap")
   return { type:"dashboardSitemap" };

  // =====================================================
  // AUTH
  // =====================================================

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
  // =====================================================
  // API
  // =====================================================

  if (path.startsWith("/api/") || path.startsWith("/en/api/")) {
    return {
      type: "api",
      path: path.replace(/^\/en/, "")
    };
  }

  // =====================================================
  // SITEMAPS
  // =====================================================

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

  // =====================================================
  // ROBOTS
  // =====================================================

  if (path === "/robots.txt") {
    return {
      type: "robots"
    };
  }

  // =====================================================
  // FALLBACK DYNAMIC PAGE ENGINE
  // =====================================================
  // /en/about
  // /en/contact
  // /en/privacy
  // /en/terms
  // =====================================================

  const dynamicPage =
    path.match(/^\/en\/(.+)$/);

  if (dynamicPage) {

    return {
      type: "page",
      slug: dynamicPage[1]
    };

  }

  // =====================================================
  // 404
  // =====================================================

  return {
    type: "not_found"
  };

}
