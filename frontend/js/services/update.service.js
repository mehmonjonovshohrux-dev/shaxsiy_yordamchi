// Yangi versiya borligini tekshiradi (version.json bilan) va yangilaydi.
import { CONFIG } from '../config.js';
import { setState } from '../core/store.js';

export async function checkUpdate() {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    setState({ update: j.version && j.version !== CONFIG.VERSION ? j : null });
    return j;
  } catch {
    return null; // internet yo'q: jim
  }
}

export function startUpdateWatch() {
  checkUpdate();
  setInterval(checkUpdate, CONFIG.UPDATE_CHECK_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkUpdate();
  });
}

// Foydalanuvchi «Yangilash» ni bosganda: kutayotgan versiya faollashtiriladi va sahifa yangilanadi.
function waitInstalled(sw, ms = 10000) {
  return new Promise((resolve) => {
    if (sw.state === 'installed') return resolve(sw);
    const t = setTimeout(() => resolve(null), ms);
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed') {
        clearTimeout(t);
        resolve(sw);
      }
    });
  });
}

export async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
    const w = reg?.waiting || (reg?.installing ? await waitInstalled(reg.installing) : null);
    if (w) {
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      w.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => location.reload(), 5000); // zaxira
      return;
    }
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {}
  location.reload();
}
