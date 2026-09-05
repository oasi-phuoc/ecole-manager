/**
 * Ancien keep-alive (cache display:none) — désactivé.
 * Causait des pages blanches (toutes les vues en display:none / outlet null).
 * Le Layout utilise désormais <Outlet /> de react-router-dom.
 * Conservé uniquement pour ne pas casser d’imports résiduels.
 */
export { Outlet as default } from 'react-router-dom';
