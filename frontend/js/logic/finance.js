// Hisob-kitob qoidalari (DOM va tarmoqdan mustaqil, testlanadi).
import { parseDate, MONTHS_SHORT } from '../core/format.js';

// Foyda: shaxsiy -> hammasi menga; 50/50 -> foydaning yarmi menga, yarmi sherikka
export function calc(a) {
  const price = a.status === 'sold' ? a.sold_price || 0 : a.est_price || 0;
  const base = price - (a.buy_price || 0);
  const my = a.kind === 'partner' ? Math.floor(base / 2) : base;
  const partner = a.kind === 'partner' ? base - my : 0;
  return { price, base, my, partner };
}

export function inPeriod(dateStr, period, now = new Date()) {
  if (period === 'all') return true;
  if (!dateStr) return false;
  const d = parseDate(dateStr);
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'month':
      return d.getFullYear() === y && d.getMonth() === m;
    case 'prev': {
      const p = new Date(y, m - 1, 1);
      return d.getFullYear() === p.getFullYear() && d.getMonth() === p.getMonth();
    }
    case '3m':
      return d >= new Date(y, m - 2, 1) && d <= now;
    case 'year':
      return d.getFullYear() === y;
    default:
      return false;
  }
}

const blank = () => ({
  soldCount: 0, revenue: 0, cost: 0, profit: 0, partnerShare: 0,
  activeCount: 0, estRevenue: 0, estProfit: 0, tiedCapital: 0,
});

export function summarize(accounts, period, now = new Date()) {
  const out = { own: blank(), partner: blank() };
  for (const a of accounts) {
    const s = out[a.kind];
    if (!s) continue;
    const c = calc(a);
    if (a.status === 'sold') {
      if (!inPeriod(a.sold_at, period, now)) continue;
      s.soldCount++;
      s.revenue += a.sold_price || 0;
      s.cost += a.buy_price || 0;
      s.profit += c.my;
      s.partnerShare += c.partner;
    } else {
      s.activeCount++;
      s.estRevenue += a.est_price || 0;
      s.estProfit += c.my;
      s.tiedCapital += a.buy_price || 0;
    }
  }
  const total = {
    profit: out.own.profit + out.partner.profit,
    soldCount: out.own.soldCount + out.partner.soldCount,
    revenue: out.own.revenue + out.partner.revenue,
    estProfit: out.own.estProfit + out.partner.estProfit,
    activeCount: out.own.activeCount + out.partner.activeCount,
    tiedCapital: out.own.tiedCapital + out.partner.tiedCapital,
  };
  return { ...out, total };
}

// Sherikka hali to'lanmagan ulushlar
export function unpaidPartner(accounts) {
  const items = accounts
    .filter((a) => a.kind === 'partner' && a.status === 'sold' && !a.partner_paid)
    .map((a) => ({ a, amount: calc(a).partner }))
    .filter((x) => x.amount > 0);
  return { items, sum: items.reduce((s, x) => s + x.amount, 0), n: items.length };
}

// So'nggi n oy bo'yicha haqiqiy foyda (grafik uchun)
export function monthlySeries(accounts, n = 6, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS_SHORT[d.getMonth()], y: d.getFullYear(), m: d.getMonth(), profit: 0, count: 0 });
  }
  for (const a of accounts) {
    if (a.status !== 'sold' || !a.sold_at) continue;
    const d = parseDate(a.sold_at);
    const slot = out.find((s) => s.y === d.getFullYear() && s.m === d.getMonth());
    if (slot) {
      slot.profit += calc(a).my;
      slot.count++;
    }
  }
  return out;
}

export function profitByGame(accounts, period = 'all', now = new Date()) {
  const map = new Map();
  for (const a of accounts) {
    if (a.status !== 'sold' || !inPeriod(a.sold_at, period, now)) continue;
    const g = (a.game || 'Boshqa').trim() || 'Boshqa';
    const row = map.get(g) || { game: g, count: 0, profit: 0 };
    row.count++;
    row.profit += calc(a).my;
    map.set(g, row);
  }
  return [...map.values()].sort((x, y) => y.profit - x.profit);
}

export function sortAccounts(list, sort) {
  const arr = [...list];
  const by = {
    new: (a, b) => (b.created_at || '').localeCompare(a.created_at || ''),
    old: (a, b) => (a.created_at || '').localeCompare(b.created_at || ''),
    price: (a, b) => calc(b).price - calc(a).price,
    profit: (a, b) => calc(b).my - calc(a).my,
  };
  return arr.sort(by[sort] || by.new);
}

export function accountsToCsv(accounts) {
  const head = ['Nomi', "O'yin", 'Turi', 'Sherik', 'Holat', 'Sotib olingan', 'Taxminiy narx', 'Sotilgan narx', 'Foyda (menga)', 'Sherik ulushi', "Sherikka to'langan", 'Xaridor', "Qo'shilgan sana", 'Sotilgan sana'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = accounts.map((a) => {
    const c = calc(a);
    return [
      a.title, a.game, a.kind === 'partner' ? '50/50' : 'Shaxsiy', a.partner_name,
      a.status === 'sold' ? 'Sotilgan' : 'Sotuvda', a.buy_price, a.est_price, a.sold_price ?? '',
      c.my, c.partner, a.kind === 'partner' && a.status === 'sold' ? (a.partner_paid ? 'Ha' : "Yo'q") : '',
      a.buyer || '', String(a.created_at || '').slice(0, 10), a.sold_at || '',
    ].map(q).join(',');
  });
  return '﻿' + [head.map(q).join(','), ...rows].join('\r\n');
}
