import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
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

  const recalcPanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const panelMaxHeight = 300;
    const openUp = spaceBelow < panelMaxHeight + 12 && rect.top > spaceBelow;
    setPanelPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    recalcPanelPos();
    const handler = (e) => {
      const t = e.target;
      if (wrapRef.current && wrapRef.current.contains(t)) return;
      if (listRef.current && listRef.current.contains(t)) return;
      closeAll();
    };
    const onScrollOrResize = () => recalcPanelPos();
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, closeAll, recalcPanelPos]);

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
    borderRadius: 999,
  };

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', display: 'inline-block', width: style?.width || 'auto', minWidth: style?.minWidth || 160 }}
    >
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        id={id}
        onMouseDown={(e) => {
          if (disabled) return;
          // Toggle à l'ouverture ; si déjà ouvert et clic sur une autre zone que l'input, fermer
          if (e.target !== inputRef.current) {
            e.preventDefault();
            if (open) {
              closeAll();
            } else {
              setOpen(true);
              setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
            }
          }
        }}
        style={triggerStyle}
      >
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          autoComplete="off"
          disabled={disabled}
          readOnly={!searchable}
          value={open ? query : (selectedOption ? selectedOption.label : '')}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          onFocus={() => { if (!disabled && !open) setOpen(true); }}
          onChange={(e) => {
            if (!searchable) return;
            if (!open) setOpen(true);
            setQuery(e.target.value);
            setHoverIdx(0);
          }}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: 0,
            margin: 0,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: open ? 500 : (hasValue ? 600 : 500),
            color: open ? GREY_TEXT : (hasValue ? GREY_TEXT : GREY_PLACEHOLDER),
            cursor: disabled ? 'not-allowed' : (searchable ? 'text' : 'pointer'),
            textOverflow: 'ellipsis',
          }}
        />
        {allowClear && hasValue && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
        <span style={{ display: 'inline-flex', alignItems: 'center', color: open ? VIOLET : GREY_PLACEHOLDER, pointerEvents: 'none' }}>
          <ChevronIcon open={open} />
        </span>
      </div>
      {name && (
        <input type="hidden" name={name} value={currentValue} />
      )}
      {open && !disabled && createPortal(
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: panelPos.openUp ? undefined : panelPos.top,
            bottom: panelPos.openUp ? (window.innerHeight - panelPos.top) : undefined,
            left: panelPos.left,
            width: panelPos.width,
            zIndex: 10000,
            background: 'white',
            border: `1.5px solid ${VIOLET_SOFT}`,
            borderRadius: 24,
            boxShadow: '0 12px 32px rgba(99, 102, 241, 0.18)',
            overflow: 'hidden',
            maxHeight: 300,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="custom-select-list" style={{ overflowY: 'auto', maxHeight: 190, padding: 6 }}>
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
                    padding: '8px 14px',
                    borderRadius: 14,
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
