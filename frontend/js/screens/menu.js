// Chap menyu (drawer). Katta saytlardagi kabi: bo'limlar guruhlangan.
import { esc } from '../core/dom.js';
import { CONFIG } from '../config.js';
import { getState } from '../core/store.js';
import { registerActions, trigger } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openOverlay, closeTop } from '../core/router.js';
import { getProfile, hydrateAvatars } from '../services/profile.service.js';
import { pretty } from '../logic/phone.js';
import { currentNotes, setTab } from './shell.js';
import { unreadCount } from '../logic/notifications.js';

const GROUPS = [
  { title: 'Asosiy', items: [
    ['home', 'Bosh sahifa', 'home'], ['own', 'Shaxsiy akkauntlar', 'user'], ['partner', '50/50 akkauntlar', 'users'],
    ['sold', 'Sotilganlar', 'archive'], ['inst', "Muddatli to'lovlar", 'calendar'], ['report', 'Hisobot', 'chart'],
  ] },
  { title: 'Boshqaruv', items: [
    ['notes', 'Bildirishnomalar', 'bell'], ['profile', 'Profil', 'user'], ['security', "Ma'lumotlar va xavfsizlik", 'shieldcheck'], ['settings', 'Sozlamalar', 'sliders'],
  ] },
  { title: 'Yordam', items: [
    ['guide', "Yo'riqnoma", 'book'], ['about', 'Ilova haqida', 'info'], ['contact', "Admin bilan bog'lanish", 'headset'],
  ] },
];
const TABS = new Set(['home', 'own', 'partner', 'sold', 'report', 'settings']);
const SHEET_ACT = { inst: 'open-inst-all', notes: 'open-notes', profile: 'open-profile', security: 'open-security', guide: 'open-guide', about: 'open-about', contact: 'open-contact' };

export function openMenu() {
  const st = getState();
  const p = getProfile();
  const unread = unreadCount(st.user.id, currentNotes());
  const wrap = document.createElement('div');
  wrap.className = 'drawer-wrap';
  wrap.innerHTML = `
    <div class="backdrop" data-drawer-close></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Menyu" tabindex="-1">
      <div class="drawer-head">
        <span class="avatar lg" data-avatar></span>
        <div class="grow"><b>${esc(`${p.first} ${p.last}`.trim() || p.email)}</b><small>${esc(pretty(p.phone) || p.email)}</small></div>
        <button type="button" class="icon-btn light" data-drawer-close aria-label="Yopish">${icon('x', 22)}</button>
      </div>
      <nav class="drawer-nav">
        ${GROUPS.map(
          (g) => `<p class="drawer-title">${g.title}</p>${g.items
            .map(([id, label, ic]) => `<button type="button" class="drawer-item ${TABS.has(id) && st.tab === id ? 'on' : ''}" data-act="menu-go" data-to="${id}">${icon(ic, 20)}<span>${label}</span>${id === 'notes' && unread ? `<i class="count">${unread}</i>` : ''}</button>`)
            .join('')}`,
        ).join('')}
        <p class="drawer-title"></p>
        <button type="button" class="drawer-item danger" data-act="menu-go" data-to="logout">${icon('logout', 20)}<span>Chiqish</span></button>
      </nav>
      <p class="drawer-foot">AccSavdo ${CONFIG.VERSION}</p>
    </aside>`;
  document.getElementById('overlays').appendChild(wrap);
  hydrateAvatars(wrap);
  requestAnimationFrame(() => {
    wrap.classList.add('open');
    wrap.querySelector('.drawer').focus({ preventScroll: true });
  });
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-drawer-close]')) closeTop();
  });
  openOverlay({
    close: () => {
      wrap.classList.remove('open');
      setTimeout(() => wrap.remove(), 250);
    },
  });
}

registerActions({
  'open-menu': () => openMenu(),
  'menu-go': (el) => {
    const to = el.dataset.to;
    closeTop();
    // menyu yopilib bo'lgach (orqaga tarixi to'g'rilangach) keyingi oyna ochiladi
    setTimeout(() => {
      if (TABS.has(to)) setTab(to);
      else trigger(to === 'logout' ? 'logout' : SHEET_ACT[to]);
    }, 280);
  },
});
