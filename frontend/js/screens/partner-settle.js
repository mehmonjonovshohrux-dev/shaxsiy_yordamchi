// Sherik bilan hisob-kitob: to'lanmagan ulushlar ro'yxati
import { esc } from '../core/dom.js';
import { getState, findAccount } from '../core/store.js';
import { som, dateUz } from '../core/format.js';
import { registerActions } from '../core/actions.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { unpaidPartner } from '../logic/finance.js';
import { setPartnerPaid } from '../services/accounts.service.js';
import { closeTop } from '../core/router.js';
import { renderTab } from './shell.js';

function html() {
  const up = unpaidPartner(getState().accounts);
  if (!up.n) return '<p class="muted center-t">Sherik oldidagi hamma qarz to\'langan ✅</p>';
  return `
  <div class="stat warn mb"><span class="l">Jami to'lanishi kerak</span><strong>${som(up.sum)}</strong></div>
  <div class="card list">
    ${up.items
      .map(
        ({ a, amount }) => `
      <div class="row-item">
        <div><b>${esc(a.title)}</b><span class="muted small">${esc(a.partner_name || 'Sherik')} · ${esc(dateUz(a.sold_at))}</span></div>
        <div class="settle-right"><b>${som(amount)}</b><button type="button" class="btn sm" data-act="settle-one" data-id="${esc(a.id)}">To'landi</button></div>
      </div>`,
      )
      .join('')}
  </div>`;
}

let ctl = null;

export function openSettle() {
  ctl = openSheet({ title: 'Sherik bilan hisob-kitob', html: html(), onClose: () => (ctl = null) });
}

registerActions({
  'settle-one': async (el) => {
    const a = findAccount(el.dataset.id);
    el.disabled = true;
    await setPartnerPaid(a.id, true);
    toast("Sherikka to'langan deb belgilandi");
    if (ctl) ctl.body.innerHTML = html();
    renderTab();
    if (!unpaidPartner(getState().accounts).n) closeTop();
  },
});
