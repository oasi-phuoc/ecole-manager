import React from 'react';

/** Cercle qui tourne — réutilisable partout (page, bouton, etc.). */
export function LoadingSpinner({ size = 28, color = '#6366f1', thickness = 3, style }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${thickness}px solid rgba(99, 102, 241, 0.2)`,
        borderTopColor: color,
        borderRightColor: color,
        animation: 'em-spin 0.7s linear infinite',
        boxSizing: 'border-box',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** Indicateur de chargement de page / section. */
export function PageLoader({ label = 'Chargement…', style, compact = false }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 10 : 14,
        padding: compact ? 24 : 48,
        minHeight: compact ? undefined : 160,
        color: '#6366f1',
        fontWeight: 600,
        fontSize: compact ? 13 : 14,
        ...style,
      }}
    >
      <LoadingSpinner size={compact ? 24 : 36} thickness={compact ? 2.5 : 3.5} />
      <span>{label}</span>
    </div>
  );
}

/**
 * Bouton avec état de chargement (comme la connexion) :
 * spinner + libellé, désactivé pour éviter les double-clics.
 */
export function LoadingButton({
  loading = false,
  loadingLabel = 'En cours de sauvegarde…',
  children,
  disabled,
  style,
  type = 'button',
  ...rest
}) {
  const isBusy = Boolean(loading);
  const isDisabled = Boolean(disabled) || isBusy;
  return (
    <button
      type={type}
      {...rest}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...style,
        opacity: isBusy ? 0.75 : (style?.opacity ?? (isDisabled ? 0.5 : 1)),
        cursor: isDisabled ? 'not-allowed' : (style?.cursor || 'pointer'),
      }}
    >
      {isBusy && <LoadingSpinner size={14} thickness={2} color="currentColor" />}
      <span>{isBusy ? loadingLabel : children}</span>
    </button>
  );
}

export default PageLoader;
