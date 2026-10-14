// Cache headers for /static/* and ?v=<hash> versioning of CSS/JS URLs.
import { ASSET_VERSION } from "./asset-version.js";

const YEAR = "public, max-age=31536000, immutable";

export function staticCacheControl(pathname, hasVersion) {
  if (pathname === "/static/sw.js") return "no-cache";
  if (/\.(css|js)$/.test(pathname)) {
    return hasVersion ? YEAR : "public, max-age=300, stale-while-revalidate=86400";
  }
  return "public, max-age=86400, stale-while-revalidate=604800";
}

export function versionAssetUrls(html, version = ASSET_VERSION) {
  if (!html || !version) return html;
  return html.replace(
    /\b(href|src)="(\/static\/(?:css|js)\/[^"?#]+\.(?:css|js))"/g,
    (_, attr, path) => `${attr}="${path}?v=${version}"`
  );
}

export async function finalizeResponse(request, response) {
  let url;
  try { url = new URL(request.url); } catch { return response; }
  if (request.method !== "GET" && request.method !== "HEAD") return response;

  if (url.pathname.startsWith("/static/")) {
    if (response.status !== 200) return response;
    const headers = new Headers(response.headers);
    headers.set("cache-control", staticCacheControl(url.pathname, url.searchParams.has("v")));
    return new Response(response.body, { status: response.status, headers });
  }

  const type = response.headers.get("content-type") || "";
  if (response.status === 200 && type.includes("text/html")) {
    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(versionAssetUrls(html), { status: 200, headers });
  }
  return response;
}
