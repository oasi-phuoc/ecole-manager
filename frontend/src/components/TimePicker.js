import React, { useState, useRef } from 'react';

const SIZE = 224;
const CX = SIZE / 2;
const OUTER_R = 84;
const INNER_R = 56;
const DOT_R = 17;

function deg2xy(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CX + r * Math.sin(rad) };
}

const HOUR_ITEMS = [
  ...Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    return { value: h, ...deg2xy((h / 12) * 360, OUTER_R), inner: false };
  }),
  ...[0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((h, i) => ({
    value: h, ...deg2xy((i / 12) * 360, INNER_R), inner: true,
  })),
];

const MINUTE_ITEMS = Array.from({ length: 12 }, (_, i) => {
  const m = i * 5;
  return { value: m, ...deg2xy((m / 60) * 360, OUTER_R) };
});

function getHandPos(phase, h, m) {
  if (phase === 'hours') {
    if (h === 0) return deg2xy(0, INNER_R);
    if (h <= 12) return deg2xy((h / 12) * 360, OUTER_R);
    return deg2xy(((h - 12) / 12) * 360, INNER_R);
  }
  return deg2xy((m / 60) * 360, OUTER_R);
}

const fmt = n => String(Math.max(0, n)).padStart(2, '0');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function TimePicker({ value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('hours');
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);
  const [hInput, setHInput] = useState('00');
  const [mInput, setMInput] = useState('00');
  const svgRef = useRef(null);

  const handleOpen = () => {
    const parts = (value || '00:00').split(':').map(Number);
    const hv = isNaN(parts[0]) ? 0 : clamp(parts[0], 0, 23);
    const mv = isNaN(parts[1]) ? 0 : clamp(parts[1], 0, 59);
    setH(hv); setM(mv);
    setHInput(fmt(hv)); setMInput(fmt(mv));
    setPhase('hours');
    setOpen(true);
  };

  const handleOk = () => {
    onChange({ target: { value: `${fmt(h)}:${fmt(m)}` } });
    setOpen(false);
  };

  // Click on a number item
  const pickHour = (val) => { setH(val); setHInput(fmt(val)); setPhase('minutes'); };
  const pickMinute = (val) => { setM(val); setMInput(fmt(val)); };

  // Click anywhere on the SVG background (analog picking)
  const handleSvgClick = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left - CX;
    const dy = e.clientY - rect.top - CX;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return; // ignore center click
    const angleDeg = ((Math.atan2(dy, dx) * 180 / Math.PI) + 90 + 360) % 360;

    if (phase === 'hours') {
      const isInner = dist < (INNER_R + OUTER_R) / 2;
      const idx = Math.round(angleDeg / 30) % 12;
      const val = isInner ? (idx === 0 ? 0 : idx + 12) : (idx === 0 ? 12 : idx);
      setH(val); setHInput(fmt(val));
      setPhase('minutes');
    } else {
      const val = Math.round(angleDeg / 6) % 60;
      setM(val); setMInput(fmt(val));
    }
  };

  // Typing in HH field
  const handleHInput = (e) => {
    setHInput(e.target.value);
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v >= 0 && v <= 23) { setH(v); }
  };
  const handleHBlur = () => {
    const v = parseInt(hInput);
    const safe = isNaN(v) ? 0 : clamp(v, 0, 23);
    setH(safe); setHInput(fmt(safe));
  };

  // Typing in MM field
  const handleMInput = (e) => {
    setMInput(e.target.value);
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v >= 0 && v <= 59) { setM(v); }
  };
  const handleMBlur = () => {
    const v = parseInt(mInput);
    const safe = isNaN(v) ? 0 : clamp(v, 0, 59);
    setM(safe); setMInput(fmt(safe));
  };

  const hp = getHandPos(phase, h, m);

  const inputBoxStyle = (active) => ({
    width: 52, height: 52, borderRadius: 10, textAlign: 'center',
    border: `2px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
    background: active ? '#eff6ff' : 'white',
    fontSize: 22, fontWeight: 800,
    color: active ? '#3b82f6' : '#334155',
    fontFamily: 'inherit', outline: 'none',
    cursor: 'text',
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={() => setOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* HH : MM — saisie directe */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" min="0" max="23"
                value={hInput}
                onChange={handleHInput}
                onBlur={handleHBlur}
                onFocus={() => setPhase('hours')}
                style={inputBoxStyle(phase === 'hours')}
              />
              <span style={{ fontSize: 26, fontWeight: 800, color: '#334155' }}>:</span>
              <input
                type="number" min="0" max="59"
                value={mInput}
                onChange={handleMInput}
                onBlur={handleMBlur}
                onFocus={() => setPhase('minutes')}
                style={inputBoxStyle(phase === 'minutes')}
              />
            </div>

            {/* Horloge SVG */}
            <svg ref={svgRef} width={SIZE} height={SIZE} onClick={handleSvgClick} style={{ display: 'block', cursor: 'crosshair' }}>
              {/* Fond */}
              <circle cx={CX} cy={CX} r={CX - 2} fill="#f1f5f9" />

              {/* Aiguille */}
              <line x1={CX} y1={CX} x2={hp.x} y2={hp.y} stroke="#3b82f6" strokeWidth={2} />
              <circle cx={CX} cy={CX} r={4} fill="#3b82f6" />

              {/* Chiffres avec zone cliquable */}
              {phase === 'hours'
                ? HOUR_ITEMS.map(item => {
                    const active = h === item.value;
                    return (
                      <g key={item.value} onClick={(e) => { e.stopPropagation(); pickHour(item.value); }} style={{ cursor: 'pointer' }}>
                        <circle cx={item.x} cy={item.y} r={DOT_R} fill={active ? '#3b82f6' : 'transparent'} />
                        <text x={item.x} y={item.y}
                          textAnchor="middle" dominantBaseline="central"
                          fontSize={item.inner ? 10 : 12} fontWeight={active ? 700 : 400}
                          fill={active ? 'white' : item.inner ? '#64748b' : '#334155'}
                          style={{ userSelect: 'none', pointerEvents: 'none' }}>
                          {item.value === 0 ? '00' : fmt(item.value)}
                        </text>
                      </g>
                    );
                  })
                : MINUTE_ITEMS.map(item => {
                    const active = m === item.value;
                    return (
                      <g key={item.value} onClick={(e) => { e.stopPropagation(); pickMinute(item.value); }} style={{ cursor: 'pointer' }}>
                        <circle cx={item.x} cy={item.y} r={DOT_R} fill={active ? '#3b82f6' : 'transparent'} />
                        <text x={item.x} y={item.y}
                          textAnchor="middle" dominantBaseline="central"
                          fontSize={12} fontWeight={active ? 700 : 400}
                          fill={active ? 'white' : '#334155'}
                          style={{ userSelect: 'none', pointerEvents: 'none' }}>
                          {fmt(item.value)}
                        </text>
                      </g>
                    );
                  })
              }

              {/* Label centre */}
              <text x={CX} y={CX} textAnchor="middle" dominantBaseline="central"
                fontSize={11} fill="#94a3b8" fontWeight={600} style={{ pointerEvents: 'none' }}>
                {phase === 'hours' ? 'Heures' : 'Minutes'}
              </text>
            </svg>

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
