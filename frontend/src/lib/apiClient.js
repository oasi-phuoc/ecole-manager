import axios from 'axios';
import { supabase, getFunctionsBase, supabaseConfigured } from './supabase';

const LEGACY_API =
  process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

const LEGACY_TOKEN_KEY = 'ecole_manager_legacy_token';

/** Client HTTP : Supabase Edge api-proxy si configuré, sinon Render legacy */
export const apiClient = axios.create({
  baseURL: supabaseConfigured ? `${getFunctionsBase()}/api-proxy` : LEGACY_API,
  withCredentials: !supabaseConfigured,
});

apiClient.interceptors.request.use(async (config) => {
  if (supabaseConfigured && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      const legacy = sessionStorage.getItem(LEGACY_TOKEN_KEY);
      if (legacy) config.headers.Authorization = `Bearer ${legacy}`;
    }
    config.headers.apikey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
  }
  return config;
});

export function setLegacyToken(token) {
  if (token) sessionStorage.setItem(LEGACY_TOKEN_KEY, token);
  else sessionStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearLegacyToken() {
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
}

/** Raccourci compatible ancien code `API + '/path'` */
export const API = supabaseConfigured ? '' : LEGACY_API;

export default apiClient;
