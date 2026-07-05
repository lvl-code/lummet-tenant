// =====================================================
// LEVELCASINO API v1
// Cloudflare Worker Controller Layer
// =====================================================

import * as casinos from "./database/casinos.js";
import * as reviews from "./database/reviews.js";
import * as pages from "./database/pages.js";
import * as geo from "./database/geo.js";
import * as settings from "./database/settings.js";
import * as ai from "./database/ai.js";
import {
  login,
  logout,
  register
}
from "./auth.js";
import { dashboardStatsAPI } from "./controllers.js";
import { aiEngine } from "./ai.js";

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



function requireAdmin(user) {
  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }
  return null;
}
