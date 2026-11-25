// Ilova kirish nuqtasi: tartib bilan ishga tushirish. Biznes mantiq bu yerda YO'Q: u modullarda.
import './core/actions.js';
import './ui/inputs.js';
import { $ } from './core/dom.js';
import { getState, setState } from './core/store.js';
import { initRouter, overlayCount } from './core/router.js';
import { toast } from './ui/toast.js';
import { onInstallChange } from './services/install.service.js';
import { getSession, onAuthChange, mfaNeeded, mfaFactor } from './services/auth.service.js';
import { loadAccounts } from './services/accounts.service.js';
import * as lock from './services/lock.service.js';
import { startAuth } from './screens/auth/index.js';
import { showLock, watchVisibility } from './screens/lock.js';
import { mountShell, renderTab, renderBanners, setTab } from './screens/shell.js';
import './screens/home.js';
import './screens/accounts.js';
import './screens/reports.js';
import './screens/settings.js';
import './screens/security.js';
import './screens/install.js';
import './screens/menu.js';
import './screens/notifications.js';
import './screens/profile.js';
import './screens/contact.js';
import './screens/help.js';
import './screens/security-hub.js';
import './screens/notif-settings.js';
import './screens/account-menu.js';
import { maybeAskSecurity } from './screens/security-onboarding.js';
import { maybeDailyDigest } from './services/notify.service.js';
import { currentNotes } from './screens/shell.js';
import { openProfile } from './screens/profile.js';
import { getProfile } from './services/profile.service.js';
import { startUpdateWatch } from './services/update.service.js';
import { checkGate, watchGate } from './services/update-gate.js';
import { openAccountForm } from './screens/account-form.js';

async function afterAuth() {
  if (await mfaNeeded()) return startAuth('mfa', afterAuth);
  const session = await getSession();
  if (!session) return startAuth('login', afterAuth);
  // 2FA majburiy: yoqilmagan bo'lsa, avval shuni sozlatamiz (parol qayta so'raladi)
  if (!(await mfaFactor())) return startAuth('mfa-setup', afterAuth);
  setState({ user: session.user });
  if (lock.isEnabled(session.user.id)) {
    $('#app').innerHTML = ''; // qulf ochilmaguncha ma'lumot ko'rinmaydi
    showLock({ uid: session.user.id, onUnlock: enterApp });
  } else {
    enterApp();
  }
}

async function enterApp() {
  mountShell();
  try {
    await loadAccounts();
  } catch {
    toast("Ma'lumotlarni yuklab bo'lmadi", { type: 'error' });
  }
  renderTab();
  startUpdateWatch();
  // Birinchi kirishda profilni to'ldirishni so'raymiz (bir marta)
  try {
    if (!getProfile().complete && !localStorage.getItem('accsavdo.profilePrompted')) {
      localStorage.setItem('accsavdo.profilePrompted', '1');
      setTimeout(() => openProfile({ intro: true }), 600);
    }
  } catch {}
  // Himoya yoqilmagan bo'lsa darhol so'raymiz; tizim bildirishnomasi (kuniga bir marta)
  setTimeout(maybeAskSecurity, 900);
  try {
    maybeDailyDigest(currentNotes());
  } catch {}
  // Bosh ekran yorlig'i: /?new=1 -> yangi akkaunt formasi
  if (new URLSearchParams(location.search).get('new') === '1') {
    history.replaceState(history.state, '', location.pathname);
    openAccountForm();
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // yangi versiya faollashdi: ochiq oyna bo'lmasa, o'zimiz yangilaymiz
    if (had && overlayCount() === 0 && !getState().locked) location.reload();
  });
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW:', e));
}

async function boot() {
  if (!(await checkGate())) return; // eski versiya: ilova yangilanmaguncha ishlamaydi
  watchGate();
  initRouter({ getTab: () => getState().tab, goHome: () => setTab('home'), isLocked: () => getState().locked });
  registerServiceWorker();

  window.addEventListener('online', () => {
    setState({ online: true });
    renderBanners();
    toast('Internet qaytdi');
  });
  window.addEventListener('offline', () => {
    setState({ online: false });
    renderBanners();
  });
  onInstallChange(renderBanners);
  onAuthChange((ev) => {
    if (ev === 'SIGNED_OUT' && getState().user) location.reload(); // sessiya tugadi
  });
  watchVisibility({
    getUser: () => getState().user,
    onLock: () => showLock({ uid: getState().user.id, onUnlock: () => {} }),
  });
  window.addEventListener('unhandledrejection', (e) => console.error('Kutilmagan:', e.reason));

  const session = await getSession();
  if (!session) return startAuth('login', afterAuth);
  return afterAuth();
}

boot().catch((e) => {
  console.error(e);
  $('#app').innerHTML = `<div class="boot"><p>Ilovani ishga tushirib bo'lmadi.</p><button class="btn" onclick="location.reload()">Qayta urinish</button></div>`;
});
