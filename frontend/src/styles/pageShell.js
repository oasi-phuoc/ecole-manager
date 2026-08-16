/** Fond par défaut des pages (aligné sur Layout et Notes — Vue générale). */
export const PAGE_BG_DEFAULT = '#f8fafc';

/** Breakpoint mobile partagé avec le Layout. */
export const MOBILE_MAX = 900;

/**
 * Bandeau haut collant : titre, actions, filtres, onglets internes.
 * À placer dans la zone défilante principale (scroll du Layout) pour un comportement homogène.
 */
export function stickyPageChrome(background = PAGE_BG_DEFAULT) {
  return {
    position: 'static',
    top: 'auto',
    zIndex: 36,
    background,
    paddingBottom: 12,
    marginBottom: 8,
    boxShadow: 'none',
  };
}

/**
 * Extension du chrome sticky pour annuler le padding page en desktop.
 * Sur mobile, les marges négatives sont neutralisées via CSS global (.app-page-host).
 */
export function stickyPageChromeBleed(background = PAGE_BG_DEFAULT, padX = 36) {
  return {
    ...stickyPageChrome(background),
    marginBottom: 0,
    marginLeft: -padX,
    marginRight: -padX,
    paddingLeft: padX,
    paddingRight: padX,
  };
}
