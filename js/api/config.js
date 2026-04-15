// Single source of truth for the backend base URL.
// Production currently serves the static site from GitHub Pages while jpCore lives on its own
// host, so default to the public API origin. A page can still override this explicitly via
// <meta name="api-base" content="..."> when needed.
function resolveBase() {
  const meta = document.querySelector('meta[name="api-base"]');
  if (meta && meta.getAttribute('content')) return meta.getAttribute('content').replace(/\/$/, '');
  return 'https://jpcore.logge.top';
}

export const BASE_URL = resolveBase();
