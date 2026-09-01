import { supabase, supabaseConfigured } from '../lib/supabase';
import apiClient, { clearLegacyToken } from '../lib/apiClient';
import { clearApiCache } from '../lib/apiCache';

let sessionUser = null;
let fetchInflight = null;

export const getSessionUser = () => sessionUser;

export const setSessionUser = (user) => {
  sessionUser = user || null;
};

export const clearSessionUser = () => {
  sessionUser = null;
  fetchInflight = null;
  clearLegacyToken();
  clearApiCache();
  if (supabaseConfigured && supabase) {
    supabase.auth.signOut();
  }
};

export const fetchSessionUser = async ({ force = false } = {}) => {
  if (!force && sessionUser) return sessionUser;
  if (!force && fetchInflight) return fetchInflight;

  fetchInflight = (async () => {
    if (supabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase.rpc('get_me');
        if (error || !data) {
          const res = await apiClient.get('/auth/moi');
          sessionUser = res.data || null;
          return sessionUser;
        }
        sessionUser = data;
        return sessionUser;
      }
      try {
        const res = await apiClient.get('/auth/moi');
        sessionUser = res.data || null;
        return sessionUser;
      } catch {
        sessionUser = null;
        return null;
      }
    }
    const res = await apiClient.get('/auth/moi');
    sessionUser = res.data || null;
    return sessionUser;
  })();

  try {
    return await fetchInflight;
  } finally {
    fetchInflight = null;
  }
};
