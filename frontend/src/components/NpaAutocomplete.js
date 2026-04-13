import React from 'react';
import { lieuExactPourNpa } from '../utils/swissPostalCodes';

/**
 * Champ NPA (4 chiffres max) : remplissage automatique du lieu quand le code est reconnu.
 * Aucune liste de suggestions.
 */
export default function NpaAutocomplete({
  npa,
  lieu,
  onChange,
  inputStyle,
  inputMode = 'numeric',
  placeholder = '',
  id,
  onBlur: onBlurProp,
  disabled,
}) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        id={id}
        disabled={disabled}
        type="text"
        inputMode={inputMode}
        autoComplete="postal-code"
        {...(placeholder ? { placeholder } : {})}
        value={npa || ''}
        style={{
          ...inputStyle,
          boxSizing: 'border-box',
          width: '100%',
          fontWeight: 400,
        }}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 4);
          const auto = d.length === 4 ? lieuExactPourNpa(d) : '';
          onChange({ npa: d, lieu: auto || lieu });
        }}
        onBlur={onBlurProp}
      />
    </div>
  );
}
