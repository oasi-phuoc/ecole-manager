import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const VIOLET = '#6366f1';
const VIOLET_SOFT = '#ede9fe';
const VIOLET_DARK = '#6d28d9';
const GREY_TEXT = '#1e293b';
const GREY_BORDER = '#e2e8f0';
const GREY_PLACEHOLDER = '#94a3b8';

const normalizeOptions = (options) => (options || []).map((opt) => {
  if (opt == null) return null;
  if (typeof opt === 'string' || typeof opt === 'number') {
    return { value: String(opt), label: String(opt) };
  }
  return {
    value: opt.value === undefined || opt.value === null ? '' : String(opt.value),
    label: opt.label !== undefined && opt.label !== null ? String(opt.label) : String(opt.value ?? ''),
    disabled: !!opt.disabled,
    group: opt.group,
  };
}).filter(Boolean);

const strip = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
       style={{ transition: 'transform 0.15s ease', transform: open ? 'rotate(180deg)' : 'none' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ClearIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="5" x2="19" y2="19" />
    <line x1="19" y1="5" x2="5" y2="19" />
  </svg>
);

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Choisir…',
  disabled = false,
  allowClear = true,
  searchable = true,
  style,
  className,
  ariaLabel,
  id,
  name,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hoverIdx, setHoverIdx] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const normOptions = useMemo(() => normalizeOptions(options), [options]);
  const currentValue = value === undefined || value === null ? '' : String(value);
  const selectedOption = normOptions.find(o => o.value === currentValue) || null;

  const filtered = useMemo(() => {
    if (!query) return normOptions;
    const q = strip(query);
    return normOptions.filter(o => strip(o.label).includes(q));
  }, [normOptions, query]);

  const closeAll = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHoverIdx(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) closeAll();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closeAll]);

  useEffect(() => {
    if (open && searchable && inputRef.current) {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }
  }, [open, searchable]);

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    if (onChange) onChange(opt.value, opt);
    closeAll();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) onChange('', null);
    closeAll();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHoverIdx(prev => Math.min((prev < 0 ? -1 : prev) + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHoverIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      const opt = filtered[hoverIdx >= 0 ? hoverIdx : 0];
      if (opt) handleSelect(opt);
    } else if (e.key === 'Escape') {
      closeAll();
    }
  };

  const hasValue = !!selectedOption;

  const triggerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px 7px 14px',
    borderRadius: 17,
    border: `1.5px solid ${open ? VIOLET : GREY_BORDER}`,
    background: disabled ? '#f8fafc' : 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    color: hasValue ? GREY_TEXT : GREY_PLACEHOLDER,
    fontWeight: hasValue ? 600 : 500,
    minHeight: 34,
    boxSizing: 'border-box',
    boxShadow: open ? `0 0 0 2px ${VIOLET_SOFT}` : 'none',
    transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
    outline: 'none',
    userSelect: 'none',
    width: '100%',
    ...style,
  };

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', display: 'inline-block', width: style?.width || 'auto', minWidth: style?.minWidth || 160 }}
    >
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        onKeyDown={handleKeyDown}
        style={triggerStyle}
      >
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {allowClear && hasValue && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            aria-label="Effacer la sélection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: 'none',
              background: VIOLET_SOFT,
              color: VIOLET_DARK,
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
            }}
          >
            <ClearIcon />
          </button>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', color: open ? VIOLET : GREY_PLACEHOLDER }}>
          <ChevronIcon open={open} />
        </span>
      </div>
      {name && (
        <input type="hidden" name={name} value={currentValue} />
      )}
      {open && !disabled && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 2000,
            background: 'white',
            border: `1.5px solid ${VIOLET_SOFT}`,
            borderRadius: 14,
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
            overflow: 'hidden',
            maxHeight: 280,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {searchable && (
            <div style={{ padding: 8, borderBottom: `1px solid ${VIOLET_SOFT}` }}>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHoverIdx(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher…"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 12,
                  border: `1px solid ${GREY_BORDER}`,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  color: GREY_TEXT,
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <div style={{ overflowY: 'auto', maxHeight: 220, padding: 4 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 13, color: GREY_PLACEHOLDER, textAlign: 'center' }}>
                Aucun résultat
              </div>
            )}
            {filtered.map((opt, idx) => {
              const actif = opt.value === currentValue;
              const hovered = idx === hoverIdx;
              return (
                <div
                  key={`${opt.value}-${idx}`}
                  role="option"
                  aria-selected={actif}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: 13,
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    color: opt.disabled ? GREY_PLACEHOLDER : (actif ? VIOLET_DARK : GREY_TEXT),
                    background: actif ? VIOLET_SOFT : (hovered ? '#f5f3ff' : 'transparent'),
                    fontWeight: actif ? 700 : 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
