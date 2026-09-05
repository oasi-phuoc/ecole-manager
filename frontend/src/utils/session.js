import { supabase, supabaseConfigured } from '../lib/supabase';
import apiClient, { clearLegacyToken } from '../lib/apiClient';
import { clearApiCache } from '../lib/apiCache';

const SESSION_STORAGE_KEY = 'oasis_session_user';

let sessionUser = null;
let fetchInflight = null;

function readStoredUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user) {
  try {
    if (user) sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch { /* ignore quota / private mode */ }
}

export const getSessionUser = () => {
  if (sessionUser) return sessionUser;
  sessionUser = readStoredUser();
  return sessionUser;
};

export const setSessionUser = (user) => {
  sessionUser = user || null;
  writeStoredUser(sessionUser);
};

export const clearSessionUser = () => {
  sessionUser = null;
  fetchInflight = null;
  writeStoredUser(null);
  clearLegacyToken();
  clearApiCache();
  if (supabaseConfigured && supabase) {
    supabase.auth.signOut();
  }
};

export const fetchSessionUser = async ({ force = false } = {}) => {
  if (!force && sessionUser) return sessionUser;
  if (!force) {
    const stored = readStoredUser();
    if (stored) sessionUser = stored;
  }
  if (!force && sessionUser) return sessionUser;
  if (!force && fetchInflight) return fetchInflight;

  fetchInflight = (async () => {
    if (supabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase.rpc('get_me');
        if (error || !data) {
          const res = await apiClient.get('/auth/moi');
          setSessionUser(res.data || null);
          return sessionUser;
        }
        setSessionUser(data);
        return sessionUser;
      }
      try {
        const res = await apiClient.get('/auth/moi');
        setSessionUser(res.data || null);
        return sessionUser;
      } catch {
        setSessionUser(null);
        return null;
      }
    }
    const res = await apiClient.get('/auth/moi');
    setSessionUser(res.data || null);
    return sessionUser;
  })();

  try {
    return await fetchInflight;
  } finally {
    fetchInflight = null;
  }
};
