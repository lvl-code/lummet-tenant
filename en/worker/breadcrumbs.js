const ROUTES = {
  home: [],
  casino: { parent: { label: "Casinos", url: "/en/casino" } },
  review: { parent: { label: "Reviews", url: "/en/review" } },
  news: { parent: { label: "News", url: "/en/news" } },
  category: { parent: { label: "Categories", url: "/en/category" } },
  country: { parent: { label: "Countries", url: "/en/country" } },
  author: { parent: { label: "Authors", url: "/en/author" } },
  affiliate: { parent: { label: "Affiliate", url: "/en/affiliate" } },
  page: {},
  dashboard: {}
};

export function buildBreadcrumbs(route, data = {}) { ... }

export function renderBreadcrumbs(crumbs) { ... }

export function buildBreadcrumbSchema(crumbs) { ... }
