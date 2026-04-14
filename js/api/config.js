// Single source of truth for the backend base URL.
// In production jp-site and jpCore live under the same domain (reverse proxy), so an empty
// base lets fetch use relative URLs. Override via <meta name="api-base" content="..."> in
// an HTML page if you ever need to point at a different host.
function resolveBase() {
  const meta = document.querySelector('meta[name="api-base"]');
  if (meta && meta.getAttribute('content')) return meta.getAttribute('content').replace(/\/$/, '');
  // Same-origin default — backend mounts itself at / and serves jp-site via @fastify/static
  return '';
}

export const BASE_URL = resolveBase();
