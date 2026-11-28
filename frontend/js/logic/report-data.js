// Hisobot ma'lumotlari: ekran, Word (.docx) va PDF uchun bitta manba. DOM'dan mustaqil, testlanadi.
import { summarize, profitByGame, unpaidPartner, calc, inPeriod } from './finance.js';
import { isInst, status as instStatus } from './installments.js';
import { som, signedSom, dateUz, MONTHS } from '../core/format.js';

export const PERIOD_LABELS = { month: 'Bu oy', prev: "O'tgan oy", '3m': "So'nggi 3 oy", year: 'Bu yil', all: 'Barcha vaqt' };

export function periodLabel(period, now = new Date()) {
  const base = PERIOD_LABELS[period] || PERIOD_LABELS.all;
  if (period === 'month') return `${base} (${MONTHS[now.getMonth()]} ${now.getFullYear()})`;
  if (period === 'prev') {
    const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${base} (${MONTHS[p.getMonth()]} ${p.getFullYear()})`;
  }
  if (period === 'year') return `${base} (${now.getFullYear()})`;
  return base;
}

const kind = (a) => (a.kind === 'partner' ? '50/50' : 'Shaxsiy');

// blocks: { type:'kpis', items:[[label,value,tone]] } | { type:'table', title, head, rows, align, note?, totalRow? }
export function buildReport({ accounts, payments = [], period = 'all', owner = '', now = new Date() }) {
  const today = now.toISOString().slice(0, 10);
  const s = summarize(accounts, period, now);
  const blocks = [];

  blocks.push({
    type: 'kpis',
    items: [
      ['Jami haqiqiy foyda', signedSom(s.total.profit), s.total.profit < 0 ? 'neg' : 'pos'],
      ['Sotilgan akkauntlar', `${s.total.soldCount} ta`],
      ['Sotuv summasi (aylanma)', som(s.total.revenue)],
      ['Kutilayotgan foyda (sotuvda)', signedSom(s.total.estProfit)],
    ],
  });

  blocks.push({
    type: 'table',
    title: "Turlar bo'yicha",
    head: ["Ko'rsatkich", 'Shaxsiy', '50/50', 'Jami'],
    align: ['l', 'r', 'r', 'r'],
    rows: [
      ['Sotilgan', `${s.own.soldCount} ta`, `${s.partner.soldCount} ta`, `${s.total.soldCount} ta`],
      ['Sotuv summasi', som(s.own.revenue), som(s.partner.revenue), som(s.total.revenue)],
      ['Sotib olingan narx', som(s.own.cost), som(s.partner.cost), som(s.own.cost + s.partner.cost)],
      ['Sherik ulushi', '—', som(s.partner.partnerShare), som(s.partner.partnerShare)],
      ['Haqiqiy foyda (sizga)', signedSom(s.own.profit), signedSom(s.partner.profit), signedSom(s.total.profit)],
    ],
    totalRow: true,
  });

  const games = profitByGame(accounts, period, now);
  if (games.length) {
    blocks.push({ type: 'table', title: "O'yinlar bo'yicha foyda", head: ["O'yin", 'Soni', 'Foyda (sizga)'], align: ['l', 'r', 'r'], rows: games.map((g) => [g.game, `${g.count} ta`, signedSom(g.profit)]) });
  }

  const sold = accounts
    .filter((a) => a.status === 'sold' && inPeriod(a.sold_at, period, now))
    .sort((a, b) => String(b.sold_at || '').localeCompare(String(a.sold_at || '')));
  if (sold.length) {
    blocks.push({
      type: 'table',
      title: 'Sotilgan akkauntlar',
      head: ['Nomi', 'Turi', 'Sotib olingan', 'Sotilgan', 'Foyda (sizga)', 'Sana'],
      align: ['l', 'l', 'r', 'r', 'r', 'l'],
      rows: sold.map((a) => [a.title, kind(a), som(a.buy_price || 0), som(a.sold_price || 0), signedSom(calc(a).my), dateUz(a.sold_at)]),
    });
  }

  const active = accounts.filter((a) => a.status !== 'sold');
  if (active.length) {
    blocks.push({
      type: 'table',
      title: 'Hozir sotuvda',
      head: ['Nomi', 'Turi', 'Sotib olingan', 'Taxminiy narx', 'Kutilayotgan foyda'],
      align: ['l', 'l', 'r', 'r', 'r'],
      rows: active.map((a) => [a.title, kind(a), som(a.buy_price || 0), som(a.est_price || 0), signedSom(calc(a).my)]),
    });
  }

  const inst = accounts.filter(isInst).map((a) => ({ a, st: instStatus(a, payments, today) })).filter((x) => !x.st.done);
  if (inst.length) {
    blocks.push({
      type: 'table',
      title: "Muddatli to'lovlar (qolgan qarzlar)",
      head: ['Akkaunt', 'Xaridor', 'Jami', "To'langan", 'Qoldi', 'Keyingi to\'lov'],
      align: ['l', 'l', 'r', 'r', 'r', 'l'],
      rows: inst.map(({ a, st }) => [a.title, a.buyer || '—', som(st.total), som(st.paid), som(st.left), st.next ? `${dateUz(st.next.due)} · ${som(st.next.left || st.next.amount)}` : '—']),
    });
  }

  const up = unpaidPartner(accounts);
  if (up.n) {
    blocks.push({
      type: 'table',
      title: "Sherikka to'lanmagan ulushlar",
      head: ['Akkaunt', 'Sherik', 'Ulush'],
      align: ['l', 'l', 'r'],
      rows: [...up.items.map((x) => [x.a.title, x.a.partner_name || '—', som(x.amount)]), ['Jami', '', som(up.sum)]],
      totalRow: true,
    });
  }

  return { title: 'AccSavdo hisoboti', owner, period: periodLabel(period, now), created: dateUz(today), blocks };
}
