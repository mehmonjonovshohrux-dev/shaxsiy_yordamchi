// "Sotildi" oynasi: haqiqiy narx taxminiyning o'rniga yoziladi, foyda darhol ko'rinadi
import { esc, setBusy, showFormError } from '../core/dom.js';
import { findAccount } from '../core/store.js';
import { num, group, todayISO, signedSom, som } from '../core/format.js';
import { registerForms, registerInputs } from '../core/actions.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { dropOverlays } from '../core/router.js';
import { calc } from '../logic/finance.js';
import { markSold, unsell } from '../services/accounts.service.js';
import { renderTab } from './shell.js';

export function openSellForm(id) {
  const a = findAccount(id);
  if (!a) return;
  openSheet({
    title: `Sotildi: ${a.title}`,
    size: 'md',
    html: `
    <p class="muted small">Taxminiy narx: <b>${som(a.est_price)}</b>. Haqiqiy narxni kiritsangiz, u taxminiy narxning o'rniga yoziladi.</p>
    <form data-form="sell" data-id="${esc(a.id)}" data-kind="${esc(a.kind)}" data-buy="${a.buy_price}" novalidate>
      <label class="field"><span>Haqiqiy sotilgan narx <i class="req">*</i></span>
        <input class="plain big" name="sold_price" inputmode="numeric" data-input="sell-price" required value="${a.est_price ? group(a.est_price, ' ') : ''}" placeholder="0" autocomplete="off"><em>so'm</em></label>
      <p class="preview" id="sell-preview" aria-live="polite"></p>
      <div class="two">
        <label class="field"><span>Sotilgan sana</span><input class="plain" name="sold_at" type="date" required value="${todayISO()}" max="${todayISO()}"></label>
        <label class="field"><span>Xaridor (ixtiyoriy)</span><input class="plain" name="buyer" maxlength="80" placeholder="Ism yoki @username" autocomplete="off"></label>
      </div>
      ${a.kind === 'partner' ? `<label class="check-row"><input type="checkbox" name="paid"><span>Sherik ulushi to'lab bo'lindi</span></label>` : ''}
      <p class="form-error" role="alert" hidden></p>
      <button class="btn block" type="submit">Saqlash</button>
    </form>`,
  });
  updatePreview(document.querySelector('form[data-form=sell]'));
}

function updatePreview(form) {
  if (!form) return;
  const price = num(form.elements.sold_price.value);
  const c = calc({ kind: form.dataset.kind, status: 'sold', buy_price: Number(form.dataset.buy), sold_price: price });
  const el = document.getElementById('sell-preview');
  if (!price) return void (el.textContent = '');
  el.innerHTML = `Foydangiz${form.dataset.kind === 'partner' ? ' (50%)' : ''}: <b class="${c.my < 0 ? 'neg' : 'pos'}">${signedSom(c.my)}</b>${form.dataset.kind === 'partner' ? ` · sherikka: <b>${som(c.partner)}</b>` : ''}`;
}

registerInputs({
  'sell-price': (el) => {
    const d = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
    el.value = d ? group(Number(d), ' ') : '';
    updatePreview(el.closest('form'));
  },
});

registerForms({
  sell: async (form, fd) => {
    const price = num(fd.get('sold_price'));
    const date = String(fd.get('sold_at'));
    if (!price) return showFormError(form, 'Sotilgan narxni kiriting');
    if (!date) return showFormError(form, 'Sanani tanlang');
    showFormError(form, '');
    setBusy(form, true, 'Saqlanmoqda…');
    try {
      const id = form.dataset.id;
      await markSold(id, { price, date, buyer: String(fd.get('buyer') || '').trim(), partnerPaid: !!fd.get('paid') });
      dropOverlays();
      renderTab();
      toast('Sotuv yozildi ✅', {
        action: {
          label: 'Qaytarish',
          fn: async () => {
            await unsell(id);
            renderTab();
          },
        },
      });
    } catch (e) {
      console.error(e);
      setBusy(form, false);
      showFormError(form, navigator.onLine ? "Saqlab bo'lmadi. Qayta urinib ko'ring." : "Internet yo'q");
    }
  },
});
