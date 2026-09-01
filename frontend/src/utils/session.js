import { supabase, supabaseConfigured } from '../lib/supabase';
import apiClient, { clearLegacyToken } from '../lib/apiClient';

let sessionUser = null;

export const getSessionUser = () => sessionUser;

export const setSessionUser = (user) => {
  sessionUser = user || null;
};

export const clearSessionUser = () => {
  sessionUser = null;
  clearLegacyToken();
  if (supabaseConfigured && supabase) {
    supabase.auth.signOut();
  }
};

export const fetchSessionUser = async () => {
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
    // Connexion JWT legacy (sans session Supabase Auth)
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
};
