// Avatar bosilganda ochiladigan menyu: profil, sozlamalar, chiqish (har bir bo'limda ishlaydi)
import { esc } from '../core/dom.js';
import { getState } from '../core/store.js';
import { registerActions, trigger } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openOverlay, closeTop } from '../core/router.js';
import { getProfile, hydrateAvatars } from '../services/profile.service.js';
import { pretty } from '../logic/phone.js';
import { setTab } from './shell.js';

const ITEMS = [
  ['profile', 'Profilni ochish', 'user'],
  ['security', "Ma'lumotlar va xavfsizlik", 'shieldcheck'],
  ['notifsettings', 'Bildirishnoma sozlamalari', 'bell'],
  ['settings', 'Sozlamalar', 'sliders'],
  ['guide', "Yo'riqnoma", 'book'],
  ['contact', "Admin bilan bog'lanish", 'headset'],
];
const ACT = { profile: 'open-profile', security: 'open-security', notifsettings: 'open-notif-settings', guide: 'open-guide', contact: 'open-contact', logout: 'logout' };

export function openAccountMenu() {
  getState();
  const p = getProfile();
  const wrap = document.createElement('div');
  wrap.className = 'pop-wrap';
  wrap.innerHTML = `
    <div class="backdrop" data-pop-close></div>
    <div class="pop" role="menu" tabindex="-1">
      <div class="pop-head"><span class="avatar lg" data-avatar></span>
        <div class="grow"><b>${esc(`${p.first} ${p.last}`.trim() || p.email)}</b><small>${esc(pretty(p.phone) || p.email)}</small></div></div>
      ${ITEMS.map(([id, l, ic]) => `<button type="button" role="menuitem" class="pop-item" data-act="pop-go" data-to="${id}">${icon(ic, 19)}<span>${l}</span></button>`).join('')}
      <hr>
      <button type="button" role="menuitem" class="pop-item danger" data-act="pop-go" data-to="logout">${icon('logout', 19)}<span>Hisobdan chiqish</span></button>
    </div>`;
  document.getElementById('overlays').appendChild(wrap);
  hydrateAvatars(wrap);
  requestAnimationFrame(() => {
    wrap.classList.add('open');
    wrap.querySelector('.pop').focus({ preventScroll: true });
  });
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-pop-close]')) closeTop();
  });
  openOverlay({
    close: () => {
      wrap.classList.remove('open');
      setTimeout(() => wrap.remove(), 180);
    },
  });
}

registerActions({
  'open-account-menu': () => openAccountMenu(),
  'pop-go': (el) => {
    const to = el.dataset.to;
    closeTop();
    setTimeout(() => (to === 'settings' ? setTab('settings') : trigger(ACT[to])), 260);
  },
});
