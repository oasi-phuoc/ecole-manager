import { useEffect } from 'react';

const TAB_BG = '#ede9fe';

function tabButtons(el) {
  return Array.from(el?.children || []).filter((c) => c.tagName === 'BUTTON');
}

function looksLikeChipTabs(el) {
  if (!el || el.classList.contains('chip-tabs') || el.classList.contains('mobile-chip-tabs') || el.classList.contains('mobile-tabs-bar')) {
    return false;
  }
  const buttons = tabButtons(el);
  if (buttons.length < 2) return false;
  const style = (el.getAttribute('style') || '').toLowerCase();
  const cs = window.getComputedStyle(el);
  const bg = (cs.backgroundColor || '').replace(/\s/g, '');
  const radius = parseFloat(cs.borderRadius) || 0;
  const hasPillBg = style.includes(TAB_BG) || bg === 'rgb(237,233,254)';
  const hasFolderBorder = style.includes('#6366f1') && style.includes('border-bottom');
  return (hasPillBg && radius >= 12) || hasFolderBorder;
}

function markTabSizing(el) {
  if (!el) return;
  const n = tabButtons(el).length;
  if (n < 2) return;
  el.classList.toggle('chip-tabs-scroll', n > 5);
  el.classList.toggle('chip-tabs-equal', n <= 5);
}

function ensureTableScroll(table) {
  if (!table || table.closest('.table-scroll') || table.closest('.no-mobile-wrap')) return;
  const parent = table.parentElement;
  if (!parent) return;
  const overflowX = window.getComputedStyle(parent).overflowX;
  if (overflowX === 'auto' || overflowX === 'scroll') {
    parent.classList.add('table-scroll');
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'table-scroll';
  parent.insertBefore(wrap, table);
  wrap.appendChild(table);
}

function enhanceHost(host) {
  if (!host) return;
  host.querySelectorAll('table').forEach(ensureTableScroll);
  host.querySelectorAll('div').forEach((div) => {
    if (looksLikeChipTabs(div)) div.classList.add('mobile-chip-tabs');
    if (
      div.classList.contains('chip-tabs')
      || div.classList.contains('mobile-chip-tabs')
      || div.classList.contains('mobile-tabs-bar')
    ) {
      markTabSizing(div);
    }
  });
}

/**
 * Améliore le DOM des pages en mode mobile :
 * - wrappe les tableaux dans un scroll horizontal
 * - marque les groupes d’onglets pastilles
 */
export default function MobilePageEnhancer({ enabled }) {
  useEffect(() => {
    if (!enabled) return undefined;
    const host = document.querySelector('.app-page-host');
    if (!host) return undefined;

    let scheduled = false;
    const run = () => {
      scheduled = false;
      enhanceHost(host);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(run);
    };

    run();
    const mo = new MutationObserver(schedule);
    mo.observe(host, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [enabled]);

  return null;
}
