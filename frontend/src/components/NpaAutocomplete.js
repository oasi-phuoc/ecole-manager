import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchNpaByPrefix, lieuExactPourNpa } from '../utils/swissPostalCodes';

const LIST_MAX = 25;
const HIGHLIGHT = '#ffeb3b';

/**
 * Champ NPA avec liste déroulante type Poste suisse (suggestions : NPA en gras, localité en normal, surlignage jaune).
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
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const blurTRef = useRef(null);

  const suggestions = useMemo(() => searchNpaByPrefix(npa, LIST_MAX), [npa]);

  useEffect(() => {
    setActive(0);
  }, [npa, suggestions.length]);

  const closeSoon = useCallback(() => {
    if (blurTRef.current) clearTimeout(blurTRef.current);
    blurTRef.current = setTimeout(() => setOpen(false), 180);
  }, []);

  const pick = useCallback(
    (row) => {
      if (!row) return;
      onChange({ npa: row.plz, lieu: row.lieu });
      setOpen(false);
    },
    [onChange]
  );

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    const onDoc = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => () => blurTRef.current && clearTimeout(blurTRef.current), []);

  const showList = open && npa && suggestions.length > 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
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
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTRef.current) clearTimeout(blurTRef.current);
          if (npa) setOpen(true);
        }}
        onBlur={(e) => {
          closeSoon();
          onBlurProp?.(e);
        }}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            margin: 0,
            marginTop: 2,
            padding: 0,
            listStyle: 'none',
            maxHeight: 280,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            boxShadow: '0 10px 25px rgba(15,23,42,0.12)',
            zIndex: 2000,
          }}
        >
          {suggestions.map((row, idx) => {
            const sel = idx === active;
            return (
              <li
                key={row.plz + '-' + idx}
                role="option"
                aria-selected={sel}
                onMouseEnter={() => setActive(idx)}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  pick(row);
                }}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#0f172a',
                  background: sel ? HIGHLIGHT : 'transparent',
                  borderBottom: idx < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <span style={{ fontWeight: 700 }}>{row.plz}</span>
                <span style={{ fontWeight: 400 }}> {row.lieu}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
