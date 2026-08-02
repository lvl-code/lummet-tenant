// =====================================================
// LEVEL.CASINO BREADCRUMB ENGINE
// =====================================================

const ROUTES = {
  home: [],

  casinoList: [
    { label: "All Casinos", url: "/en/casino" }
  ],

  reviewList: [
    { label: "All Reviews", url: "/en/review" }
  ],

  newsList: [
    { label: "News", url: "/en/news" }
  ],

  categoryList: [
    { label: "Categories", url: "/en/category" }
  ],

  countryList: [
    { label: "Countries", url: "/en/country" }
  ],

  dashboard: [
    { label: "Dashboard", url: null }
  ]
};

export function buildBreadcrumbs(route, data = {}) {
  const crumbs = [
    {
      label: "Home",
      url: "/en"
    }
  ];

  if (ROUTES[route]) {
    crumbs.push(...ROUTES[route]);
    return crumbs;
  }

  switch (route) {

    case "casino":
      crumbs.push(
        { label: "All Casinos", url: "/en/casino" },
        { label: data.name || data.title, url: null }
      );
      break;

    case "review":
      crumbs.push(
        { label: "All Reviews", url: "/en/review" },
        { label: data.title, url: null }
      );
      break;

    case "news":
      crumbs.push(
        { label: "News", url: "/en/news" },
        { label: data.title, url: null }
      );
      break;

    case "category":
      crumbs.push(
        { label: "Categories", url: "/en/category" },
        { label: data.category || data.title, url: null }
      );
      break;

    case "country":
      crumbs.push(
        { label: "Countries", url: "/en/country" },
        { label: data.name || data.title, url: null }
      );
      break;

    case "author":
      crumbs.push(
        { label: "Authors", url: "/en/author" },
        { label: data.author_name || data.name, url: null }
      );
      break;

    case "affiliate":
      crumbs.push({
        label: data.title,
        url: null
      });
      break;

    case "page":
      crumbs.push({
        label: data.title,
        url: null
      });
      break;
  }

  return crumbs;
}
