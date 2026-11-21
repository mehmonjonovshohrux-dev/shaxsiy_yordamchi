// Kod tasdiqlangandan keyin: YANGI PAROL o'rnatish (kuchli parol tekshiruvi bilan)
import { setBusy, showFormError } from '../../core/dom.js';
import { registerForms, registerActions } from '../../core/actions.js';
import { toast } from '../../ui/toast.js';
import { passwordFieldsHtml, mountPasswordFields } from '../../ui/password-fields.js';
import { setNewPassword, humanizeAuthError, signOut } from '../../services/auth.service.js';
import { authLayout, registerStep, replaceStep, finish, flowData } from './flow.js';

let verify = () => ({ ok: false });

registerStep('newpass', {
  view: () =>
    authLayout({
      title: 'Yangi parol',
      subtitle: "Kuchli parol o'ylab toping. Uni boshqa joyda ishlatmang.",
      body: `
      <form data-form="newpass" novalidate>
        ${passwordFieldsHtml()}
        <p class="form-error" role="alert" hidden></p>
        <button class="btn block" type="submit" disabled>Parolni saqlash</button>
      </form>
      <button type="button" class="link-btn" data-act="newpass-cancel">Bekor qilish</button>`,
    }),
  mount: (root) => {
    verify = mountPasswordFields(root.querySelector('form[data-form=newpass]'), () => flowData.email || '');
  },
});

registerForms({
  newpass: async (form, fd) => {
    const v = verify();
    if (!v.ok) return showFormError(form, v.message);
    showFormError(form, '');
    setBusy(form, true, 'Saqlanmoqda…');
    const { error } = await setNewPassword(String(fd.get('password')));
    if (error) {
      setBusy(form, false);
      if (/aal2/i.test(error.message || '') || error.code === 'insufficient_aal') {
        toast('Avval 2 bosqichli tasdiqlash kodini kiriting');
        return replaceStep('mfa', { after: 'newpass' });
      }
      return showFormError(form, humanizeAuthError(error));
    }
    toast('Parol yangilandi ✅');
    finish();
  },
});

registerActions({
  'newpass-cancel': async () => {
    await signOut();
    location.reload();
  },
});
