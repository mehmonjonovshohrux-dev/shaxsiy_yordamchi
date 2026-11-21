// 2 bosqichli tasdiqlash: Authenticator ilovasidagi 6 xonali kod
import { setBusy, showFormError } from '../../core/dom.js';
import { registerForms, registerActions } from '../../core/actions.js';
import { mfaFactor, mfaVerifyCode, signOut } from '../../services/auth.service.js';
import { authLayout, registerStep, replaceStep, finish, flowData } from './flow.js';

registerStep('mfa', {
  view: () =>
    authLayout({
      title: 'Tasdiqlash kodi',
      subtitle: 'Authenticator ilovasidagi 6 xonali kodni kiriting.',
      body: `
      <form data-form="mfa" novalidate>
        <input class="code-input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required data-input="digits" placeholder="••••••" aria-label="Authenticator kodi">
        <p class="form-error" role="alert" hidden></p>
        <button class="btn block" type="submit">Tasdiqlash</button>
      </form>
      <button type="button" class="link-btn" data-act="mfa-logout">Boshqa hisob bilan kirish</button>`,
    }),
  mount: (root) => root.querySelector('.code-input')?.focus(),
});

registerForms({
  mfa: async (form, fd) => {
    const code = String(fd.get('code')).replace(/\D/g, '');
    if (code.length !== 6) return showFormError(form, '6 xonali kodni kiriting');
    showFormError(form, '');
    setBusy(form, true, 'Tekshirilmoqda…');
    const factor = await mfaFactor();
    if (!factor) return finish(); // 2FA yoqilmagan ekan
    const { error } = await mfaVerifyCode(factor.id, code);
    if (error) {
      setBusy(form, false);
      return showFormError(form, "Kod noto'g'ri yoki muddati tugagan");
    }
    if (flowData.after === 'newpass') {
      flowData.after = null;
      return replaceStep('newpass');
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
