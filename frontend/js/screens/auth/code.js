// Emailga kelgan kodni kiritish (parolni tiklash va ro'yxatdan o'tish uchun)
import { CONFIG } from '../../config.js';
import { esc, setBusy, showFormError } from '../../core/dom.js';
import { registerForms, registerActions } from '../../core/actions.js';
import { toast } from '../../ui/toast.js';
import {
  verifyRecoveryCode, verifySignupCode, sendResetCode, resendSignupCode, humanizeAuthError,
} from '../../services/auth.service.js';
import { authLayout, registerStep, replaceStep, finish, flowData } from './flow.js';

let timer = null;

registerStep('code', {
  view: (d) =>
    authLayout({
      back: true,
      title: 'Kodni kiriting',
      subtitle: `<b>${esc(d.email)}</b> manziliga tasdiqlash kodi yuborildi (agar bu email ro'yxatdan o'tgan bo'lsa). Xat kelmasa, «Spam» papkasini ham tekshiring.`,
      body: `
      <form data-form="code" novalidate>
        <input class="code-input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required data-input="digits" placeholder="••••••" aria-label="Tasdiqlash kodi">
        <p class="form-error" role="alert" hidden></p>
        <button class="btn block" type="submit">Tasdiqlash</button>
      </form>
      <button type="button" class="link-btn" data-act="resend-code" id="resend-btn" disabled>Kodni qayta yuborish</button>`,
    }),
  mount: (root, d) => {
    root.querySelector('.code-input')?.focus();
    startCooldown(root.querySelector('#resend-btn'), d.sentAt);
  },
});

function startCooldown(btn, sentAt = Date.now()) {
  clearInterval(timer);
  if (!btn) return;
  const tick = () => {
    const left = CONFIG.RESEND_SECONDS - Math.floor((Date.now() - sentAt) / 1000);
    if (!btn.isConnected || left <= 0) {
      clearInterval(timer);
      if (btn.isConnected) {
        btn.disabled = false;
        btn.textContent = 'Kodni qayta yuborish';
      }
      return;
    }
    btn.disabled = true;
    btn.textContent = `Qayta yuborish (${left} s)`;
  };
  tick();
  timer = setInterval(tick, 1000);
}

registerForms({
  code: async (form, fd) => {
    const code = String(fd.get('code')).replace(/\D/g, '');
    if (code.length < 6) return showFormError(form, 'Kamida 6 xonali kodni kiriting');
    const d = flowData;
    showFormError(form, '');
    setBusy(form, true, 'Tekshirilmoqda…');
    const fn = d.purpose === 'signup' ? verifySignupCode : verifyRecoveryCode;
    const { error } = await fn(d.email, code);
    if (error) {
      setBusy(form, false);
      return showFormError(form, humanizeAuthError(error));
    }
    clearInterval(timer);
    if (d.purpose === 'signup') {
      toast("Email tasdiqlandi ✅");
      return finish();
    }
    replaceStep('newpass'); // endi yangi parol o'rnatiladi
  },
});

registerActions({
  'resend-code': async (btn) => {
    const d = flowData;
    btn.disabled = true;
    const { error } = d.purpose === 'signup' ? await resendSignupCode(d.email) : await sendResetCode(d.email);
    if (error) {
      toast(humanizeAuthError(error), { type: 'error' });
      btn.disabled = false;
      return;
    }
    d.sentAt = Date.now();
    toast('Yangi kod yuborildi');
    startCooldown(btn, d.sentAt);
  },
});
