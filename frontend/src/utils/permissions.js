export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('utilisateur')) || {}; }
  catch { return {}; }
};

export const isAdmin = () => getUser().role === 'admin';
export const isProf = () => getUser().role === 'prof';
export const peutModifierNotes = () => isAdmin() || getUser().permissions?.notes_modifier === true;
export const peutModifierPresences = () => isAdmin() || getUser().permissions?.presences_modifier === true;