// Majburiy yangilanish: server (version.json) talab qilgan eng kam versiyadan past bo'lsa, ilova ishlamaydi.
// version.json: { "version": "2.7.0", "min": "2.7.0" }  — min = shu versiyadan pasti bloklanadi.
import { CONFIG } from '../config.js';
import { applyUpdate } from './update.service.js';

const KEY = 'accsavdo.minVersion';

export function cmpVer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

export const isBlocked = (current, min) => !!min && cmpVer(current, min) < 0;

export function showWall(min, offline = false) {
  if (document.getElementById('update-wall')) return;
  document.getElementById('app')?.replaceChildren(); // ma'lumotlar ko'rinmasin
  const w = document.createElement('div');
  w.id = 'update-wall';
  w.setAttribute('role', 'alertdialog');
  w.setAttribute('aria-modal', 'true');
  w.innerHTML = `<div class="uw-card">
    <div class="uw-ic" aria-hidden="true">⬆️</div>
    <h1>Yangilash majburiy</h1>
    <p>Ilovaning eski versiyasi (<b>${CONFIG.VERSION}</b>) endi ishlamaydi. Davom etish uchun <b>${min}</b> yoki undan yangisiga o'ting.</p>
    ${offline ? '<p class="uw-note">Internetga ulaning, keyin «Yangilash» ni bosing.</p>' : ''}
    <button type="button" class="btn block" id="uw-btn">Yangilash</button>
  </div>`;
  document.body.appendChild(w);
  document.body.classList.add('walled');
  w.querySelector('#uw-btn').addEventListener('click', () => applyUpdate());
}

// true -> ilova ishlashi mumkin. Sozlanmagan yoki tarmoq yo'q bo'lsa, oxirgi ma'lum talab qo'llanadi.
export async function checkGate() {
  let min = null;
  let offline = false;
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      min = j.min || j.version || null; // min yo'q bo'lsa, joriy reliz talab qilinadi
      try {
        min ? localStorage.setItem(KEY, min) : localStorage.removeItem(KEY);
      } catch {}
    } else offline = true;
  } catch {
    offline = true;
  }
  if (offline) {
    try {
      min = localStorage.getItem(KEY);
    } catch {}
  }
  if (isBlocked(CONFIG.VERSION, min)) {
    showWall(min, offline);
    return false;
  }
  return true;
}

export function watchGate() {
  setInterval(checkGate, CONFIG.UPDATE_CHECK_MS);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkGate());
}
