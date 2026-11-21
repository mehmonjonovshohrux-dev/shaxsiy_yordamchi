// Sozlamalar sahifasi: bo'limlar ro'yxati. Har bir bo'lim o'z oynasida ochiladi.
import { esc } from '../core/dom.js';
import { CONFIG } from '../config.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { confirmDialog } from '../ui/sheet.js';
import * as auth from '../services/auth.service.js';
import * as lock from '../services/lock.service.js';
import { isStandalone } from '../services/install.service.js';
import { getProfile } from '../services/profile.service.js';
import { pretty } from '../logic/phone.js';
import { registerTab } from './shell.js';

const row = ({ ic, title, sub = '', act, right = icon('right', 18) }) => `
  <div class="set-row tap" role="button" tabindex="0" data-act="${act}">
    <span class="set-ic">${icon(ic, 20)}</span>
    <span class="set-tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>
    <span class="set-right">${right}</span>
  </div>`;

function view(st) {
  const p = getProfile(st.user);
  const pinOn = lock.isEnabled(st.user.id);
  const full = `${p.first} ${p.last}`.trim() || p.displayFirst;
  return `
  <div class="profile-card tap" role="button" tabindex="0" data-act="open-profile">
    <span class="avatar lg" data-avatar></span>
    <div class="grow"><b>${esc(full)}</b><small>${esc(pretty(p.phone) || p.email)}</small></div>
    ${icon('right', 18)}
  </div>
  ${p.complete ? '' : `<p class="tip info mt"><span class="tip-ic">${icon('info', 18)}</span><span class="tip-tx">Profilingiz to'liq emas: ism va telefon raqamingizni kiriting.</span><button type="button" class="tip-cta" data-act="open-profile">Kiritish</button></p>`}

  <h2 class="sec-title">Hisob</h2>
  <div class="card list">
    ${row({ ic: 'user', title: 'Profil', sub: 'Rasm, ism, familiya, telefon', act: 'open-profile' })}
    ${row({ ic: 'shieldcheck', title: "Ma'lumotlar va xavfsizlik", sub: pinOn ? 'PIN yoqilgan · 2FA, parol, zaxira' : 'PIN, barmoq izi, 2FA, parol, zaxira', act: 'open-security' })}
    ${row({ ic: 'bell', title: 'Bildirishnomalar', sub: 'Eslatmalar va yangilanishlar', act: 'open-notes' })}
  </div>

  <h2 class="sec-title">Ilova</h2>
  <div class="card list">
    ${isStandalone() ? '' : row({ ic: 'phone', title: "Ilovani o'rnatish", sub: 'Telefon yoki kompyuterga', act: 'install-app' })}
    ${row({ ic: 'book', title: "Yo'riqnoma", sub: 'Ilovadan foydalanish', act: 'open-guide' })}
    ${row({ ic: 'info', title: 'Ilova haqida', sub: `Versiya ${CONFIG.VERSION}`, act: 'open-about' })}
  </div>

  <h2 class="sec-title">Yordam</h2>
  <div class="card list">
    ${row({ ic: 'headset', title: "Admin bilan bog'lanish", sub: `Telegram: @${CONFIG.ADMIN_TG}`, act: 'open-contact' })}
  </div>

  <h2 class="sec-title">Chiqish</h2>
  <div class="card list">${row({ ic: 'logout', title: 'Hisobdan chiqish', sub: "PIN-kod o'chmaydi", act: 'logout', right: '' })}</div>
  <p class="muted xs center-t">AccSavdo ${CONFIG.VERSION}</p>`;
}

registerTab('settings', { title: 'Sozlamalar', view });

registerActions({
  logout: async () => {
    if (!(await confirmDialog({ title: 'Chiqish', text: "Hisobdan chiqasizmi? Qayta kirish uchun email va parol kerak bo'ladi.", ok: 'Chiqish' }))) return;
    await auth.signOut();
    location.reload();
  },
});
