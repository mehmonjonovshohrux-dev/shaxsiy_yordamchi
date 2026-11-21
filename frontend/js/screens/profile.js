// Profil: rasm, ism, familiya, telefon
import { esc, setBusy, showFormError, $ } from '../core/dom.js';
import { getState } from '../core/store.js';
import { registerActions, registerForms, registerInputs } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet, confirmDialog } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { closeTop } from '../core/router.js';
import { formatInput, isValidPhone } from '../logic/phone.js';
import { getProfile, saveProfile, uploadAvatar, removeAvatar, hydrateAvatars } from '../services/profile.service.js';
import { renderTab, paintBell } from './shell.js';

let dirty = false;

export function openProfile({ intro = false } = {}) {
  const p = getProfile();
  dirty = false;
  const ctl = openSheet({
    title: 'Profil',
    size: 'full',
    html: `
    ${intro ? `<p class="tip info"><span class="tip-ic">${icon('info', 18)}</span><span class="tip-tx">Xush kelibsiz! Ismingiz va telefon raqamingizni kiriting. Bu ma'lumot faqat sizning hisobingizda saqlanadi.</span></p>` : ''}
    <div class="profile-head">
      <button type="button" class="avatar xl" data-avatar data-act="avatar-pick" aria-label="Rasmni almashtirish"></button>
      <div class="btn-row center">
        <label class="btn sm ghost file-btn">${icon('camera', 16)} Rasm tanlash<input type="file" id="avatar-input" accept="image/*" hidden data-change="avatar-file"></label>
        ${p.avatar ? `<button type="button" class="btn sm danger-ghost" data-act="avatar-remove">${icon('trash', 16)} Olib tashlash</button>` : ''}
      </div>
    </div>
    <form data-form="profile" novalidate>
      <div class="two">
        <label class="field"><span>Ism</span><input class="plain" name="first" maxlength="40" autocomplete="given-name" value="${esc(p.first)}" placeholder="Ismingiz"></label>
        <label class="field"><span>Familiya</span><input class="plain" name="last" maxlength="40" autocomplete="family-name" value="${esc(p.last)}" placeholder="Familiyangiz"></label>
      </div>
      <label class="field"><span>Telefon raqam</span>
        <input class="plain" name="phone" type="tel" inputmode="tel" autocomplete="tel" data-input="phone-fmt" value="${esc(formatInput(p.phone))}" placeholder="+998 90 123 45 67"></label>
      <p class="hint">Raqam shu ko'rinishda saqlanadi: +998 xx xxx xx xx</p>
      <label class="field"><span>Email (o'zgartirib bo'lmaydi)</span><input class="plain" value="${esc(p.email)}" disabled></label>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn block" type="submit">Saqlash</button>
    </form>`,
    guard: () => dirty,
    onBlocked: async () => {
      if (await confirmDialog({ title: 'Chiqilsinmi?', text: "Saqlanmagan o'zgarishlar yo'qoladi.", ok: 'Chiqish', cancel: 'Davom etish', danger: true })) {
        dirty = false;
        closeTop();
      }
    },
  });
  ctl.body.querySelector('form').addEventListener('input', () => (dirty = true));
  hydrateAvatars(ctl.body);
}

registerInputs({
  'phone-fmt': (el) => {
    el.value = formatInput(el.value);
  },
  'avatar-file': async (el) => {
    const f = el.files?.[0];
    el.value = '';
    if (!f) return;
    try {
      toast('Rasm yuklanmoqda…');
      await uploadAvatar(f);
      await hydrateAvatars(document);
      toast('Rasm yangilandi ✅');
      paintBell();
    } catch (e) {
      console.error(e);
      toast(e.message || "Rasmni yuklab bo'lmadi", { type: 'error' });
    }
  },
});

registerForms({
  profile: async (form, fd) => {
    const first = String(fd.get('first')).trim();
    const last = String(fd.get('last')).trim();
    const phone = String(fd.get('phone')).trim();
    if (!first) return showFormError(form, 'Ismingizni kiriting');
    if (phone && !isValidPhone(phone)) return showFormError(form, "Telefon raqam to'liq emas: +998 xx xxx xx xx");
    showFormError(form, '');
    setBusy(form, true, 'Saqlanmoqda…');
    try {
      await saveProfile({ first, last, phone });
      dirty = false;
      closeTop();
      hydrateAvatars(document);
      renderTab();
      paintBell();
      toast('Profil saqlandi ✅');
    } catch (e) {
      console.error(e);
      setBusy(form, false);
      showFormError(form, navigator.onLine ? "Saqlab bo'lmadi. Qayta urinib ko'ring." : "Internet yo'q");
    }
  },
});

registerActions({
  'open-profile': () => openProfile(),
  'avatar-pick': () => $('#avatar-input')?.click(),
  'avatar-remove': async () => {
    if (!(await confirmDialog({ title: 'Rasm olib tashlansinmi?', text: 'Profilda bosh harflaringiz ko\'rinadi.', ok: 'Olib tashlash', danger: true }))) return;
    try {
      await removeAvatar();
      await hydrateAvatars(document);
      toast('Rasm olib tashlandi');
      $('[data-act=avatar-remove]')?.remove();
    } catch {
      toast("Bajarib bo'lmadi", { type: 'error' });
    }
  },
});
export { getState };
