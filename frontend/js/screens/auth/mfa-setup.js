// Majburiy 2 bosqichli tasdiqlash: 2FA yoqilmaguncha ilovaga kirib bo'lmaydi.
// 1) parolni qayta kiritish (sessiya o'g'irlangan bo'lsa ham egasi ekanini tasdiqlash)  2) QR skanerlash  3) kod.
import { esc, setBusy, showFormError } from '../../core/dom.js';
import { registerForms, registerActions } from '../../core/actions.js';
import { getSession, signIn, signOut, mfaEnroll, mfaVerifyCode, humanizeAuthError } from '../../services/auth.service.js';
import { authLayout, registerStep, replaceStep, finish, flowData } from './flow.js';

registerStep('mfa-setup', {
  view: () =>
    authLayout({
      title: 'Hisobni himoyalang',
      subtitle: "Ilovaga kirish uchun 2 bosqichli tasdiqlash majburiy: har safar o'zgarib turadigan bir martalik kod. Davom etish uchun parolingizni qayta kiriting.",
      body: `
      <form data-form="mfa-setup-pw" novalidate>
        <label class="field"><span>Parol</span>
          <input class="plain" name="password" type="password" autocomplete="current-password" required placeholder="Parolingiz"></label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn block" type="submit">Davom etish</button>
      </form>
      <button type="button" class="link-btn" data-act="mfa-logout">Chiqish</button>`,
    }),
  mount: (root) => root.querySelector('input[name=password]')?.focus(),
});

registerStep('mfa-setup-qr', {
  view: (d) =>
    authLayout({
      title: 'Authenticator ulang',
      subtitle: '',
      body: `
      <ol class="steps">
        <li>Telefoningizda <b>Google Authenticator</b> yoki <b>Authy</b> ilovasini oching.</li>
        <li>«+» ni bosib, QR kodni skanerlang.</li>
        <li>Ilovadagi 6 xonali kodni pastga kiriting.</li>
      </ol>
      <img class="qr" src="${esc(d.enroll.totp.qr_code)}" alt="QR kod">
      <details class="manual"><summary>QR ishlamasa: kalitni qo'lda kiriting</summary><code>${esc(d.enroll.totp.secret)}</code></details>
      <p class="muted xs">Kalitni qog'ozga yozib, xavfsiz joyda saqlang: telefon yo'qolsa shu kalit bilan tiklanadi.</p>
      <form data-form="mfa-setup-code" novalidate>
        <input class="code-input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required data-input="digits" placeholder="••••••" aria-label="6 xonali kod">
        <p class="form-error" role="alert" hidden></p>
        <button class="btn block" type="submit">Yoqish va kirish</button>
      </form>`,
    }),
  mount: (root) => root.querySelector('.code-input')?.focus(),
});

registerForms({
  'mfa-setup-pw': async (form, fd) => {
    const password = String(fd.get('password') || '');
    if (!password) return showFormError(form, 'Parolni kiriting');
    showFormError(form, '');
    setBusy(form, true, 'Tekshirilmoqda…');
    const session = await getSession();
    const { error } = await signIn(session?.user?.email || '', password);
    if (error) {
      setBusy(form, false);
      return showFormError(form, humanizeAuthError(error));
    }
    const { data, error: e2 } = await mfaEnroll();
    if (e2) {
      setBusy(form, false);
      return showFormError(form, humanizeAuthError(e2));
    }
    replaceStep('mfa-setup-qr', { enroll: data });
  },
  'mfa-setup-code': async (form, fd) => {
    const code = String(fd.get('code')).replace(/\D/g, '');
    if (code.length !== 6) return showFormError(form, '6 xonali kodni kiriting');
    showFormError(form, '');
    setBusy(form, true, 'Tekshirilmoqda…');
    const { error } = await mfaVerifyCode(flowData.enroll.id, code);
    if (error) {
      setBusy(form, false);
      return showFormError(form, "Kod noto'g'ri. Authenticator ilovasidagi hozirgi kodni kiriting");
    }
    finish();
  },
});

registerActions({
  'mfa-logout': async () => {
    await signOut();
    location.reload();
  },
});
