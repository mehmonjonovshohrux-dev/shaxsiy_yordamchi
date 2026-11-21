// Pastdan chiqadigan oynalar (sheet) va tasdiqlash dialogi. "Orqaga" tugmasi bilan yopiladi.
import { esc } from '../core/dom.js';
import { openOverlay, closeTop } from '../core/router.js';
import { icon } from './icons.js';

export function openSheet({ title, html, size = 'md', onClose, guard, onBlocked, hideHead = false }) {
  const host = document.getElementById('overlays');
  const wrap = document.createElement('div');
  wrap.className = `sheet-wrap ${size}`;
  wrap.innerHTML = `
    <div class="backdrop" data-sheet-close></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1">
      ${hideHead ? '' : `<header class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-sheet-close aria-label="Yopish">${icon('x')}</button></header>`}
      <div class="sheet-body">${html}</div>
    </section>`;
  host.appendChild(wrap);
  requestAnimationFrame(() => {
    wrap.classList.add('open');
    wrap.querySelector('.sheet').focus({ preventScroll: true });
  });
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-close]')) closeTop();
  });

  openOverlay({
    close: () => {
      wrap.classList.remove('open');
      setTimeout(() => wrap.remove(), 230);
      if (onClose) onClose();
    },
    guard,
    onBlocked,
  });
  return { el: wrap, body: wrap.querySelector('.sheet-body'), close: closeTop };
}

export function confirmDialog({ title, text, ok = 'Ha', cancel = 'Bekor qilish', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const ctl = openSheet({
      title,
      size: 'sm',
      html: `<p class="muted dlg-text">${esc(text)}</p>
        <div class="btn-row"><button type="button" class="btn ghost" data-c="0">${esc(cancel)}</button><button type="button" class="btn ${danger ? 'danger' : ''}" data-c="1">${esc(ok)}</button></div>`,
      onClose: () => resolve(result),
    });
    ctl.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      result = b.dataset.c === '1';
      closeTop();
    });
  });
}
