// PIN kiritish paneli (qulf ekrani va PIN o'rnatishda ishlatiladi).
import { CONFIG } from '../config.js';
import { icon } from './icons.js';

export function pinPadHtml({ bio = false } = {}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return `
  <div class="pin" data-pin>
    <div class="pin-dots" aria-live="polite">${Array.from({ length: CONFIG.PIN_LENGTH }, () => '<i></i>').join('')}</div>
    <p class="pin-msg" role="alert"></p>
    <div class="pin-keys">
      ${keys.map((k) => `<button type="button" data-k="${k}">${k}</button>`).join('')}
      ${bio ? `<button type="button" class="alt" data-k="bio" aria-label="Barmoq izi">${icon('finger', 28)}</button>` : '<span></span>'}
      <button type="button" data-k="0">0</button>
      <button type="button" class="alt" data-k="back" aria-label="O'chirish">${icon('backspace', 26)}</button>
    </div>
  </div>`;
}

// root ichidagi [data-pin] ni jonlantiradi.
export function mountPinPad(root, { onComplete, onBio }) {
  const pad = root.querySelector('[data-pin]');
  const dots = [...pad.querySelectorAll('.pin-dots i')];
  const msg = pad.querySelector('.pin-msg');
  let val = '';
  let busy = false;

  const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));

  const api = {
    reset() {
      val = '';
      paint();
    },
    message(t, bad = false) {
      msg.textContent = t || '';
      msg.classList.toggle('bad', bad);
    },
    async shake() {
      pad.classList.add('shake');
      setTimeout(() => pad.classList.remove('shake'), 450);
    },
  };

  const press = async (k) => {
    if (busy) return;
    if (k === 'bio') return onBio?.();
    if (k === 'back') {
      val = val.slice(0, -1);
      paint();
      return;
    }
    if (!/^\d$/.test(k) || val.length >= CONFIG.PIN_LENGTH) return;
    val += k;
    paint();
    if (val.length === CONFIG.PIN_LENGTH) {
      busy = true;
      const entered = val;
      try {
        await onComplete(entered, api);
      } finally {
        busy = false;
      }
    }
  };

  pad.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) press(b.dataset.k);
  });
  const onKey = (e) => {
    if (!pad.isConnected) return document.removeEventListener('keydown', onKey);
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('back');
  };
  document.addEventListener('keydown', onKey);
  return api;
}
