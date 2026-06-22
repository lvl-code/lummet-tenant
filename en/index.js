import { router } from './worker/routes.js';

export default {
  /**
   * Global Fetch Event Hook
   * Intercepts edge execution strings and marshals dependencies
   */
  async fetch(request, env, ctx) {
    try {
      // Extract live geographic telemetry (Country code, city, coordinates)
      const geoContext = request.cf || {
        country: 'RW',
        city: 'Kigali',
        region: 'Kigali City',
        timezone: 'Africa/Kigali'
      };

      // Pass request context down to the central routing matrix
      return await router.handle(request, env, ctx, geoContext);
      
    } catch (error) {
      console.error(`Fatal Edge Crash: ${error.message}`);
      
      // High resilience fallback payload
      return new Response(`Level Casino Core Exception Engine: ${error.message}`, {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow"
        }
      });
    }
  }
};
