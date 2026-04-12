/** Fond par défaut des pages (aligné sur Layout et Notes — Vue générale). */
export const PAGE_BG_DEFAULT = '#f8fafc';

/**
 * Bandeau haut collant : titre, actions, filtres, onglets internes.
 * À placer dans la zone défilante principale (scroll du Layout) pour un comportement homogène.
 */
export function stickyPageChrome(background = PAGE_BG_DEFAULT) {
  return {
    position: 'sticky',
    top: 0,
    zIndex: 36,
    background,
    paddingBottom: 12,
    marginBottom: 8,
    boxShadow: '0 1px 0 #e2e8f0',
  };
}
