// Sozlamalar: xavfsizlik, ilova, hisob
import { esc, $ } from '../core/dom.js';
import { getState } from '../core/store.js';
import { registerActions, registerInputs } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import * as lock from '../services/lock.service.js';
import * as auth from '../services/auth.service.js';
import { isStandalone } from '../services/install.service.js';
import { registerTab } from './shell.js';
import { confirmDialog } from '../ui/sheet.js';

const AFTER = [[0, 'Darhol'], [30000, '30 soniyadan keyin'], [300000, '5 daqiqadan keyin'], [900000, '15 daqiqadan keyin']];
const VERSION = 'v2.0';

const row = ({ ic, title, sub = '', right = '', act = '', extra = '' }) => `
  <div class="set-row ${act ? 'tap' : ''}" ${act ? `role="button" tabindex="0" data-act="${act}"` : ''} ${extra}>
    <span class="set-ic">${icon(ic, 20)}</span>
    <span class="set-tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>
    <span class="set-right">${right}</span>
  </div>`;

const sw = (on, act) => `<button type="button" class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="${act}"><i></i></button>`;

// 2FA holati asinxron aniqlanadi
let mfaState = { loaded: false, factor: null };

function view(st) {
  const uid = st.user.id;
  const pinOn = lock.isEnabled(uid);
  const bioOn = lock.bioEnabled(uid);
  const after = lock.lockAfter(uid);
  return `
  <div class="profile-card"><div class="avatar">${esc((st.user.email || '?')[0].toUpperCase())}</div><div><b>${esc(st.user.email)}</b><small>Kirilgan hisob</small></div></div>

  <h2 class="sec-title">Xavfsizlik</h2>
  <div class="card list">
    ${row({ ic: 'lock', title: 'PIN-kod', sub: pinOn ? "Yoqilgan: ilova qulflanadi" : "Ilovani PIN bilan himoyalang", right: pinOn ? '<button type="button" class="btn sm ghost" data-act="sec-pin">O\'zgartirish</button>' : '<button type="button" class="btn sm" data-act="sec-pin">Yoqish</button>' })}
    ${pinOn ? row({ ic: 'finger', title: 'Barmoq izi / yuz', sub: 'PIN o\'rniga tezkor ochish', right: `<span id="bio-slot">${sw(bioOn, 'sec-bio')}</span>` }) : ''}
    ${pinOn ? row({ ic: 'shield', title: 'Qachon qulflansin', right: `<select data-change="lock-after" aria-label="Qulflash vaqti">${AFTER.map(([ms, l]) => `<option value="${ms}" ${after === ms ? 'selected' : ''}>${l}</option>`).join('')}</select>` }) : ''}
    ${pinOn ? row({ ic: 'x', title: "PIN-kodni o'chirish", act: 'sec-pin-off' }) : ''}
    <div id="mfa-row">${mfaRow()}</div>
    ${row({ ic: 'key', title: 'Parolni almashtirish', sub: 'Yangi kuchli parol', act: 'sec-password', right: icon('right', 18) })}
  </div>

  <h2 class="sec-title">Ilova</h2>
  <div class="card list">
    ${isStandalone() ? row({ ic: 'check', title: "Ilova o'rnatilgan", sub: 'Bosh ekrandan ochilmoqda' }) : row({ ic: 'phone', title: "Ilovani o'rnatish", sub: 'Telefon yoki kompyuterga', act: 'install-app', right: icon('right', 18) })}
    ${row({ ic: 'refresh', title: 'Yangi versiyani tekshirish', act: 'check-update', right: icon('right', 18) })}
  </div>

  <h2 class="sec-title">Hisob</h2>
  <div class="card list">${row({ ic: 'logout', title: 'Chiqish', sub: 'Hisobdan chiqadi (PIN o\'chmaydi)', act: 'logout' })}</div>
  <p class="muted xs center-t">AccSavdo ${VERSION}</p>`;
}

function mfaRow() {
  if (!mfaState.loaded) return row({ ic: 'shieldcheck', title: '2 bosqichli tasdiqlash (2FA)', sub: 'Tekshirilmoqda…' });
  return mfaState.factor
    ? row({ ic: 'shieldcheck', title: '2 bosqichli tasdiqlash (2FA)', sub: 'Yoqilgan ✅', right: `<button type="button" class="btn sm danger-ghost" data-act="sec-mfa-off" data-id="${esc(mfaState.factor.id)}">O'chirish</button>` })
    : row({ ic: 'shieldcheck', title: '2 bosqichli tasdiqlash (2FA)', sub: 'Parol o\'g\'irlansa ham himoya qiladi. Tavsiya etiladi', right: '<button type="button" class="btn sm" data-act="sec-mfa-on">Yoqish</button>' });
}

async function loadMfa() {
  try {
    mfaState = { loaded: true, factor: await auth.mfaFactor() };
  } catch {
    mfaState = { loaded: true, factor: null };
  }
  const host = $('#mfa-row');
  if (host) host.innerHTML = mfaRow();
}

export async function refreshSettings() {
  const { renderTab } = await import('./shell.js');
  mfaState.loaded = false;
  renderTab();
}

registerTab('settings', {
  title: 'Sozlamalar',
  view,
  mount: () => loadMfa(),
});

registerInputs({
  'lock-after': (el) => {
    lock.setLockAfter(getState().user.id, Number(el.value));
    toast('Saqlandi');
  },
});

registerActions({
  logout: async () => {
    if (!(await confirmDialog({ title: 'Chiqish', text: 'Hisobdan chiqasizmi? Qayta kirish uchun email va parol kerak bo\'ladi.', ok: 'Chiqish' }))) return;
    await auth.signOut();
    location.reload();
  },
  'check-update': async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.update();
    toast('Eng so\'nggi versiya yuklanmoqda…');
    setTimeout(() => location.reload(), 700);
  },
});
