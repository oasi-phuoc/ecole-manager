import axios from 'axios';
import { supabase, getFunctionsBase, supabaseConfigured } from './supabase';
import { clearApiCache, setupApiCache } from './apiCache';

/** Dev local sans Supabase : REACT_APP_API_URL=http://localhost:5000/api */
const LOCAL_API = process.env.REACT_APP_API_URL || '';

const LEGACY_TOKEN_KEY = 'ecole_manager_legacy_token';

function resolveBaseURL() {
  if (supabaseConfigured) return `${getFunctionsBase()}/api-proxy`;
  if (LOCAL_API) return LOCAL_API.replace(/\/$/, '');
  console.warn(
    '[apiClient] Configure REACT_APP_SUPABASE_URL + REACT_APP_SUPABASE_ANON_KEY (prod) ou REACT_APP_API_URL (dev local).',
  );
  return '/api';
}

/** Client HTTP : Supabase Edge api-proxy (prod) ou backend Express local (dev) */
export const apiClient = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: !supabaseConfigured,
});

apiClient.interceptors.request.use(async (config) => {
  if (supabaseConfigured && supabase) {
    const anon = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      const legacy = sessionStorage.getItem(LEGACY_TOKEN_KEY);
      // Edge Functions : toujours un Bearer (session, legacy, ou anon)
      config.headers.Authorization = `Bearer ${legacy || anon}`;
    }
    if (anon) config.headers.apikey = anon;
  }
  return config;
});

setupApiCache(apiClient);

export function setLegacyToken(token) {
  if (token) sessionStorage.setItem(LEGACY_TOKEN_KEY, token);
  else sessionStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearLegacyToken() {
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  clearApiCache();
}

export default apiClient;
