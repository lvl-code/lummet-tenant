import { Renderer } from "./render.js";

import * as casinos from "./database/casinos.js";
import * as reviews from "./database/reviews.js";
import * as pages from "./database/pages.js";
import * as countries from "./database/countries.js";

import { logClick }
from "./database/clicks.js";
import {
  getCurrentUser
} from "./auth.js";

export async function renderHome(
  request,
  env
) {

  const renderer =
    new Renderer(env);

  const casinoList =
    await casinos.getAllCasinos(
      env.DB
    );

  const html =
    await renderer.render(
      "home.html",
      {
        seo_title:
          "Level Casino",
        seo_description:
          "Casino Reviews",
        casinos:
          JSON.stringify(
            casinoList
          )
      }
    );

  return new Response(html,{
    headers:{
      "Content-Type":"text/html"
    }
  });
}

export async function renderCasino(
  request,
  env,
  slug
){

  const casino =
    await casinos.getCasino(
      env.DB,
      slug
    );

  if(!casino){
    return new Response(
      "Casino not found",
      {status:404}
    );
  }

  const renderer =
    new Renderer(env);

  const html =
    await renderer.render(
      "casino.html",
      casino
    );

  return new Response(html,{
    headers:{
      "Content-Type":"text/html"
    }
  });
}

export async function renderReview(
  request,
  env,
  slug
){

  const review =
    await reviews.getReview(
      env.DB,
      slug
    );

  if(!review){
    return new Response(
      "Review not found",
      {status:404}
    );
  }

  const renderer =
    new Renderer(env);

  const html =
    await renderer.render(
      "review.html",
      review
    );

  return new Response(html,{
    headers:{
      "Content-Type":"text/html"
    }
  });
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

  if(!casino){
    return new Response(
      "Not Found",
      {status:404}
    );
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

export async function renderDashboard(
  request,
  env
){

  const user =
    await getCurrentUser(
      request,
      env
    );

  if(
    !user ||
    user.role !== "admin"
  ){
    return new Response(
      "Forbidden",
      {
        status:403
      }
    );
  }

  const casinos =
    await env.DB.prepare(`
      SELECT COUNT(*) c
      FROM casinos
    `).first();

  const reviews =
    await env.DB.prepare(`
      SELECT COUNT(*) c
      FROM reviews
    `).first();

  const clicks =
    await env.DB.prepare(`
      SELECT COUNT(*) c
      FROM clicks
    `).first();

  const pages =
    await env.DB.prepare(`
      SELECT COUNT(*) c
      FROM pages
    `).first();

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


export async function renderCountry(
  request,
  env,
  slug
){

  const country =
    await countries.getCountry(
      env.DB,
      slug.toUpperCase()
    );

  if(!country){
    return new Response(
      "Country not found",
      {
        status:404
      }
    );
  }

  const casinoList =
    await casinos.getAllCasinos(
      env.DB
    );

  const renderer =
    new Renderer(env);

  const html =
    await renderer.render(
      "country.html",
      {
        ...country,
        casinos:
          JSON.stringify(
            casinoList
          ),
        seo_title:
          country.name +
          " Online Casinos",
        seo_description:
          "Best online casinos available in " +
          country.name
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


export async function renderCategory(
  request,
  env,
  slug
){

  const casinoList =
    await casinos.getAllCasinos(
      env.DB
    );

  const renderer =
    new Renderer(env);

  const html =
    await renderer.render(
      "category.html",
      {
        slug,
        category: slug,
        casinos:
          JSON.stringify(
            casinoList
          ),
        seo_title:
          slug +
          " Casinos",
        seo_description:
          "Top " +
          slug +
          " casinos reviewed by Level Casino"
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

export async function renderAffiliate(
  request,
  env,
  slug
){

  const page =
    await pages.getPage(
      env.DB,
      slug
    );

  if(!page){
    return new Response(
      "Affiliate page not found",
      {
        status:404
      }
    );
  }

  const renderer =
    new Renderer(env);

  const html =
    await renderer.render(
      "affiliate.html",
      page
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

export async function renderDynamicPage(
  request,
  env,
  slug
){
  const page =
    await pages.getPage(
      env.DB,
      slug
    );

  if(!page){
    return new Response(
      "Not Found",
      {status:404}
    );
  }

  const renderer =
    new Renderer(env);

  const html =
    await renderer.render(
      "page.html",
      page
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
          "Level Casino Login"
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
          "Create Level Casino account"
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
    seo_title: "Page Not Found",
    seo_description: "404 error page"
  });

  return new Response(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html"
    }
  });
}
