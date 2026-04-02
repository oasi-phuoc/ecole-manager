import React, { useState } from 'react';

const SIZE = 224;
const CX = SIZE / 2;
const OUTER_R = 84;
const INNER_R = 56;
const DOT_R = 18;

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

function handPos(phase, h, m) {
  if (phase === 'hours') {
    if (h === 0) return deg2xy(0, INNER_R);
    if (h <= 12) return deg2xy((h / 12) * 360, OUTER_R);
    return deg2xy(((h - 12) / 12) * 360, INNER_R);
  }
  return deg2xy((m / 60) * 360, OUTER_R);
}

const fmt = n => String(n).padStart(2, '0');

export default function TimePicker({ value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('hours');
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);

  const handleOpen = () => {
    const parts = (value || '00:00').split(':').map(Number);
    setH(isNaN(parts[0]) ? 0 : parts[0]);
    setM(isNaN(parts[1]) ? 0 : parts[1]);
    setPhase('hours');
    setOpen(true);
  };

  const handleOk = () => {
    onChange({ target: { value: `${fmt(h)}:${fmt(m)}` } });
    setOpen(false);
  };

  const hp = handPos(phase, h, m);

  const handleSvgClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - rect.left - CX;
    const dy = e.clientY - rect.top - CX;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angleDeg = ((Math.atan2(dy, dx) * 180 / Math.PI) + 90 + 360) % 360;

    if (phase === 'hours') {
      const isInner = dist < (INNER_R + OUTER_R) / 2;
      const idx = Math.round(angleDeg / 30) % 12;
      if (isInner) {
        setH(idx === 0 ? 0 : idx + 12);
      } else {
        setH(idx === 0 ? 12 : idx);
      }
      setPhase('minutes');
    } else {
      setM(Math.round(angleDeg / 6) % 60);
    }
  };

  const btnBase = (active) => ({
    width: 52, height: 52, borderRadius: 10,
    border: `2px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
    background: active ? '#eff6ff' : 'white',
    fontSize: 22, fontWeight: 800, cursor: 'pointer',
    color: active ? '#3b82f6' : '#334155', fontFamily: 'inherit',
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
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
            onClick={e => e.stopPropagation()}
          >
            {/* HH : MM */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" onClick={() => setPhase('hours')} style={btnBase(phase === 'hours')}>{fmt(h)}</button>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#334155' }}>:</span>
              <button type="button" onClick={() => setPhase('minutes')} style={btnBase(phase === 'minutes')}>{fmt(m)}</button>
            </div>

            {/* Horloge SVG */}
            <svg width={SIZE} height={SIZE} onClick={handleSvgClick} style={{ cursor: 'crosshair', display: 'block' }}>
              <circle cx={CX} cy={CX} r={CX - 2} fill="#f1f5f9" />
              <line x1={CX} y1={CX} x2={hp.x} y2={hp.y} stroke="#3b82f6" strokeWidth={2} />
              <circle cx={CX} cy={CX} r={4} fill="#3b82f6" />
              <circle cx={hp.x} cy={hp.y} r={DOT_R} fill="#3b82f6" />

              {phase === 'hours'
                ? HOUR_ITEMS.map(item => (
                  <text key={item.value} x={item.x} y={item.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={item.inner ? 10 : 12}
                    fontWeight={h === item.value ? 700 : 400}
                    fill={h === item.value ? 'white' : item.inner ? '#64748b' : '#334155'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {item.value === 0 ? '00' : fmt(item.value)}
                  </text>
                ))
                : MINUTE_ITEMS.map(item => (
                  <text key={item.value} x={item.x} y={item.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={12}
                    fontWeight={m === item.value ? 700 : 400}
                    fill={m === item.value ? 'white' : '#334155'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {fmt(item.value)}
                  </text>
                ))
              }

              <text x={CX} y={CX} textAnchor="middle" dominantBaseline="central"
                fontSize={11} fill="#94a3b8" fontWeight={600}
                style={{ pointerEvents: 'none' }}>
                {phase === 'hours' ? 'Heures' : 'Minutes'}
              </text>
            </svg>

            {/* Boutons */}
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
