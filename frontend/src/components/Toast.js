import React from 'react';

/** Toast thème violet — même look partout (succès, info, erreur). */
export const TOAST = {
  bg: '#ede9fe',
  color: '#4c1d95',
  border: '#c7d2fe',
  accent: '#6366f1',
};

/** Style inline (défaut) — à placer à gauche des boutons d’action du header. */
export const toastStyle = {
  fontSize: 13,
  fontWeight: 600,
  padding: '6px 14px',
  borderRadius: 8,
  background: TOAST.bg,
  color: TOAST.color,
  maxWidth: 360,
  lineHeight: 1.35,
  flexShrink: 1,
  minWidth: 0,
};

/**
 * @deprecated Ne plus utiliser pour le feedback page (chevauche les boutons).
 * Gardé uniquement pour d’éventuels cas hors chrome (modales flottantes rares).
 */
export const toastStyleFixed = {
  ...toastStyle,
  position: 'fixed',
  top: 20,
  right: 20,
  zIndex: 9999,
  padding: '12px 18px',
  borderRadius: 10,
  border: `1px solid ${TOAST.border}`,
  boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
  maxWidth: 420,
  lineHeight: 1.4,
};

/**
 * Message toast violet.
 * Placement obligatoire : **inline, à gauche des boutons** dans un flex
 * `display:flex; alignItems:center; gap:8|10` (header / barre d’actions).
 * Ne pas utiliser `fixed` — le toast ne doit jamais se superposer aux boutons.
 *
 * @param {{ message?: string, children?: React.ReactNode, fixed?: boolean, style?: object }} props
 */
export default function Toast({ message, children, fixed = false, style, as: Tag = 'span' }) {
  const text = message ?? children;
  if (!text) return null;
  return (
    <Tag style={{ ...(fixed ? toastStyleFixed : toastStyle), ...style }}>
      {text}
    </Tag>
  );
}
