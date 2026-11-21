// Logotip va umumiy kichik bloklar.
import { esc } from '../core/dom.js';
import { icon } from './icons.js';

export const logo = (size = 44) => `
<svg class="logo" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs>
  <rect width="48" height="48" rx="12" fill="url(#lg)"/>
  <rect x="11" y="26" width="6" height="11" rx="2" fill="#fff" opacity=".7"/>
  <rect x="21" y="19" width="6" height="18" rx="2" fill="#fff" opacity=".85"/>
  <rect x="31" y="11" width="6" height="26" rx="2" fill="#fff"/>
</svg>`;

export const emptyState = ({ iconName = 'tag', title, text, cta, act }) => `
<div class="empty">
  <div class="empty-ic">${icon(iconName, 34)}</div>
  <h3>${esc(title)}</h3>
  <p class="muted">${esc(text)}</p>
  ${cta ? `<button type="button" class="btn" data-act="${act}">${esc(cta)}</button>` : ''}
</div>`;

export const skeletonCards = (n = 3) =>
  Array.from({ length: n }, () => '<div class="acc-card skeleton"><div class="thumb"></div><div class="acc-main"><i></i><i></i></div></div>').join('');
