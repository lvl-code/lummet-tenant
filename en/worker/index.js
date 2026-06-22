import { getRoute } from "./routes.js";

export default {

  async fetch(request, env, ctx) {

    const route = getRoute(request);

    switch (route.type) {

      case "home":
        return renderHome(request, env);

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
        return handleAPI(
          request,
          env,
          route.path
        );

      case "sitemap":
        return generateSitemap(env);

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
