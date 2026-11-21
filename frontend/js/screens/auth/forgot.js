// "Parolni unutdingizmi": email so'raydi va emailga KOD yuboradi
import { esc, setBusy, showFormError } from '../../core/dom.js';
import { registerForms } from '../../core/actions.js';
import { icon } from '../../ui/icons.js';
import { sendResetCode, humanizeAuthError } from '../../services/auth.service.js';
import { authLayout, registerStep, go } from './flow.js';

registerStep('forgot', {
  view: (d) =>
    authLayout({
      back: true,
      title: 'Parolni tiklash',
      subtitle: "Emailingizni kiriting, biz 6 xonali tasdiqlash kodini yuboramiz.",
      body: `
      <form data-form="forgot" novalidate>
        <label class="field"><span>Email</span>
          <div class="input-wrap"><span class="lead">${icon('mail', 18)}</span>
            <input name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(d.email || '')}" placeholder="email@misol.uz">
          </div></label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn block" type="submit">Kod yuborish</button>
      </form>`,
    }),
});

registerForms({
  forgot: async (form, fd) => {
    const email = String(fd.get('email')).trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return showFormError(form, "Email manzilini to'g'ri kiriting");
    showFormError(form, '');
    setBusy(form, true, 'Yuborilmoqda…');
    const { error } = await sendResetCode(email);
    setBusy(form, false);
    // Email bor-yo'qligini oshkor qilmaymiz: faqat tarmoq/limit xatosini ko'rsatamiz
    if (error && (error.status === 429 || /rate|fetch|network/i.test(error.message || ''))) {
      return showFormError(form, humanizeAuthError(error));
    }
    go('code', { email, purpose: 'recovery', sentAt: Date.now() });
  },
});
