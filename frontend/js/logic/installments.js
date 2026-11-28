// Muddatli to'lov (bo'lib to'lash) hisob-kitobi: toza funksiyalar (testlanadi). Sanalar 'YYYY-MM-DD' ko'rinishida.
const DAY = 864e5;
const toUTC = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (t) => new Date(t).toISOString().slice(0, 10);
export const addDays = (s, n) => iso(toUTC(s) + n * DAY);
export const diffDays = (a, b) => Math.round((toUTC(a) - toUTC(b)) / DAY);

export const isInst = (a) => !!a && a.status === 'sold' && a.inst_on === true && !!a.inst_end;

// Qismlar jadvali.
//  - weekly > 0: HAFTALIK rejim. Har 7 kunda `weekly` so'm qo'shilib boradi (start+7, start+14 …), jami narxga yetguncha.
//    Tugash sanasigacha yetmasa, qoldiq tugash sanasidagi oxirgi qismga qo'shiladi.
//  - aks holda: `parts` ta teng qism, oxirgisi tugash sanasida.
export function schedule({ start, end, parts, total, weekly = 0 }) {
  const list = [];
  if (weekly > 0) {
    let sum = 0;
    for (let i = 1; i <= 520 && sum < total; i++) {
      const due = addDays(start, 7 * i);
      if (due > end) break;
      const amount = Math.min(weekly, total - sum);
      sum += amount;
      list.push({ n: i, due, amount });
    }
    if (sum < total) {
      const rest = total - sum;
      if (list.length && list[list.length - 1].due === end) list[list.length - 1].amount += rest;
      else list.push({ n: list.length + 1, due: end, amount: rest });
    }
    return list;
  }
  const n = Math.max(1, Math.min(120, Math.floor(parts) || 1));
  const span = Math.max(0, diffDays(end, start));
  const base = Math.floor(total / n);
  for (let i = 1; i <= n; i++) {
    const due = i === n ? end : addDays(start, Math.round((i * span) / n));
    list.push({ n: i, due, amount: i === n ? total - base * (n - 1) : base });
  }
  return list;
}

// Holat: to'lovlar eng eski qismdan boshlab taqsimlanadi.
export function status(acc, payments = [], today = new Date().toISOString().slice(0, 10)) {
  const total = Number(acc.sold_price) || 0;
  const mine = payments.filter((p) => p.account_id === acc.id).sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)));
  const paid = mine.reduce((s, p) => s + Number(p.amount), 0);
  const sched = schedule({ start: String(acc.inst_start || acc.sold_at).slice(0, 10), end: String(acc.inst_end).slice(0, 10), parts: acc.inst_parts || 1, total, weekly: Number(acc.inst_weekly) || 0 });
  let pool = paid;
  const parts = sched.map((p) => {
    const got = Math.min(pool, p.amount);
    pool -= got;
    let state = 'upcoming';
    if (got >= p.amount) state = 'paid';
    else if (p.due < today) state = 'overdue';
    else if (got > 0) state = 'partial';
    return { ...p, got, state, left: p.amount - got };
  });
  const left = Math.max(0, total - paid);
  const accrued = parts.filter((p) => p.due <= today).reduce((x, p) => x + p.amount, 0); // hozirgacha to'planishi kerak
  const next = parts.find((p) => p.state !== 'paid') || null;
  const overdue = parts.filter((p) => p.state === 'overdue');
  return {
    total, paid, left, done: left === 0, accrued, weekly: Number(acc.inst_weekly) || 0,
    pct: total ? Math.min(100, Math.round((paid / total) * 100)) : 100,
    parts, next,
    overdueCount: overdue.length,
    overdueSum: overdue.reduce((s, p) => s + p.left, 0),
    payments: mine,
  };
}

// Barcha muddatli akkauntlar bo'yicha jami qarz
export function totals(accounts, payments, today) {
  let left = 0, overdue = 0, count = 0;
  for (const a of accounts) {
    if (!isInst(a)) continue;
    const s = status(a, payments, today);
    if (s.done) continue;
    count++;
    left += s.left;
    overdue += s.overdueSum;
  }
  return { left, overdue, count };
}

// Kalendar: oy to'ri (dushanbadan boshlanadi). Har kun: {iso, inMonth}
export function monthGrid(year, month) {
  const first = Date.UTC(year, month, 1);
  const dow = (new Date(first).getUTCDay() + 6) % 7;
  const start = first - dow * DAY;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((dow + days) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => {
    const t = start + i * DAY;
    return { iso: iso(t), inMonth: new Date(t).getUTCMonth() === month };
  });
}

// Eslatma matnlari uchun: yaqin muddat (default 3 kun) va muddati o'tganlar
export function dueSoon(accounts, payments, today, withinDays = 3) {
  const out = [];
  for (const a of accounts) {
    if (!isInst(a)) continue;
    const s = status(a, payments, today);
    if (s.done) continue;
    if (s.overdueCount) out.push({ kind: 'overdue', acc: a, amount: s.overdueSum, due: s.parts.find((p) => p.state === 'overdue').due });
    const soon = s.parts.find((p) => p.state !== 'paid' && p.state !== 'overdue' && diffDays(p.due, today) <= withinDays);
    if (soon) out.push({ kind: 'soon', acc: a, amount: soon.left, due: soon.due });
  }
  return out;
}
