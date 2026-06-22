export const router = {
  async handle(request, env, ctx, geoContext) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Attach contextual databases and tracking maps for execution down the chain
    ctx.db = env.DB; 
    ctx.geo = geoContext;

    // Normalize incoming paths by stripping loose trailing slashes
    const cleanPath = path.endsWith('/') && path !== '/en/' ? path.slice(0, -1) : path;

    // 1. Main Directory Hub Index Core
    if (cleanPath === '/en' || cleanPath === '/en/') {
      return new Response("CMS Status: Root Template Matrix Operational.", {
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Splitting path strings to extract precise URL dynamic structures
    const segments = cleanPath.split('/').filter(Boolean); // Target example: ['en', 'casino', 'levelup']

    if (segments.length >= 3) {
      const moduleType = segments[1]; // Evaluates structural type
      const slug = segments.slice(2).join('/'); // Extracts multi-tier slug strings safely

      switch (moduleType) {
        case 'casino':
          return new Response(`CMS Routing -> Target: Casino Page | Profile Slug: ${slug} | Geo Detected: ${geoContext.country}`, { status: 200 });
        case 'review':
          return new Response(`CMS Routing -> Target: Expert Deep Review | Profile Slug: ${slug} | Geo Detected: ${geoContext.country}`, { status: 200 });
        case 'news':
          return new Response(`CMS Routing -> Target: News and Update Layer | Entry ID: ${slug}`, { status: 200 });
        case 'category':
          return new Response(`CMS Routing -> Target: Dynamic Group Aggregator Filter: ${slug}`, { status: 200 });
        case 'country':
          return new Response(`CMS Routing -> Target: Localization Landing Matrix: ${slug}`, { status: 200 });
        case 'affiliate':
          return new Response(`CMS Routing -> Target: Conversion Direct Asset: ${slug}`, { status: 200 });
        default:
          break;
      }
    }

    // 2. Automated Admin CMS Panel Dashboard Authentication Boundary
    if (cleanPath === '/en/dashboard' || cleanPath.startsWith('/en/dashboard/')) {
      return new Response("CMS Status: Secure Administrative Control Interface Initialized.", { status: 200 });
    }

    // Default 404 Fallback within the localized architecture
    return new Response("Resource Allocation Fault: Sub-Path Missing from LevelCasino Target Manifest.", { 
      status: 404,
      headers: { "Content-Type": "text/plain" }
    });
  }
};
