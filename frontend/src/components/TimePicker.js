import { useState, useRef } from 'react';

const SIZE = 220;
const CX = SIZE / 2;
const OUTER_R = 82;
const INNER_R = 52;

function numPos(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { left: CX + r * Math.cos(rad), top: CX + r * Math.sin(rad) };
}

// Heures extérieur : 1-12, intérieur : 0/13-23
const HOUR_ITEMS = [
  ...Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    return { value: h, ...numPos((h / 12) * 360, OUTER_R), inner: false };
  }),
  ...[0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((h, i) => ({
    value: h, ...numPos((i / 12) * 360, INNER_R), inner: true,
  })),
];

const MINUTE_ITEMS = Array.from({ length: 12 }, (_, i) => {
  const m = i * 5;
  return { value: m, ...numPos((m / 60) * 360, OUTER_R) };
});

const fmt = n => String(Math.max(0, n)).padStart(2, '0');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function handPos(phase, h, m) {
  if (phase === 'hours') {
    if (h === 0) return numPos(0, INNER_R);
    if (h <= 12) return numPos((h / 12) * 360, OUTER_R);
    return numPos(((h - 12) / 12) * 360, INNER_R);
  }
  return numPos((m / 60) * 360, OUTER_R);
}

export default function TimePicker({ value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('hours');
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);
  const [hInput, setHInput] = useState('00');
  const [mInput, setMInput] = useState('00');

  const handleOpen = () => {
    const parts = (value || '00:00').split(':').map(Number);
    const hv = isNaN(parts[0]) ? 0 : clamp(parts[0], 0, 23);
    const mv = isNaN(parts[1]) ? 0 : clamp(parts[1], 0, 59);
    setH(hv); setM(mv);
    setHInput(fmt(hv)); setMInput(fmt(mv));
    setPhase('hours');
    hDigits.current = ''; mDigits.current = '';
    setOpen(true);
    setTimeout(() => hRef.current && hRef.current.focus(), 0);
  };

  const handleOk = () => {
    onChange({ target: { value: `${fmt(h)}:${fmt(m)}` } });
    setOpen(false);
  };

  const pickHour = (val) => {
    setH(val);
    setHInput(fmt(val));
    setPhase('minutes');
  };

  const pickMinute = (val) => {
    setM(val);
    setMInput(fmt(val));
  };

  const hRef = useRef(null);
  const mRef = useRef(null);
  const hDigits = useRef('');
  const mDigits = useRef('');

  const focusMinutes = () => { setPhase('minutes'); setTimeout(() => mRef.current && mRef.current.focus(), 0); };

  const handleHKeyDown = (e) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const d = e.key;
      const prev = hDigits.current;
      if (prev === '') {
        // Premier chiffre
        hDigits.current = d;
        const v = parseInt(d);
        setH(v); setHInput(d);
        // Si > 2, impossible d'avoir un 2e chiffre valide → auto-jump
        if (v > 2) { hDigits.current = ''; setHInput(fmt(v)); focusMinutes(); }
      } else {
        // Deuxième chiffre
        const combined = prev + d;
        const v = parseInt(combined);
        hDigits.current = '';
        if (v <= 23) {
          setH(v); setHInput(fmt(v)); focusMinutes();
        } else {
          // Combinaison invalide (ex: "29") → recommencer avec ce chiffre
          const nv = parseInt(d);
          hDigits.current = d;
          setH(nv); setHInput(d);
          if (nv > 2) { hDigits.current = ''; setHInput(fmt(nv)); focusMinutes(); }
        }
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      hDigits.current = ''; setHInput(''); setH(0);
    } else if (e.key === 'Enter' || e.key === ':') {
      e.preventDefault();
      hDigits.current = '';
      const safe = clamp(h, 0, 23); setH(safe); setHInput(fmt(safe));
      focusMinutes();
    }
  };
  const handleHBlur = () => {
    hDigits.current = '';
    const v = parseInt(hInput);
    const safe = isNaN(v) ? 0 : clamp(v, 0, 23);
    setH(safe); setHInput(fmt(safe));
  };

  const handleMKeyDown = (e) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const d = e.key;
      const prev = mDigits.current;
      if (prev === '') {
        mDigits.current = d;
        const v = parseInt(d);
        setM(v); setMInput(d);
        // Si > 5, impossible d'avoir un 2e chiffre valide (minutes 0-59)
        if (v > 5) { mDigits.current = ''; setMInput(fmt(v)); }
      } else {
        const combined = prev + d;
        const v = parseInt(combined);
        mDigits.current = '';
        if (v <= 59) { setM(v); setMInput(fmt(v)); }
        else {
          const nv = parseInt(d);
          mDigits.current = d;
          setM(nv); setMInput(d);
          if (nv > 5) { mDigits.current = ''; setMInput(fmt(nv)); }
        }
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      mDigits.current = ''; setMInput(''); setM(0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      mDigits.current = ''; handleOk();
    }
  };
  const handleMBlur = () => {
    mDigits.current = '';
    const v = parseInt(mInput);
    const safe = isNaN(v) ? 0 : clamp(v, 0, 59);
    setM(safe); setMInput(fmt(safe));
  };

  const hp = handPos(phase, h, m);
  const DOT = 17;

  const numBtnStyle = (active, inner) => ({
    position: 'absolute',
    width: DOT * 2,
    height: DOT * 2,
    borderRadius: '50%',
    border: 'none',
    background: active ? '#3b82f6' : 'rgba(0,0,0,0)',
    color: active ? 'white' : inner ? '#64748b' : '#1e293b',
    fontSize: inner ? 10 : 12,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translate(-50%, -50%)',
    fontFamily: 'inherit',
    outline: 'none',
    padding: 0,
    zIndex: 2,
    userSelect: 'none',
  });

  const inputBoxStyle = (active) => ({
    width: 52, height: 52, borderRadius: 10, textAlign: 'center',
    border: `2px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
    background: active ? '#eff6ff' : 'white',
    fontSize: 22, fontWeight: 800,
    color: active ? '#3b82f6' : '#334155',
    fontFamily: 'inherit', outline: 'none',
    cursor: 'text', padding: 0,
  });

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <input
        type="text"
        readOnly
        value={value || '--:--'}
        onClick={handleOpen}
        style={{ ...style, cursor: 'pointer' }}
      />

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, minWidth: 260 }}
            onClick={e => e.stopPropagation()}
          >
            {/* HH : MM */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                ref={hRef}
                type="text" inputMode="numeric"
                value={hInput}
                onChange={() => {}}
                onKeyDown={handleHKeyDown}
                onBlur={handleHBlur}
                onFocus={e => { setPhase('hours'); hDigits.current = ''; e.target.select(); }}
                placeholder="HH"
                style={inputBoxStyle(phase === 'hours')}
              />
              <span style={{ fontSize: 26, fontWeight: 800, color: '#334155' }}>:</span>
              <input
                ref={mRef}
                type="text" inputMode="numeric"
                value={mInput}
                onChange={() => {}}
                onKeyDown={handleMKeyDown}
                onBlur={handleMBlur}
                onFocus={e => { setPhase('minutes'); mDigits.current = ''; e.target.select(); }}
                placeholder="MM"
                style={inputBoxStyle(phase === 'minutes')}
              />
            </div>

            {/* Phase label */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                onClick={() => setPhase('hours')}
                style={{ padding: '4px 12px', borderRadius: 20, border: 'none', background: phase === 'hours' ? '#3b82f6' : '#f1f5f9', color: phase === 'hours' ? 'white' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                Heures
              </button>
              <button type="button"
                onClick={() => setPhase('minutes')}
                style={{ padding: '4px 12px', borderRadius: 20, border: 'none', background: phase === 'minutes' ? '#3b82f6' : '#f1f5f9', color: phase === 'minutes' ? 'white' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                Minutes
              </button>
            </div>

            {/* Cadran */}
            <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
              {/* SVG pour fond + aiguille seulement — PAS interactif */}
              <svg width={SIZE} height={SIZE} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                <circle cx={CX} cy={CX} r={CX - 2} fill="#f1f5f9" />
                <line x1={CX} y1={CX} x2={hp.left} y2={hp.top} stroke="#3b82f6" strokeWidth={2} />
                <circle cx={hp.left} cy={hp.top} r={DOT} fill={hp.left === CX && hp.top === CX ? 'transparent' : '#bfdbfe'} />
                <circle cx={CX} cy={CX} r={5} fill="#3b82f6" />
              </svg>

              {/* Boutons HTML positionnés en absolu — toujours cliquables */}
              {phase === 'hours'
                ? HOUR_ITEMS.map(item => (
                    <button
                      key={item.value}
                      type="button"
                      style={{ ...numBtnStyle(h === item.value, item.inner), left: item.left, top: item.top }}
                      onClick={() => pickHour(item.value)}
                    >
                      {item.value === 0 ? '00' : fmt(item.value)}
                    </button>
                  ))
                : MINUTE_ITEMS.map(item => (
                    <button
                      key={item.value}
                      type="button"
                      style={{ ...numBtnStyle(m === item.value, false), left: item.left, top: item.top }}
                      onClick={() => pickMinute(item.value)}
                    >
                      {fmt(item.value)}
                    </button>
                  ))
              }
            </div>

            {/* OK / Annuler */}
            <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOpen(false)}
                style={{ padding: '9px 20px', border: 'none', background: 'none', color: '#3b82f6', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
              <button type="button" onClick={handleOk}
                style={{ padding: '9px 20px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit' }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
