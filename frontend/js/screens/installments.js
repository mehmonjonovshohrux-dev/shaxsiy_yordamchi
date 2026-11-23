// Muddatli to'lov (bo'lib to'lash): hisob / ro'yxat / kalendar, to'lov qo'shish, rejani o'zgartirish.
//  openInstallments(id) — bitta akkaunt;  openInstAll() — barcha muddatli akkauntlar.
import { esc, setBusy, showFormError, $ } from '../core/dom.js';
import { getState, findAccount } from '../core/store.js';
import { som, group, num, todayISO, dateUz, MONTHS } from '../core/format.js';
import { registerActions, registerForms, registerInputs } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet, confirmDialog } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { closeTop } from '../core/router.js';
import { isInst, status, monthGrid, totals, diffDays } from '../logic/installments.js';
import { addPayment, removePayment, savePlan, clearPlan } from '../services/payments.service.js';
import { renderTab } from './shell.js';
import { openAccount } from './account-detail.js';

const WD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const STATE_LABEL = { paid: "To'langan", partial: 'Qisman', overdue: "Muddati o'tgan", upcoming: 'Kutilmoqda' };
let ctl = null;
let V = { ids: null, view: 'list', y: 0, m: 0, sel: null };

const accs = () => (V.ids ? V.ids.map(findAccount).filter(Boolean) : getState().accounts.filter(isInst)).filter(isInst);
const stOf = (a) => status(a, getState().payments, todayISO());

// ---------- akkaunt tafsilotlarida ko'rinadigan kichik karta ----------
export function instCardHtml(a) {
  if (!getState().instReady || a.status !== 'sold') return '';
  if (!isInst(a)) return `<div class="card inst-card"><div class="card-title">${icon('calendar', 18)} Muddatli to'lov</div><p class="muted small">Xaridor bo'lib to'laydimi? «Sotuvni tahrirlash» orqali yoqing.</p></div>`;
  const s = stOf(a);
  return `<div class="card inst-card" data-act="inst-open" data-id="${esc(a.id)}" role="button" tabindex="0">
    <div class="card-title">${icon('calendar', 18)} Muddatli to'lov ${s.done ? '· yopilgan ✅' : ''}</div>
    ${bar(s.pct)}
    <div class="kv"><span>To'langan</span><b>${som(s.paid)} / ${som(s.total)}</b></div>
    <div class="kv"><span>Qoldi</span><b class="${s.overdueCount ? 'neg' : ''}">${som(s.left)}</b></div>
    ${s.next ? `<p class="muted small">Keyingi: ${esc(dateUz(s.next.due))} · ${som(s.next.left)}${s.overdueCount ? ' · <b class="neg">muddati o\'tgan</b>' : ''}</p>` : ''}
    <span class="btn sm block">To'lovlarni ochish</span></div>`;
}
const bar = (pct) => `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i data-w="${pct}"></i></div>`;

// ---------- asosiy oyna ----------
function summaryHtml() {
  const list = accs();
  if (V.ids && list.length === 1) {
    const a = list[0];
    const s = stOf(a);
    return `<div class="card inst-card">
      <div class="kv"><span>Xaridor</span><b>${esc(a.buyer) || '—'}</b></div>
      ${bar(s.pct)}
      <div class="kv"><span>Jami narx</span><b>${som(s.total)}</b></div>
      <div class="kv"><span>To'langan</span><b class="pos">${som(s.paid)}</b></div>
      <div class="kv total"><span>Qoldi</span><b class="${s.overdueCount ? 'neg' : ''}">${som(s.left)}</b></div>
      <div class="kv"><span>Muddat</span><b>${esc(dateUz(a.inst_start || a.sold_at))} → ${esc(dateUz(a.inst_end))}</b></div>
      ${s.overdueCount ? `<p class="tip bad"><span class="tip-tx">Muddati o'tgan: ${som(s.overdueSum)}</span></p>` : ''}
    </div>
    <div class="btn-grid">
      <button type="button" class="btn" data-act="inst-pay" data-id="${esc(a.id)}" ${s.done ? 'disabled' : ''}>${icon('plus', 18)} To'lov qo'shish</button>
      <button type="button" class="btn ghost" data-act="inst-plan" data-id="${esc(a.id)}">${icon('edit', 18)} Rejani o'zgartirish</button>
    </div>`;
  }
  const t = totals(getState().accounts, getState().payments, todayISO());
  return `<div class="card inst-card"><div class="kv total"><span>Jami olinishi kerak</span><b>${som(t.left)}</b></div>
    <div class="kv"><span>Muddati o'tgan</span><b class="${t.overdue ? 'neg' : ''}">${som(t.overdue)}</b></div>
    <div class="kv"><span>Muddatli akkauntlar</span><b>${t.count} ta</b></div></div>`;
}

function listHtml() {
  const list = accs();
  if (!list.length) return `<div class="empty"><div class="empty-ic">${icon('calendar', 34)}</div><h3>Muddatli to'lov yo'q</h3><p class="muted">Akkauntni sotayotganda «Muddatli to'lov» ni yoqing.</p></div>`;
  if (!(V.ids && list.length === 1)) {
    return `<div class="acc-list">${list
      .map((a) => {
        const s = stOf(a);
        return `<div class="acc-card tap" role="button" tabindex="0" data-act="inst-open" data-id="${esc(a.id)}">
          <div class="acc-body"><div class="acc-title">${esc(a.title)}</div>
          <div class="acc-sub">${esc(a.buyer || 'Xaridor ko\'rsatilmagan')} · to'langan ${s.pct}%</div>${bar(s.pct)}</div>
          <div class="acc-price"><b class="${s.overdueCount ? 'neg' : ''}">${som(s.left)}</b><small>${s.next ? esc(dateUz(s.next.due)) : 'yopilgan'}</small></div></div>`;
      })
      .join('')}</div>`;
  }
  const s = stOf(list[0]);
  return `<h2 class="sec-title">Qismlar</h2>
  <div class="card list">${s.parts
    .map((p) => `<div class="part ${p.state}"><span class="part-n">${p.n}</span><span class="grow"><b>${esc(dateUz(p.due))}</b><small>${STATE_LABEL[p.state]}${p.got && p.state !== 'paid' ? ` · ${som(p.got)} to'langan` : ''}</small></span><b>${som(p.amount)}</b></div>`)
    .join('')}</div>
  <h2 class="sec-title">To'lovlar tarixi</h2>
  <div class="card list">${s.payments.length ? s.payments.map((p) => `<div class="kv"><span>${esc(dateUz(p.paid_at))}${p.note ? ` · ${esc(p.note)}` : ''}</span><b>${som(p.amount)}</b><button type="button" class="icon-btn" data-act="inst-pay-del" data-pid="${esc(p.id)}" aria-label="O'chirish">${icon('trash', 16)}</button></div>`).join('') : '<p class="muted small pad">Hali to\'lov kiritilmagan.</p>'}</div>`;
}

function calHtml() {
  const list = accs();
  const today = todayISO();
  const ev = new Map();
  const add = (iso, e) => ev.set(iso, [...(ev.get(iso) || []), e]);
  for (const a of list) {
    const s = stOf(a);
    s.parts.forEach((p) => add(p.due, { t: 'due', a, p }));
    s.payments.forEach((pm) => add(String(pm.paid_at).slice(0, 10), { t: 'pay', a, pm }));
  }
  const cells = monthGrid(V.y, V.m)
    .map((c) => {
      const es = ev.get(c.iso) || [];
      const dots = es.slice(0, 3).map((e) => `<i class="dot ${e.t === 'pay' ? 'pay' : e.p.state}"></i>`).join('');
      return `<button type="button" class="cal-cell ${c.inMonth ? '' : 'out'} ${c.iso === today ? 'today' : ''} ${c.iso === V.sel ? 'sel' : ''}" data-act="inst-day" data-iso="${c.iso}"><span>${Number(c.iso.slice(8))}</span><span class="dots">${dots}</span></button>`;
    })
    .join('');
  const sel = V.sel ? ev.get(V.sel) || [] : [];
  const detail = V.sel
    ? `<h2 class="sec-title">${esc(dateUz(V.sel))}</h2><div class="card list">${
        sel.length
          ? sel
              .map((e) =>
                e.t === 'pay'
                  ? `<div class="kv"><span>${icon('check', 14)} To'lov${list.length > 1 ? ` · ${esc(e.a.title)}` : ''}${e.pm.note ? ` · ${esc(e.pm.note)}` : ''}</span><b class="pos">${som(e.pm.amount)}</b></div>`
                  : `<div class="part ${e.p.state}"><span class="part-n">${e.p.n}</span><span class="grow"><b>${list.length > 1 ? esc(e.a.title) : `${e.p.n}-qism`}</b><small>${STATE_LABEL[e.p.state]}</small></span><b>${som(e.p.left || e.p.amount)}</b>${e.p.state !== 'paid' ? `<button type="button" class="btn sm" data-act="inst-pay" data-id="${esc(e.a.id)}" data-amount="${e.p.left}" data-date="${V.sel <= today ? V.sel : today}">To'lov</button>` : ''}</div>`,
              )
              .join('')
          : '<p class="muted small pad">Bu kunda hech narsa yo\'q.</p>'
      }</div>`
    : '<p class="muted small center-t">Kunni bosing: shu kundagi to\'lovlar ko\'rinadi.</p>';
  return `<div class="cal-head"><button type="button" class="icon-btn" data-act="inst-month" data-d="-1" aria-label="Oldingi oy">${icon('left', 20)}</button><b>${MONTHS[V.m]} ${V.y}</b><button type="button" class="icon-btn" data-act="inst-month" data-d="1" aria-label="Keyingi oy">${icon('right', 20)}</button></div>
  <div class="cal-grid">${WD.map((d) => `<span class="cal-wd">${d}</span>`).join('')}${cells}</div>
  <div class="cal-legend"><span><i class="dot paid"></i>To'langan</span><span><i class="dot upcoming"></i>Kutilmoqda</span><span><i class="dot overdue"></i>Muddati o'tgan</span><span><i class="dot pay"></i>To'lov</span></div>
  ${detail}`;
}

function html() {
  return `${summaryHtml()}
  <div class="seg-tabs"><button type="button" class="${V.view === 'list' ? 'on' : ''}" data-act="inst-tab" data-v="list">${icon('list', 16)} Ro'yxat</button><button type="button" class="${V.view === 'cal' ? 'on' : ''}" data-act="inst-tab" data-v="cal">${icon('calendar', 16)} Kalendar</button></div>
  ${V.view === 'cal' ? calHtml() : listHtml()}`;
}

function paint() {
  if (ctl?.body.isConnected) {
    ctl.body.innerHTML = html();
    applyBars(ctl.body);
  }
  const card = $('#inst-card-host');
  if (card) {
    const a = findAccount(card.dataset.id);
    if (a) {
      card.innerHTML = instCardHtml(a);
      applyBars(card);
    }
  }
  renderTab();
}
// CSP inline style'ni taqiqlaydi: progress kengligi JS orqali beriladi
export function applyBars(root) {
  root.querySelectorAll('.progress > i[data-w]').forEach((i) => (i.style.width = `${i.dataset.w}%`));
}

function open(ids, title) {
  const now = new Date();
  V = { ids, view: 'list', y: now.getFullYear(), m: now.getMonth(), sel: null };
  ctl = openSheet({ title, size: 'full', html: html(), onClose: () => (ctl = null) });
  applyBars(ctl.body);
}
export const openInstallments = (id) => open([id], 'Muddatli to\'lov');
export const openInstAll = () => open(null, "Muddatli to'lovlar");

// ---------- to'lov qo'shish / reja ----------
function openPayForm(id, amount = 0, date = todayISO()) {
  const a = findAccount(id);
  const s = stOf(a);
  openSheet({
    title: "To'lov qo'shish",
    size: 'md',
    html: `<p class="muted small">Qoldi: <b>${som(s.left)}</b></p>
    <form data-form="inst-pay" data-id="${esc(id)}" novalidate>
      <label class="field"><span>Summa <i class="req">*</i></span><input class="plain big" name="amount" inputmode="numeric" data-input="sell-price" value="${amount ? group(amount) : ''}" placeholder="0" autocomplete="off"><em>so'm</em></label>
      <div class="two">
        <label class="field"><span>Sana</span><input class="plain" name="paid_at" type="date" value="${date}" max="${todayISO()}"></label>
        <label class="field"><span>Izoh (ixtiyoriy)</span><input class="plain" name="note" maxlength="200" placeholder="Naqd, karta…" autocomplete="off"></label>
      </div>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn block" type="submit">Saqlash</button>
    </form>`,
  });
}

function openPlanForm(id) {
  const a = findAccount(id);
  openSheet({
    title: "Rejani o'zgartirish",
    size: 'md',
    html: `<form data-form="inst-plan" data-id="${esc(id)}" novalidate>
      <div class="two">
        <label class="field"><span>Boshlanish</span><input class="plain" name="start" type="date" value="${String(a.inst_start || a.sold_at).slice(0, 10)}"></label>
        <label class="field"><span>Tugash sanasi</span><input class="plain" name="end" type="date" value="${String(a.inst_end).slice(0, 10)}"></label>
      </div>
      <label class="field"><span>Qismlar soni</span><input class="plain" name="parts" type="number" inputmode="numeric" min="1" max="60" value="${a.inst_parts}"></label>
      <p class="muted xs">To'langan summalar saqlanib qoladi: ular eng eski qismdan boshlab hisoblanadi.</p>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn block" type="submit">Saqlash</button>
      <button type="button" class="btn danger-ghost block mt" data-act="inst-off" data-id="${esc(id)}">Muddatli to'lovni o'chirish</button>
    </form>`,
  });
}

registerActions({
  'inst-open': (el) => openInstallments(el.dataset.id),
  'open-inst-all': () => openInstAll(),
  'inst-tab': (el) => {
    V.view = el.dataset.v;
    paint();
  },
  'inst-month': (el) => {
    const d = new Date(V.y, V.m + Number(el.dataset.d), 1);
    V.y = d.getFullYear();
    V.m = d.getMonth();
    paint();
  },
  'inst-day': (el) => {
    V.sel = V.sel === el.dataset.iso ? null : el.dataset.iso;
    paint();
  },
  'inst-pay': (el) => openPayForm(el.dataset.id, Number(el.dataset.amount) || 0, el.dataset.date || todayISO()),
  'inst-plan': (el) => openPlanForm(el.dataset.id),
  'inst-pay-del': async (el) => {
    if (!(await confirmDialog({ title: "To'lov o'chirilsinmi?", text: "Qoldiq qayta hisoblanadi.", ok: "O'chirish", danger: true }))) return;
    await removePayment(el.dataset.pid);
    paint();
    toast("To'lov o'chirildi");
  },
  'inst-off': async (el) => {
    if (!(await confirmDialog({ title: "Muddatli to'lov o'chirilsinmi?", text: "Reja o'chadi. Kiritilgan to'lovlar bazada saqlanib qoladi.", ok: "O'chirish", danger: true }))) return;
    await clearPlan(el.dataset.id);
    closeTop();
    setTimeout(() => {
      closeTop();
      renderTab();
    }, 280);
  },
});

registerForms({
  'inst-pay': async (form, fd) => {
    const id = form.dataset.id;
    const amount = num(fd.get('amount'));
    const date = String(fd.get('paid_at') || todayISO());
    const left = stOf(findAccount(id)).left;
    if (!amount) return showFormError(form, 'Summani kiriting');
    if (amount > left) return showFormError(form, `Qoldiqdan ko'p: eng ko'pi ${som(left)}`);
    setBusy(form, true, 'Saqlanmoqda…');
    try {
      await addPayment(id, { amount, date, note: String(fd.get('note') || '').trim() });
      closeTop();
      setTimeout(paint, 280);
      toast("To'lov yozildi ✅");
    } catch (e) {
      console.error(e);
      setBusy(form, false);
      showFormError(form, `Saqlab bo'lmadi: ${String(e?.message || '').slice(0, 120)}`);
    }
  },
  'inst-plan': async (form, fd) => {
    const id = form.dataset.id;
    const start = String(fd.get('start'));
    const end = String(fd.get('end'));
    const parts = Math.floor(Number(fd.get('parts')));
    if (!start || !end) return showFormError(form, 'Sanalarni kiriting');
    if (end < start) return showFormError(form, "Tugash sanasi boshlanishdan oldin bo'lmasin");
    if (!(parts >= 1 && parts <= 60)) return showFormError(form, 'Qismlar soni 1 dan 60 gacha');
    setBusy(form, true, 'Saqlanmoqda…');
    try {
      await savePlan(id, { start, end, parts });
      closeTop();
      setTimeout(paint, 280);
      toast(`Reja yangilandi: tugash ${dateUz(end)}`);
    } catch (e) {
      console.error(e);
      setBusy(form, false);
      showFormError(form, `Saqlab bo'lmadi: ${String(e?.message || '').slice(0, 120)}`);
    }
  },
});
export { diffDays };
