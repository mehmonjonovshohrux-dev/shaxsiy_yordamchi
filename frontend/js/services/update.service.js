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

export async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {}
  location.reload();
}
