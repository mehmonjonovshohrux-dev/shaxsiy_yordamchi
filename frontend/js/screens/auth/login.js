// Kirish oynasi
import { esc, setBusy, showFormError } from '../../core/dom.js';
import { registerForms } from '../../core/actions.js';
import { icon } from '../../ui/icons.js';
import { signIn, humanizeAuthError } from '../../services/auth.service.js';
import { authLayout, registerStep, finish } from './flow.js';

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
      <p class="alt-line xs">Bu shaxsiy ilova: hisob egasi tomonidan oldindan yaratiladi.</p>`,
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

