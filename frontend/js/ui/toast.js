// Qisqa xabarlar (toast). action = {label, fn} bo'lsa "Bekor qilish" kabi tugma chiqadi.
import { esc } from '../core/dom.js';

export function toast(msg, opts = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${opts.type || ''}`;
  el.setAttribute('role', opts.type === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${opts.action ? `<button type="button" class="toast-act">${esc(opts.action.label)}</button>` : ''}`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));

  const remove = () => {
    el.classList.remove('in');
    setTimeout(() => el.remove(), 250);
  };
  const ms = opts.ms ?? (opts.type === 'error' ? 5000 : opts.action ? 6000 : 3000);
  const t = setTimeout(remove, ms);
  el.querySelector('.toast-act')?.addEventListener('click', () => {
    clearTimeout(t);
    remove();
    opts.action.fn();
  });
  while (host.children.length > 3) host.firstElementChild.remove();
}
