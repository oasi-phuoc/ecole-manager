import axios from 'axios';

/** TTL par défaut : 5 minutes */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** GET cacheables — pattern sur le path (sans baseURL) */
const CACHE_RULES = [
  { pattern: /^\/donnees\/niveaux$/, ttl: 10 * 60 * 1000 },
  { pattern: /^\/donnees\/lieux-travail$/, ttl: 10 * 60 * 1000 },
  { pattern: /^\/donnees\/salles$/, ttl: 10 * 60 * 1000 },
  { pattern: /^\/classes$/, ttl: 3 * 60 * 1000 },
  { pattern: /^\/profs$/, ttl: 3 * 60 * 1000 },
  { pattern: /^\/branches$/, ttl: 5 * 60 * 1000 },
  { pattern: /^\/eleves$/, ttl: 2 * 60 * 1000 },
  { pattern: /^\/notes\/suivi-classes$/, ttl: 2 * 60 * 1000 },
  { pattern: /^\/notes\/classes-responsables$/, ttl: 3 * 60 * 1000 },
  { pattern: /^\/notes\/semestre-config$/, ttl: 5 * 60 * 1000 },
  { pattern: /^\/parametres\/ecole$/, ttl: 5 * 60 * 1000 },
  { pattern: /^\/parametres\/acces-profs$/, ttl: 5 * 60 * 1000 },
  { pattern: /^\/planning\/creneaux$/, ttl: 10 * 60 * 1000 },
  { pattern: /^\/statistiques$/, ttl: 60 * 1000 },
  { pattern: /^\/auth\/moi$/, ttl: 60 * 1000 },
  { pattern: /^\/auth\/mfa\/status$/, ttl: 60 * 1000 },
];

const store = new Map();
const inflight = new Map();

function normalizePath(url = '') {
  const s = String(url).split('?')[0];
  return s.startsWith('/') ? s : `/${s}`;
}

function cacheKey(config) {
  const path = normalizePath(config.url);
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${path}|${params}`;
}

function getRule(path) {
  return CACHE_RULES.find((r) => r.pattern.test(path));
}

function invalidateForMutation(url = '') {
  const path = normalizePath(url);
  const prefixes = new Set();

  if (path.startsWith('/classes')) {
    prefixes.add('/classes');
    prefixes.add('/notes');
  }
  if (path.startsWith('/eleves')) {
    prefixes.add('/eleves');
    prefixes.add('/classes');
    prefixes.add('/notes');
  }
  if (path.startsWith('/profs')) prefixes.add('/profs');
  if (path.startsWith('/branches')) prefixes.add('/branches');
  if (path.startsWith('/donnees')) prefixes.add('/donnees');
  if (path.startsWith('/parametres')) prefixes.add('/parametres');
  if (path.startsWith('/planning')) prefixes.add('/planning');
  if (path.startsWith('/statistiques')) prefixes.add('/statistiques');
  if (path.startsWith('/auth')) prefixes.add('/auth');
  if (path.startsWith('/notes')) prefixes.add('/notes');

  if (prefixes.size === 0) return;

  for (const key of store.keys()) {
    const keyPath = key.split('|')[0];
    for (const prefix of prefixes) {
      if (keyPath === prefix || keyPath.startsWith(prefix + '/')) {
        store.delete(key);
        break;
      }
    }
  }
}

export function clearApiCache() {
  store.clear();
  inflight.clear();
}

/**
 * Lecture synchrone du cache GET (sans réseau).
 * Retourne `data` si l'entrée est encore fraîche, sinon `null`.
 */
export function peekCachedGet(url, params) {
  const path = normalizePath(url);
  const rule = getRule(path);
  if (!rule) return null;
  const key = cacheKey({ url: path, params });
  const entry = store.get(key);
  if (!entry || Date.now() - entry.ts >= rule.ttl) return null;
  return entry.data;
}

export const REFERENCE_PREFETCH_URLS = [
  '/donnees/niveaux',
  '/donnees/lieux-travail',
  '/donnees/salles',
  '/classes',
  '/profs',
  '/branches',
  '/parametres/ecole',
  '/planning/creneaux',
  '/notes/suivi-classes',
  '/notes/classes-responsables',
  '/notes/semestre-config',
];

export const HEAVY_PREFETCH_URLS = ['/eleves'];

export function prefetchUrls(client, urls) {
  return Promise.allSettled(
    urls.map((url) => client.get(url)),
  );
}

/**
 * Cache GET + invalidation automatique après mutations.
 * Passe `noCache: true` dans la config axios pour forcer un refetch.
 */
export function setupApiCache(client) {
  // axios 1.x : defaults.adapter est un tableau ['xhr','http','fetch'], pas une fonction.
  // Capturer l'adapter réel AVANT de le remplacer (sinon récursion / "t is not a function").
  const adapterSpec = client.defaults.adapter;
  const baseAdapter = typeof adapterSpec === 'function'
    ? adapterSpec
    : axios.getAdapter(adapterSpec || ['xhr', 'http', 'fetch']);

  client.defaults.adapter = async (config) => {
    const method = (config.method || 'get').toLowerCase();
    // Forcer l'adapter réseau de base (évite de rappeler ce wrapper via config.adapter)
    const networkConfig = { ...config, adapter: baseAdapter };

    if (method !== 'get' || config.noCache) {
      const response = await baseAdapter(networkConfig);
      if (method !== 'get') invalidateForMutation(config.url);
      return response;
    }

    const path = normalizePath(config.url);
    const rule = getRule(path);
    if (!rule) return baseAdapter(networkConfig);

    const key = cacheKey(config);
    const entry = store.get(key);
    if (entry && Date.now() - entry.ts < rule.ttl) {
      return {
        data: entry.data,
        status: 200,
        statusText: 'OK',
        headers: entry.headers || {},
        config,
        request: {},
      };
    }

    if (inflight.has(key)) return inflight.get(key);

    const promise = baseAdapter(networkConfig)
      .then((response) => {
        store.set(key, {
          data: response.data,
          ts: Date.now(),
          headers: response.headers,
        });
        inflight.delete(key);
        return response;
      })
      .catch((err) => {
        inflight.delete(key);
        throw err;
      });

    inflight.set(key, promise);
    return promise;
  };

  client.interceptors.response.use(
    (response) => {
      const method = (response.config?.method || 'get').toLowerCase();
      if (method !== 'get') invalidateForMutation(response.config?.url);
      return response;
    },
    (error) => {
      const method = (error.config?.method || 'get').toLowerCase();
      if (method !== 'get') invalidateForMutation(error.config?.url);
      return Promise.reject(error);
    },
  );
}
