// Ilova ochilishi bilan: PIN / barmoq izi / 2FA yoqilmagan bo'lsa, ularni yoqishni so'raydi.
import { icon } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { getState } from '../core/store.js';
import { registerActions, trigger } from '../core/actions.js';
import { closeTop, overlayCount } from '../core/router.js';
import * as lock from '../services/lock.service.js';

let shown = false;

async function missing() {
  const uid = getState().user.id;
  const m = [];
  if (!lock.isEnabled(uid)) m.push({ id: 'pin', act: 'sec-pin', ic: 'lock', t: 'PIN-kod', d: 'Telefoningiz boshqa odamga tushsa ham ma\'lumotlar ochilmaydi' });
  else if (!lock.bioEnabled(uid) && (await lock.bioSupported())) m.push({ id: 'bio', act: 'sec-bio', ic: 'finger', t: 'Barmoq izi / yuz', d: 'PIN o\'rniga tezkor va qulay ochish' });
  return m;
}

const html = (items) => `
  <p class="muted">Ilovada akkaunt login/parollari saqlanadi. Himoyani yoqing: bu bir daqiqa oladi.</p>
  <div class="card list setup-list">
    ${items.map((i) => `<div class="set-row"><span class="set-ic">${icon(i.ic, 20)}</span><span class="set-tx"><b>${i.t}</b><small>${i.d}</small></span><span class="set-right"><button type="button" class="btn sm" data-act="onb-go" data-do="${i.act}">Yoqish</button></span></div>`).join('')}
  </div>
  <button type="button" class="btn ghost block mt" data-act="onb-later">Keyinroq</button>`;

export async function maybeAskSecurity() {
  if (shown) return;
  const items = await missing();
  if (!items.length) return;
  // boshqa oyna ochiq bo'lsa (masalan profil), yopilishini kutamiz
  if (overlayCount() > 0) return setTimeout(maybeAskSecurity, 1500);
  shown = true;
  openSheet({ title: 'Hisobingizni himoyalang 🔐', size: 'md', html: html(items) });
}

registerActions({
  'onb-later': () => closeTop(),
  'onb-go': (el) => {
    const act = el.dataset.do;
    closeTop();
    setTimeout(() => trigger(act, el), 280);
  },
});
