import { router } from './worker/routes.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CRITICAL ROOT PROTECTION FILTER
    // If incoming traffic does not hit the /en/ path namespace, immediately bypass execution
    // to preserve all root directory landing layers untouched.
    if (!url.pathname.startsWith('/en/')) {
      return fetch(request);
    }

    // Global Preflight Options CORS Interception
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // High-Resolution Geographical Context Sourcing
    const geoContext = {
      country: request.cf?.country || 'RW', // Default fallback context
      city: request.cf?.city || 'Unknown',
      ip: request.headers.get('CF-Connecting-IP') || '0.0.0.0',
      userAgent: request.headers.get('user-agent') || ''
    };

    try {
      // Direct handover transmission to the specialized routing engine
      return await router.handle(request, env, ctx, geoContext);
    } catch (error) {
      console.error(`CMS Architecture Crash Exception: ${error.message}`);
      return new Response(
        JSON.stringify({ error: "Internal Edge CMS Error", integrityCode: 500 }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
