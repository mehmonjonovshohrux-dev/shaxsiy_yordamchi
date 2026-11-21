// Ilovani qurilmaga o'rnatish (PWA). Brauzer hodisasini ushlab turadi.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPromptInstall = () => !!deferred;
export const onInstallChange = (fn) => listeners.add(fn);

export async function promptInstall() {
  if (!deferred) return 'unavailable';
  deferred.prompt();
  const res = await deferred.userChoice;
  deferred = null;
  notify();
  return res.outcome;
}
