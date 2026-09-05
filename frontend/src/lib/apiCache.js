/**
 * Cache / prefetch désactivés (retirés après keep-alive).
 * Conservé pour clearApiCache (logout / error boundary) et imports existants.
 */

export function clearApiCache() {
  /* no-op : plus de cache mémoire */
}

export function peekCachedGet() {
  return null;
}

export const REFERENCE_PREFETCH_URLS = [];
export const HEAVY_PREFETCH_URLS = [];
export const PREFETCH_BY_ROUTE = {};

export function prefetchUrls() {
  return Promise.resolve([]);
}

export function prefetchRoute() {
  return Promise.resolve([]);
}

/** Ancien cache GET — désactivé (passe-plat). */
export function setupApiCache() {
  /* no-op */
}
