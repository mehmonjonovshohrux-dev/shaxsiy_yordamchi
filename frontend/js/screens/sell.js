// "Sotildi" oynasi: haqiqiy narx taxminiyning o'rniga yoziladi, foyda darhol ko'rinadi
import { esc, setBusy, showFormError } from '../core/dom.js';
import { findAccount, getState } from '../core/store.js';
import { num, group, todayISO, signedSom, som } from '../core/format.js';
import { registerForms, registerInputs } from '../core/actions.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { dropOverlays } from '../core/router.js';
import { calc } from '../logic/finance.js';
import { markSold, unsell } from '../services/accounts.service.js';
import { renderTab } from './shell.js';
import { schedule, addDays, status as instStatus } from '../logic/installments.js';
import { addPayment } from '../services/payments.service.js';
import { dateUz } from '../core/format.js';

export function openSellForm(id) {
  const a = findAccount(id);
  if (!a) return;
  const editing = a.status === 'sold';
  openSheet({
    title: editing ? `Sotuvni tahrirlash: ${a.title}` : `Sotildi: ${a.title}`,
    size: 'md',
    html: `
    <p class="muted small">${editing ? `Hozirgi sotilgan narx: <b>${som(a.sold_price)}</b>. O'zgartirsangiz, hisobotlar ham yangilanadi.` : `Taxminiy narx: <b>${som(a.est_price)}</b>. Haqiqiy narxni kiritsangiz, u taxminiy narxning o'rniga yoziladi.`}</p>
    <form data-form="sell" data-id="${esc(a.id)}" data-kind="${esc(a.kind)}" data-buy="${a.buy_price}" data-edit="${editing ? 1 : 0}" novalidate>
      <label class="field"><span>Haqiqiy sotilgan narx <i class="req">*</i></span>
        <input class="plain big" name="sold_price" inputmode="numeric" data-input="sell-price" required value="${(editing ? a.sold_price : a.est_price) ? group(editing ? a.sold_price : a.est_price, ' ') : ''}" placeholder="0" autocomplete="off"><em>so'm</em></label>
      <p class="preview" id="sell-preview" aria-live="polite"></p>
      <div class="two">
        <label class="field"><span>Sotilgan sana</span><input class="plain" name="sold_at" type="date" required value="${editing && a.sold_at ? String(a.sold_at).slice(0, 10) : todayISO()}" max="${todayISO()}"></label>
        <label class="field"><span>Xaridor (ixtiyoriy)</span><input class="plain" name="buyer" maxlength="80" value="${esc(a.buyer || '')}" placeholder="Ism yoki @username" autocomplete="off"></label>
      </div>
      ${instBlock(a, editing)}
      ${a.kind === 'partner' ? `<label class="check-row"><input type="checkbox" name="paid" ${a.partner_paid ? 'checked' : ''}><span>Sherik ulushi to'lab bo'lindi</span></label>` : ''}
      <p class="form-error" role="alert" hidden></p>
      <button class="btn block" type="submit">Saqlash</button>
    </form>`,
  });
  const form = document.querySelector('form[data-form=sell]');
  updatePreview(form);
  const sync = () => {
    const on = form.elements.inst?.checked;
    const wrap = form.querySelector('#inst-wrap');
    if (wrap) wrap.hidden = !on;
    updateInstPreview(form);
  };
  form.addEventListener('change', sync);
  form.addEventListener('input', () => updateInstPreview(form));
  sync();
}

function instBlock(a, editing) {
  if (!getState().instReady) {
    return `<p class="muted xs">Muddatli to'lov (bo'lib to'lash) yoqilmagan: Supabase'da <b>006_installments.sql</b> ni ishga tushiring.</p>`;
  }
  const on = editing && a.inst_on === true;
  const sold = a.sold_at ? String(a.sold_at).slice(0, 10) : todayISO();
  const start = on && a.inst_start ? String(a.inst_start).slice(0, 10) : sold;
  const end = on && a.inst_end ? String(a.inst_end).slice(0, 10) : addDays(sold, 30);
  return `
  <label class="check-row"><input type="checkbox" name="inst" ${on ? 'checked' : ''}><span>Muddatli to'lov (bo'lib to'lash)</span></label>
  <div id="inst-wrap" class="inst-wrap" ${on ? '' : 'hidden'}>
    <div class="two">
      <label class="field"><span>Boshlanish sanasi</span><input class="plain" name="inst_start" type="date" value="${start}"></label>
      <label class="field"><span>Tugash sanasi</span><input class="plain" name="inst_end" type="date" value="${end}"></label>
    </div>
    <div class="two">
      <label class="field"><span>Qismlar soni</span><input class="plain" name="inst_parts" type="number" inputmode="numeric" min="1" max="60" value="${on ? a.inst_parts : 3}"></label>
      ${editing ? '<div></div>' : `<label class="field"><span>Hozir olingan summa</span><input class="plain" name="inst_first" inputmode="numeric" data-input="sell-price" placeholder="0" autocomplete="off"><em>so'm</em></label>`}
    </div>
    <p class="preview" id="inst-preview" aria-live="polite"></p>
  </div>`;
}

function updateInstPreview(form) {
  const el = form.querySelector('#inst-preview');
  if (!el || !form.elements.inst?.checked) return;
  const total = num(form.elements.sold_price.value);
  const start = form.elements.inst_start.value;
  const end = form.elements.inst_end.value;
  const parts = Math.max(1, Math.min(60, Number(form.elements.inst_parts.value) || 1));
  if (!total || !start || !end || end < start) return void (el.textContent = end < start ? "Tugash sanasi boshlanishdan oldin bo'lmasin" : '');
  const first = num(form.elements.inst_first?.value || 0);
  const sc = schedule({ start, end, parts, total: Math.max(0, total) });
  el.innerHTML = `${parts} qism · har biri ≈ <b>${som(sc[0].amount)}</b> · birinchisi ${esc(dateUz(sc[0].due))}${first ? ` · olingan: <b>${som(first)}</b>, qoldi <b>${som(Math.max(0, total - first))}</b>` : ''}`;
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
    const f = el.closest('form');
    if (f?.elements.sold_price) updatePreview(f);
  },
});

registerForms({
  sell: async (form, fd) => {
    const price = num(fd.get('sold_price'));
    const date = String(fd.get('sold_at'));
    if (!price) return showFormError(form, 'Sotilgan narxni kiriting');
    if (!date) return showFormError(form, 'Sanani tanlang');
    let inst = getState().instReady ? false : null;
    let first = 0;
    if (form.elements.inst?.checked) {
      const start = String(fd.get('inst_start'));
      const end = String(fd.get('inst_end'));
      const parts = Math.floor(Number(fd.get('inst_parts')));
      first = num(fd.get('inst_first') || 0);
      if (!start || !end) return showFormError(form, "Muddatli to'lov sanalarini kiriting");
      if (end < start) return showFormError(form, "Tugash sanasi boshlanishdan oldin bo'lmasin");
      if (!(parts >= 1 && parts <= 60)) return showFormError(form, 'Qismlar soni 1 dan 60 gacha');
      if (first > price) return showFormError(form, "Olingan summa sotilgan narxdan ko'p bo'lmasin");
      inst = { start, end, parts };
    }
    showFormError(form, '');
    setBusy(form, true, 'Saqlanmoqda…');
    try {
      const id = form.dataset.id;
      const saved = await markSold(id, { price, date, buyer: String(fd.get('buyer') || '').trim(), partnerPaid: !!fd.get('paid'), inst });
      if (inst && first > 0) await addPayment(id, { amount: first, date, note: 'Boshlang\'ich to\'lov' });
      dropOverlays();
      renderTab();
      if (saved?._buyerSkipped) toast("Sotuv saqlandi, lekin xaridor yozilmadi: Supabase'da 001_accounts.sql ni qayta ishga tushiring", { type: 'error' });
      else if (form.dataset.edit === '1') toast('Sotuv ma\'lumoti saqlandi ✅');
      else
        toast('Sotuv yozildi ✅ Akkaunt «Sotilganlar»ga o\'tdi', {
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
      const why = String(e?.message || '').slice(0, 160);
      showFormError(form, navigator.onLine ? `Saqlab bo'lmadi${why ? `: ${why}` : ''}` : "Internet yo'q");
    }
  },
});
