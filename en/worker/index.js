import { getRoute }
from "./routes.js";

import {
  renderHome,
  renderCasino,
  renderReview,
  renderCountry,
  renderCategory,
  renderAffiliate,
  renderDashboard,
  renderDynamicPage,
  handleAffiliateRedirect,
  renderLogin,
  renderRegister,
  robots
}
from "./controllers.js";

import {
  handleAPI
}
from "./api.js";

import {
  sitemapEngine
}
from "./sitemap.js";
import {
  getCurrentUser
}
from "./auth.js";


export default {

  async fetch(request, env, ctx) {

    const url = new URL(request.url);

    // Serve static assets
    if (
      url.pathname.startsWith("/en/static/")
    ) {
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
        return renderDashboard(
          request,
          env
        );

      case "api":

  const user =
    await getCurrentUser(
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

      default:
        return new Response(
          "Not Found",
          {
            status: 404
          }
        );
    }
  }
};
