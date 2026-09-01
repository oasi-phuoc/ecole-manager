import React, { useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

const DEFAULT_KEEP_ALIVE_VIEWS = 12;

function parseKeepAliveViews() {
  const raw = process.env.REACT_APP_KEEP_ALIVE_VIEWS;
  if (raw == null || raw === '') return DEFAULT_KEEP_ALIVE_VIEWS;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_KEEP_ALIVE_VIEWS;
  return n;
}

const MAX_CACHED_VIEWS = parseKeepAliveViews();

/**
 * Garde les dernières pages montées (display:none) pour éviter
 * un remount complet à chaque navigation — état UI + cache API.
 */
export default function KeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const cacheRef = useRef(new Map());
  const orderRef = useRef([]);

  const key = `${location.pathname}${location.search}`;

  if (outlet) {
    cacheRef.current.set(key, outlet);
    const order = orderRef.current.filter((k) => k !== key);
    order.push(key);
    orderRef.current = order;
    while (orderRef.current.length > MAX_CACHED_VIEWS) {
      const oldest = orderRef.current.shift();
      if (oldest) cacheRef.current.delete(oldest);
    }
  }

  return (
    <div className="keep-alive-outlet" style={{ minHeight: 0, flex: 1 }}>
      {Array.from(cacheRef.current.entries()).map(([k, node]) => (
        <div
          key={k}
          className="keep-alive-page"
          style={{
            display: k === key ? 'block' : 'none',
            minHeight: '100%',
          }}
          aria-hidden={k !== key}
        >
          {node}
        </div>
      ))}
    </div>
  );
}
