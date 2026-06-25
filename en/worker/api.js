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
    return json({
      success: false,
      error: "Unauthorized"
    }, 401);
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
  return renderDashboard(request, env);
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
  const casinos = await env.DB.prepare(
    "SELECT slug, name, rating FROM casinos ORDER BY created_at DESC"
  ).all();

  return json2({ casinos: casinos.results });
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

// =====================================================
// CASINOS
// =====================================================

async function createCasino(request, env) {

  const body = await request.json();

  await casinos.createCasino(
    env.DB,
    body
  );

  return json({
    success: true
  });
}

async function updateCasino(request, env) {

  const body = await request.json();

  await casinos.updateCasino(
    env.DB,
    body.slug,
    body
  );

  return json({
    success: true
  });
}

async function deleteCasino(request, env) {

  const body = await request.json();

  await casinos.deleteCasino(
    env.DB,
    body.slug
  );

  return json({
    success: true
  });
}

// =====================================================
// REVIEWS
// =====================================================

async function createReview(request, env) {

  const body = await request.json();

  await reviews.createReview(
    env.DB,
    body
  );

  return json({
    success: true
  });
}

async function updateReview(request, env) {

  const body = await request.json();

  await reviews.updateReview(
    env.DB,
    body.slug,
    body
  );

  return json({
    success: true
  });
}

// =====================================================
// PAGES
// =====================================================

async function createPage(request, env) {

  const body = await request.json();

  await pages.createPage(
    env.DB,
    body
  );

  return json({
    success: true
  });
}

async function updatePage(request, env) {

  const body = await request.json();

  await pages.updatePage(
    env.DB,
    body.slug,
    body
  );

  return json({
    success: true
  });
}

// =====================================================
// GEO RULES
// =====================================================

async function saveGeoRule(request, env) {

  const body = await request.json();

  await geo.saveGeoRule(
    env.DB,
    body
  );

  return json({
    success: true
  });
}

// =====================================================
// SETTINGS
// =====================================================

async function saveSettings(request, env) {

  const body = await request.json();

  await settings.saveSettings(
    env.DB,
    body
  );

  return json({
    success: true
  });
}

// =====================================================
// AI REVIEW GENERATION
// =====================================================

async function generateReview(
  request,
  env
) {

  const body = await request.json();

  const prompt = `
Write a professional casino review.

Casino: ${body.casino}
Country: ${body.country}

Requirements:
- 1500+ words
- SEO optimized
- Include pros and cons
- Include FAQ section
`;

  const response = await fetch(
    env.OPENAI_URL,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    }
  );

  const result =
    await response.json();

  const content =
    result.choices?.[0]
      ?.message?.content || "";

  await ai.logAIGeneration(
    env.DB,
    "review",
    body.slug,
    prompt,
    env.OPENAI_MODEL
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
