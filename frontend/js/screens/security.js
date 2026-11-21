// Xavfsizlik oynalari: PIN o'rnatish, barmoq izi, 2 bosqichli tasdiqlash, parolni almashtirish
import { esc, setBusy, showFormError } from '../core/dom.js';
import { CONFIG } from '../config.js';
import { getState } from '../core/store.js';
import { registerActions, registerForms } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet, confirmDialog } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { closeTop } from '../core/router.js';
import { pinPadHtml, mountPinPad } from '../ui/pinpad.js';
import { passwordFieldsHtml, mountPasswordFields } from '../ui/password-fields.js';
import * as lock from '../services/lock.service.js';
import * as auth from '../services/auth.service.js';
import { refreshSettings } from './settings.js';

const uid = () => getState().user.id;

// ---------- PIN ----------
export function openPinSetup() {
  const ctl = openSheet({
    title: lock.isEnabled(uid()) ? "PIN-kodni o'zgartirish" : "PIN-kod o'rnatish",
    size: 'md',
    html: `<p class="muted center-t" id="pin-step">${CONFIG.PIN_LENGTH} xonali yangi PIN-kod kiriting</p>${pinPadHtml()}`,
  });
  let first = null;
  const step = ctl.body.querySelector('#pin-step');
  mountPinPad(ctl.body, {
    onComplete: async (pin, api) => {
      if (!first) {
        if (/^(\d)\1+$/.test(pin) || pin === '1234' || pin === '4321' || pin === '0123') {
          api.reset();
          api.shake();
          return api.message("Juda oson PIN. Boshqasini tanlang", true);
        }
        first = pin;
        api.reset();
        api.message('');
        step.textContent = 'Tasdiqlash uchun PIN-kodni qayta kiriting';
        return;
      }
      if (pin !== first) {
        first = null;
        api.reset();
        api.shake();
        step.textContent = `${CONFIG.PIN_LENGTH} xonali yangi PIN-kod kiriting`;
        return api.message('PIN-kodlar mos kelmadi. Qaytadan urinib ko\'ring', true);
      }
      await lock.setPin(uid(), pin);
      closeTop();
      refreshSettings();
      toast('PIN-kod yoqildi ✅');
      if (!lock.bioEnabled(uid()) && (await lock.bioSupported())) {
        const yes = await confirmDialog({ title: 'Barmoq izi / yuz bilan ochilsinmi?', text: "Telefoningizning biometrikasi bilan ilovani tezroq ochishingiz mumkin. PIN baribir zaxira sifatida qoladi.", ok: 'Yoqish', cancel: 'Hozir emas' });
        if (yes) await toggleBio(true);
      }
    },
  });
}

export async function toggleBio(on) {
  try {
    if (on) {
      await lock.enableBio(uid(), getState().user.email);
      toast('Barmoq izi / yuz yoqildi ✅');
    } else {
      lock.disableBio(uid());
      toast("Barmoq izi o'chirildi");
    }
  } catch (e) {
    console.error(e);
    toast("Yoqib bo'lmadi: qurilmada biometrika sozlanmagan yoki bekor qilindi", { type: 'error' });
  }
  refreshSettings();
}

// ---------- Parolni almashtirish ----------
let verifyPw = () => ({ ok: false });
export function openChangePassword() {
  const ctl = openSheet({
    title: "Parolni almashtirish",
    size: 'md',
    html: `<form data-form="change-pw" novalidate>${passwordFieldsHtml()}<p class="form-error" role="alert" hidden></p><button class="btn block" type="submit" disabled>Parolni saqlash</button></form>`,
  });
  verifyPw = mountPasswordFields(ctl.body.querySelector('form'), () => getState().user.email);
}

registerForms({
  'change-pw': async (form, fd) => {
    const v = verifyPw();
    if (!v.ok) return showFormError(form, v.message);
    setBusy(form, true, 'Saqlanmoqda…');
    const { error } = await auth.setNewPassword(String(fd.get('password')));
    if (error) {
      setBusy(form, false);
      return showFormError(form, auth.humanizeAuthError(error));
    }
    closeTop();
    toast('Parol yangilandi ✅');
  },
  'mfa-enable': async (form, fd) => {
    const code = String(fd.get('code')).replace(/\D/g, '');
    if (code.length !== 6) return showFormError(form, '6 xonali kodni kiriting');
    setBusy(form, true, 'Tekshirilmoqda…');
    const { error } = await auth.mfaVerifyCode(form.dataset.factor, code);
    if (error) {
      setBusy(form, false);
      return showFormError(form, "Kod noto'g'ri. Authenticator ilovasidagi hozirgi kodni kiriting");
    }
    closeTop();
    refreshSettings();
    toast('2 bosqichli tasdiqlash yoqildi ✅');
  },
});

// ---------- 2 bosqichli tasdiqlash ----------
export async function openMfaSetup() {
  const { data, error } = await auth.mfaEnroll();
  if (error) return toast(auth.humanizeAuthError(error), { type: 'error' });
  openSheet({
    title: '2 bosqichli tasdiqlash',
    size: 'md',
    html: `
    <ol class="steps">
      <li>Telefoningizda <b>Google Authenticator</b> yoki <b>Authy</b> ilovasini oching.</li>
      <li>«+» ni bosib, quyidagi QR kodni skanerlang.</li>
      <li>Ilovada paydo bo'lgan 6 xonali kodni pastga kiriting.</li>
    </ol>
    <img class="qr" src="${esc(data.totp.qr_code)}" alt="QR kod">
    <details class="manual"><summary>QR ishlamasa: kalitni qo'lda kiriting</summary><code>${esc(data.totp.secret)}</code></details>
    <form data-form="mfa-enable" data-factor="${esc(data.id)}" novalidate>
      <input class="code-input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required data-input="digits" placeholder="••••••" aria-label="6 xonali kod">
      <p class="form-error" role="alert" hidden></p>
      <button class="btn block" type="submit">Yoqish</button>
    </form>`,
  });
}

registerActions({
  'sec-pin': () => openPinSetup(),
  'sec-pin-off': async () => {
    if (!(await confirmDialog({ title: "PIN-kod o'chirilsinmi?", text: 'Ilova qulfsiz ochiladi. Barmoq izi ham o\'chadi.', ok: "O'chirish", danger: true }))) return;
    lock.clearLock(uid());
    refreshSettings();
    toast("PIN-kod o'chirildi");
  },
  'sec-bio': async (el) => toggleBio(el.getAttribute('aria-checked') !== 'true'),
  'sec-password': () => openChangePassword(),
  'sec-mfa-on': () => openMfaSetup(),
  'sec-mfa-off': async (el) => {
    if (!(await confirmDialog({ title: "2FA o'chirilsinmi?", text: "Hisobingiz faqat parol bilan himoyalanadi. Tavsiya etilmaydi.", ok: "O'chirish", danger: true }))) return;
    const { error } = await auth.mfaUnenroll(el.dataset.id);
    if (error) return toast(auth.humanizeAuthError(error), { type: 'error' });
    refreshSettings();
    toast("2FA o'chirildi");
  },
});
