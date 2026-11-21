// Kichik DOM yordamchilari. Foydalanuvchi matni DOIM esc() orqali o'tadi (XSS himoyasi).
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => MAP[c]);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const debounce = (fn, ms = 200) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

export function setBusy(form, busy, label) {
  const b = form.querySelector('[type=submit]');
  if (!b) return;
  if (busy) {
    b.dataset.label = b.textContent;
    b.disabled = true;
    b.classList.add('loading');
    if (label) b.textContent = label;
  } else {
    b.disabled = false;
    b.classList.remove('loading');
    if (b.dataset.label) b.textContent = b.dataset.label;
  }
}

export function showFormError(form, msg) {
  const el = form.querySelector('.form-error');
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
}
