import { supabase, supabaseConfigured } from '../lib/supabase';
import apiClient, { clearLegacyToken } from '../lib/apiClient';
import { clearApiCache } from '../lib/apiCache';

const SESSION_STORAGE_KEY = 'oasis_session_user';
const LEGACY_TOKEN_KEY = 'ecole_manager_legacy_token';

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

function hasAuthMaterial() {
  try {
    if (sessionStorage.getItem(LEGACY_TOKEN_KEY)) return true;
  } catch { /* ignore */ }
  return false;
}

/** Lecture synchrone (UI optimiste) — peut être périmé tant que fetchSessionUser n’a pas validé. */
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
    supabase.auth.signOut().catch(() => {});
  }
};

/**
 * Charge / valide l’utilisateur courant.
 * Ne se fie JAMAIS au seul sessionStorage : sans session Supabase ni JWT legacy,
 * on efface le profil fantôme (évite prefetch + pages en erreur).
 */
export const fetchSessionUser = async ({ force = false } = {}) => {
  if (!force && fetchInflight) return fetchInflight;

  // Cache mémoire seulement si on a encore un token (sinon revalider / nettoyer)
  if (!force && sessionUser && (hasAuthMaterial() || !supabaseConfigured)) {
    return sessionUser;
  }

  fetchInflight = (async () => {
    try {
      if (supabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const { data, error } = await supabase.rpc('get_me');
          if (!error && data) {
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

        // Pas de session Supabase : JWT legacy éventuel
        if (hasAuthMaterial()) {
          try {
            const res = await apiClient.get('/auth/moi');
            setSessionUser(res.data || null);
            return sessionUser;
          } catch {
            setSessionUser(null);
            return null;
          }
        }

        // Profil en storage sans token → fantôme
        setSessionUser(null);
        return null;
      }

      const res = await apiClient.get('/auth/moi');
      setSessionUser(res.data || null);
      return sessionUser;
    } catch {
      setSessionUser(null);
      return null;
    }
  })();

  try {
    return await fetchInflight;
  } finally {
    fetchInflight = null;
  }
};
