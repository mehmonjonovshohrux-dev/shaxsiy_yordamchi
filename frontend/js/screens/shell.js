// Asosiy qobiq: yuqori panel, pastki navigatsiya, bannerlar. Bo'limlar registerTab bilan ulanadi.
import { $ } from '../core/dom.js';
import { getState, setState } from '../core/store.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { hydrate } from '../services/images.service.js';
import { loadAccounts } from '../services/accounts.service.js';
import { toast } from '../ui/toast.js';
import { installBannerHtml } from './install.js';

const TABS = [
  { id: 'home', label: 'Bosh', icon: 'home' },
  { id: 'own', label: 'Shaxsiy', icon: 'user' },
  { id: 'partner', label: '50/50', icon: 'users' },
  { id: 'report', label: 'Hisobot', icon: 'chart' },
  { id: 'settings', label: 'Sozlama', icon: 'sliders' },
];
const NO_FAB = new Set(['report', 'settings']);
const registry = {};
export const registerTab = (id, def) => {
  registry[id] = def;
};

export function mountShell() {
  $('#app').innerHTML = `
  <div class="shell">
    <div id="banners"></div>
    <header class="topbar">
      <h1 id="screen-title"></h1>
      <button type="button" class="icon-btn" data-act="refresh" aria-label="Yangilash">${icon('refresh', 20)}</button>
    </header>
    <main id="tab-content" class="tab-content" tabindex="-1"></main>
    <button type="button" class="fab" data-act="new-account" aria-label="Akkaunt qo'shish">${icon('plus', 28)}</button>
    <nav class="tabbar" aria-label="Asosiy bo'limlar">
      ${TABS.map((t) => `<button type="button" data-act="tab" data-tab="${t.id}" aria-label="${t.label}">${icon(t.icon, 22)}<span>${t.label}</span></button>`).join('')}
    </nav>
  </div>`;
  renderBanners();
  renderTab();
}

export function renderBanners() {
  const host = $('#banners');
  if (!host) return;
  const { online } = getState();
  host.innerHTML = `${online ? '' : `<div class="offline-bar" role="status">${icon('wifioff', 16)} Internet yo'q: ma'lumotlar saqlanmaydi</div>`}${installBannerHtml()}`;
}

export function setTab(id) {
  const st = getState();
  if (st.tab === id) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  setState({ tab: id, query: '' });
  renderTab(true);
}

export function renderTab(resetScroll = false) {
  const st = getState();
  const def = registry[st.tab];
  const el = $('#tab-content');
  if (!def || !el) return;
  const y = window.scrollY;
  $('#screen-title').textContent = def.title;
  el.innerHTML = def.view(st);
  def.mount?.(el);
  hydrate(el);
  document.querySelectorAll('.tabbar button').forEach((b) => {
    const on = b.dataset.tab === st.tab;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $('.fab').hidden = NO_FAB.has(st.tab);
  window.scrollTo(0, resetScroll ? 0 : y);
}

registerActions({
  tab: (btn) => setTab(btn.dataset.tab),
  refresh: async (btn) => {
    btn.classList.add('spin');
    try {
      await loadAccounts();
      renderTab();
      toast('Yangilandi');
    } catch {
      toast("Yangilab bo'lmadi. Internetni tekshiring.", { type: 'error' });
    } finally {
      btn.classList.remove('spin');
    }
  },
});
