// Ro'yxatdan o'tish (faqat CONFIG.ALLOW_SIGNUP = true bo'lsa ko'rinadi)
import { setBusy, showFormError } from '../../core/dom.js';
import { registerForms } from '../../core/actions.js';
import { icon } from '../../ui/icons.js';
import { passwordFieldsHtml, mountPasswordFields } from '../../ui/password-fields.js';
import { signUp, humanizeAuthError } from '../../services/auth.service.js';
import { authLayout, registerStep, go } from './flow.js';

let verify = () => ({ ok: false });
const emailOf = () => document.querySelector('form[data-form=register] [name=email]')?.value || '';

registerStep('register', {
  view: () =>
    authLayout({
      back: true,
      title: "Ro'yxatdan o'tish",
      subtitle: 'Email va kuchli parol tanlang. Emailingizga tasdiqlash kodi yuboriladi.',
      body: `
      <form data-form="register" novalidate>
        <label class="field"><span>Email</span>
          <div class="input-wrap"><span class="lead">${icon('mail', 18)}</span>
            <input name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" required placeholder="email@misol.uz">
          </div></label>
        ${passwordFieldsHtml({ label: 'Parol' })}
        <p class="form-error" role="alert" hidden></p>
        <button class="btn block" type="submit" disabled>Davom etish</button>
      </form>`,
    }),
  mount: (root) => {
    verify = mountPasswordFields(root.querySelector('form[data-form=register]'), emailOf);
  },
});

registerForms({
  register: async (form, fd) => {
    const email = String(fd.get('email')).trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return showFormError(form, "Email manzilini to'g'ri kiriting");
    const v = verify();
    if (!v.ok) return showFormError(form, v.message);
    showFormError(form, '');
    setBusy(form, true, 'Yuborilmoqda…');
    const { error } = await signUp(email, String(fd.get('password')));
    setBusy(form, false);
    if (error) return showFormError(form, humanizeAuthError(error));
    go('code', { email, purpose: 'signup', sentAt: Date.now() });
  },
});
