// Kirish oynasi
import { CONFIG } from '../../config.js';
import { esc, setBusy, showFormError } from '../../core/dom.js';
import { registerForms, registerActions } from '../../core/actions.js';
import { icon } from '../../ui/icons.js';
import { signIn, humanizeAuthError } from '../../services/auth.service.js';
import { authLayout, registerStep, go, finish } from './flow.js';

const LAST_EMAIL = 'accsavdo.lastEmail';

registerStep('login', {
  view: () => {
    let last = '';
    try {
      last = localStorage.getItem(LAST_EMAIL) || '';
    } catch {}
    return authLayout({
      title: 'Xush kelibsiz 👋',
      subtitle: 'Hisobingizga kiring',
      body: `
      <form data-form="login" novalidate>
        <label class="field"><span>Email</span>
          <div class="input-wrap"><span class="lead">${icon('mail', 18)}</span>
            <input name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(last)}" placeholder="email@misol.uz">
          </div></label>
        <label class="field"><span>Parol</span>
          <div class="input-wrap"><span class="lead">${icon('lock', 18)}</span>
            <input name="password" type="password" autocomplete="current-password" required placeholder="Parolingiz">
            <button type="button" class="eye" data-act="toggle-pw" aria-label="Parolni ko'rsatish / yashirish">${icon('eye', 18)}</button>
          </div></label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn block" type="submit">Kirish</button>
      </form>
      <button type="button" class="link-btn" data-act="to-forgot">Parolni unutdingizmi?</button>
      ${CONFIG.ALLOW_SIGNUP ? `<p class="alt-line">Hisobingiz yo'qmi? <button type="button" class="link-btn inline" data-act="to-register">Ro'yxatdan o'tish</button></p>` : ''}`,
    });
  },
});

registerForms({
  login: async (form, fd) => {
    const email = String(fd.get('email')).trim().toLowerCase();
    const password = String(fd.get('password'));
    if (!email || !password) return showFormError(form, 'Email va parolni kiriting');
    showFormError(form, '');
    setBusy(form, true, 'Kirilmoqda…');
    const { error } = await signIn(email, password);
    if (error) {
      setBusy(form, false);
      return showFormError(form, humanizeAuthError(error));
    }
    try {
      localStorage.setItem(LAST_EMAIL, email);
    } catch {}
    finish();
  },
});

registerActions({
  'to-forgot': () => {
    const email = document.querySelector('form[data-form=login] [name=email]')?.value.trim() || '';
    go('forgot', { email });
  },
  'to-register': () => go('register'),
});
