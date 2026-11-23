// "Ma'lumotlar va xavfsizlik": PIN, barmoq izi, 2FA, parol, zaxira. Amallari security.js da.
import { esc, $ } from '../core/dom.js';
import { getState } from '../core/store.js';
import { registerActions, registerInputs } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import * as lock from '../services/lock.service.js';
import * as auth from '../services/auth.service.js';

const AFTER = [[0, 'Darhol'], [30000, '30 soniyadan keyin'], [300000, '5 daqiqadan keyin'], [900000, '15 daqiqadan keyin']];
let ctl = null;
let mfaState = { loaded: false, factor: null, enforced: null };

const row = ({ ic, title, sub = '', right = '', act = '' }) => `
  <div class="set-row ${act ? 'tap' : ''}" ${act ? `role="button" tabindex="0" data-act="${act}"` : ''}>
    <span class="set-ic">${icon(ic, 20)}</span>
    <span class="set-tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>
    <span class="set-right">${right}</span>
  </div>`;
const sw = (on, act) => `<button type="button" class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="${act}"><i></i></button>`;

function mfaRow() {
  if (!mfaState.loaded) return row({ ic: 'shieldcheck', title: '2 bosqichli tasdiqlash (2FA)', sub: 'Tekshirilmoqda…' });
  return mfaState.factor
    ? row({ ic: 'shieldcheck', title: '2 bosqichli tasdiqlash (2FA)', sub: 'Majburiy · yoqilgan ✅' })
    : row({ ic: 'shieldcheck', title: '2 bosqichli tasdiqlash (2FA)', sub: "Parol o'g'irlansa ham himoya qiladi. Tavsiya etiladi", right: '<button type="button" class="btn sm" data-act="sec-mfa-on">Yoqish</button>' });
}

function postureHtml(pinOn, bioOn) {
  const items = [
    [pinOn, 'PIN-kod'],
    [bioOn, 'Barmoq izi / yuz'],
    [mfaState.loaded && !!mfaState.factor, '2 bosqichli tasdiqlash (2FA)'],
    [mfaState.enforced === true, 'Serverda 2FA majburiy'],
  ];
  const n = items.filter((i) => i[0]).length;
  const label = n >= 3 ? 'Yaxshi himoyalangan' : n >= 2 ? "O'rtacha himoya" : 'Himoya kuchsiz';
  return `<div class="posture"><b>${label} (${n}/${items.length})</b>
    <div class="posture-bar">${items.map((i) => `<i class="${i[0] ? 'on' : ''}"></i>`).join('')}</div>
    <ul>${items.map(([ok, l]) => `<li class="${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'alert', 16)}<span>${l}</span></li>`).join('')}</ul></div>`;
}

function html() {
  const uid = getState().user.id;
  const pinOn = lock.isEnabled(uid);
  const bioOn = lock.bioEnabled(uid);
  const after = lock.lockAfter(uid);
  return `
  <div id="posture">${postureHtml(pinOn, bioOn)}</div>
  <h2 class="sec-title first">Ilovani qulflash</h2>
  <div class="card list">
    ${row({ ic: 'lock', title: 'PIN-kod', sub: pinOn ? 'Yoqilgan: ilova qulflanadi' : 'Ilovani PIN bilan himoyalang', right: pinOn ? '<button type="button" class="btn sm ghost" data-act="sec-pin">O\'zgartirish</button>' : '<button type="button" class="btn sm" data-act="sec-pin">Yoqish</button>' })}
    ${pinOn ? row({ ic: 'finger', title: 'Barmoq izi / yuz', sub: "PIN o'rniga tezkor ochish", right: sw(bioOn, 'sec-bio') }) : ''}
    ${pinOn ? row({ ic: 'shield', title: 'Qachon qulflansin', right: `<select data-change="lock-after" aria-label="Qulflash vaqti">${AFTER.map(([ms, l]) => `<option value="${ms}" ${after === ms ? 'selected' : ''}>${l}</option>`).join('')}</select>` }) : ''}
    ${pinOn ? row({ ic: 'x', title: "PIN-kodni o'chirish", act: 'sec-pin-off' }) : ''}
  </div>

  <h2 class="sec-title">Hisob himoyasi</h2>
  <div class="card list">
    <div id="mfa-row">${mfaRow()}</div>
    ${row({ ic: 'key', title: 'Parolni almashtirish', sub: 'Yangi kuchli parol', act: 'sec-password', right: icon('right', 18) })}
    ${row({ ic: 'logout', title: 'Boshqa qurilmalardan chiqish', sub: 'Telefon yo\'qolsa yoki begona qurilmada kirgan bo\'lsangiz', act: 'sec-signout-others', right: icon('right', 18) })}
  </div>

  <h2 class="sec-title">Ma'lumotlar</h2>
  <div class="card list">
    ${row({ ic: 'download', title: 'Excel (CSV) yuklab olish', sub: "Login va parollar fayilga kirmaydi", act: 'export-csv', right: icon('right', 18) })}
    ${row({ ic: 'database', title: 'Zaxira nusxa (JSON)', sub: 'Barcha akkauntlar, rasmlarsiz', act: 'export-json', right: icon('right', 18) })}
  </div>
  <p class="muted xs">PIN va barmoq izi shu qurilmani qulflaydi. Hisobni asosiy himoyalovchi narsa: kuchli parol, 2 bosqichli tasdiqlash va bazadagi qoidalar.</p>`;
}

async function loadMfa() {
  try {
    mfaState = { loaded: true, factor: await auth.mfaFactor(), enforced: await auth.mfaEnforced() };
  } catch {
    mfaState = { loaded: true, factor: null, enforced: false };
  }
  const host = $('#mfa-row');
  if (host) host.innerHTML = mfaRow();
  const ph = $('#posture');
  if (ph) {
    const uid = getState().user.id;
    ph.innerHTML = postureHtml(lock.isEnabled(uid), lock.bioEnabled(uid));
  }
}

export function openSecurityHub() {
  mfaState.loaded = false;
  ctl = openSheet({ title: "Ma'lumotlar va xavfsizlik", size: 'full', html: html(), onClose: () => (ctl = null) });
  loadMfa();
}

// security.js shuni chaqiradi: ochiq bo'lsa qayta chizadi
export function refreshSecurityHub() {
  if (!ctl || !ctl.body.isConnected) return;
  mfaState.loaded = false;
  ctl.body.innerHTML = html();
  loadMfa();
}

registerInputs({
  'lock-after': (el) => {
    lock.setLockAfter(getState().user.id, Number(el.value));
    toast('Saqlandi');
  },
});
registerActions({ 'open-security': () => openSecurityHub() });
