import { getSessionUser } from './session';

export const getUser = () => {
  return getSessionUser() || {};
};

export const isAdmin = () => getUser().role === 'admin';
export const isProf = () => getUser().role === 'prof';
export const peutModifierNotes = () => isAdmin() || isProf() || getUser().permissions?.notes_modifier === true;
export const peutModifierPresences = () => isAdmin() || getUser().permissions?.presences_modifier === true;