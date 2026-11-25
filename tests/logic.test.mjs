// Hisob-kitob, maslahatchi va parol qoidalari testi:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { calc, summarize, unpaidPartner, monthlySeries, profitByGame, inPeriod, sortAccounts, accountsToCsv } from '../frontend/js/logic/finance.js';
import { advice } from '../frontend/js/logic/advisor.js';
import { checkPassword } from '../frontend/js/logic/password.js';
import { som, num, group, short } from '../frontend/js/core/format.js';

const now = new Date(2026, 10, 20); // 20-noyabr 2026
const A = (o) => ({ id: Math.random().toString(36).slice(2), title: 'T', game: 'PUBG', kind: 'own', buy_price: 0, est_price: 0, sold_price: null, status: 'active', images: ['x'], created_at: '2026-11-15T10:00:00Z', ...o });

test('shaxsiy akkaunt: foyda to\'liq o\'zimga', () => {
  const c = calc(A({ status: 'sold', buy_price: 100000, sold_price: 250000, sold_at: '2026-11-01' }));
  assert.deepEqual([c.base, c.my, c.partner], [150000, 150000, 0]);
});

test('50/50: foydaning yarmi menga, yarmi sherikka (toq son ham yo\'qolmaydi)', () => {
  const c = calc(A({ kind: 'partner', status: 'sold', buy_price: 100000, sold_price: 300001, sold_at: '2026-11-01' }));
  assert.equal(c.base, 200001);
  assert.equal(c.my + c.partner, c.base);
  assert.equal(c.my, 100000);
});

test('50/50 zarar ham teng bo\'linadi', () => {
  const c = calc(A({ kind: 'partner', status: 'sold', buy_price: 100000, sold_price: 60000, sold_at: '2026-11-01' }));
  assert.equal(c.my + c.partner, -40000);
});

test('sotilgan akkauntda taxminiy narx emas, haqiqiy narx ishlatiladi', () => {
  const c = calc(A({ status: 'sold', buy_price: 10, est_price: 999, sold_price: 50, sold_at: '2026-11-01' }));
  assert.equal(c.price, 50);
});

test('davrlar', () => {
  assert.ok(inPeriod('2026-11-02', 'month', now));
  assert.ok(!inPeriod('2026-10-30', 'month', now));
  assert.ok(inPeriod('2026-10-30', 'prev', now));
  assert.ok(inPeriod('2026-09-05', '3m', now));
  assert.ok(!inPeriod('2026-08-31', '3m', now));
  assert.ok(inPeriod('2026-01-05', 'year', now));
  assert.ok(!inPeriod('2025-12-31', 'year', now));
  assert.ok(inPeriod('2020-01-01', 'all', now));
});

test('hisobot yig\'indisi', () => {
  const acc = [
    A({ status: 'sold', buy_price: 50000, sold_price: 150000, sold_at: '2026-11-05' }),
    A({ kind: 'partner', status: 'sold', buy_price: 100000, sold_price: 300000, sold_at: '2026-11-06', partner_paid: false }),
    A({ buy_price: 100000, est_price: 200000 }),
    A({ status: 'sold', buy_price: 1, sold_price: 11, sold_at: '2026-09-01' }),
  ];
  const s = summarize(acc, 'month', now);
  assert.equal(s.own.profit, 100000);
  assert.equal(s.partner.profit, 100000);
  assert.equal(s.partner.partnerShare, 100000);
  assert.equal(s.total.profit, 200000);
  assert.equal(s.total.activeCount, 1);
  assert.equal(s.total.estProfit, 100000);
  assert.equal(unpaidPartner(acc).sum, 100000);
});

test('oylik qator va o\'yinlar kesimi', () => {
  const acc = [A({ status: 'sold', buy_price: 1, sold_price: 101, sold_at: '2026-11-05' }), A({ game: 'FF', status: 'sold', buy_price: 1, sold_price: 51, sold_at: '2026-10-05' })];
  const ser = monthlySeries(acc, 3, now);
  assert.deepEqual(ser.map((x) => x.profit), [0, 50, 100]);
  assert.equal(profitByGame(acc, 'all', now)[0].game, 'PUBG');
});

test('saralash', () => {
  const acc = [A({ title: 'a', est_price: 5, created_at: '2026-01-01T00:00:00Z' }), A({ title: 'b', est_price: 9, created_at: '2026-02-01T00:00:00Z' })];
  assert.equal(sortAccounts(acc, 'new')[0].title, 'b');
  assert.equal(sortAccounts(acc, 'old')[0].title, 'a');
  assert.equal(sortAccounts(acc, 'price')[0].title, 'b');
});

test('CSV: qo\'shtirnoq va BOM', () => {
  const csv = accountsToCsv([A({ title: 'Ali "pro"', est_price: 5 })]);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('"Ali ""pro"""'));
});

test('maslahatchi: eskirgan, zararli, sherik qarzi, rasmsiz', () => {
  const acc = [
    A({ title: 'Eski', buy_price: 100000, est_price: 200000, created_at: '2026-10-01T10:00:00Z' }),
    A({ title: 'Zarar', buy_price: 100000, est_price: 80000 }),
    A({ title: 'Rasmsiz', buy_price: 1, est_price: 100000, images: [] }),
    A({ kind: 'partner', status: 'sold', buy_price: 100000, sold_price: 300000, sold_at: '2026-11-05', partner_paid: false }),
  ];
  const tips = advice(acc, now);
  const text = tips.map((t) => t.text).join('\n');
  assert.match(text, /Eski» 50 kundan beri sotilmayapti/);
  assert.match(text, /180[\s ]000/); // 10% tushirilgan narx
  assert.match(text, /Zarar».*zarar/);
  assert.match(text, /to'lash qoldi/);
  assert.match(text, /Rasmsiz».*rasm/);
  assert.equal(tips[0].level, 'bad'); // eng muhimlari tepada
});

test('maslahatchi: bo\'sh ro\'yxat', () => {
  assert.equal(advice([], now).length, 1);
});

test('parol tekshiruvi', () => {
  assert.equal(checkPassword('abc').valid, false);
  assert.equal(checkPassword('password123!A').valid, false); // oddiy so'z
  assert.equal(checkPassword('Qwertyuiop1!').valid, false); // ketma-ketlik
  assert.equal(checkPassword('Tx9#mK2$vLp4').valid, true);
  assert.equal(checkPassword('Tx9#mK2$vLp4', 'tx9#mk2$vlp4@a.uz').valid, false); // parolda email bor
  assert.equal(checkPassword('Tx9#mK2$vLp4', 'ali@a.uz').valid, true);
  assert.equal(checkPassword('aliyev2026!Zz', 'aliyev@mail.uz').valid, false); // email ichida
  assert.equal(checkPassword('Aaaa1111!!!!x').valid, false); // takror
  assert.equal(checkPassword('onlylowercaseletters').valid, false); // 1 sinf
  assert.ok(checkPassword('Tx9#mK2$vLp4zQ').score >= 3);
  assert.equal(checkPassword('').score, 0);
});

test('format', () => {
  assert.equal(num('1 250 000 so\'m'), 1250000);
  assert.equal(group(1250000, ' '), '1 250 000');
  assert.equal(som(-5000).replace(/ /g, ' '), "−5 000 so'm");
  assert.equal(short(1500000), '1.5m');
  assert.equal(short(-25000), '−25k');
});

import { formatInput, toE164, isValidPhone, pretty } from '../frontend/js/logic/phone.js';
import { makeGreeting, GREETING_COUNT } from '../frontend/js/logic/greetings.js';
import { buildNotes } from '../frontend/js/logic/notifications.js';
import { readFileSync } from 'node:fs';

test('telefon: har xil kiritish +998 xx xxx xx xx ga keladi', () => {
  for (const v of ['95 225 56 78', '+998 95 225 56 78', '998952255678', '0952255678', '952255678']) {
    assert.equal(formatInput(v), '+998 95 225 56 78');
    assert.equal(toE164(v), '+998952255678');
  }
  assert.equal(isValidPhone('+998 95 225'), false);
  assert.equal(toE164('+998 95'), '');
  assert.equal(pretty('+998952255678'), '+998 95 225 56 78');
});

test('salomlashuv: 20+ variant, ism/familiya alohida, familiyasiz ham ishlaydi', () => {
  assert.ok(GREETING_COUNT >= 20);
  const seen = new Set();
  globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = v; } };
  for (let i = 0; i < 60; i++) {
    const g = makeGreeting({ first: 'Ali', last: 'Valiyev', now: new Date(2026, 10, 20, 9) });
    assert.ok(!/\{|\}/.test(g.title), g.title);
    seen.add(g.title);
  }
  assert.ok(seen.size >= 8);
  for (let i = 0; i < 40; i++) {
    const g = makeGreeting({ first: 'Ali', last: '', now: new Date(2026, 10, 20, 23) });
    assert.ok(!/\{|\}|undefined/.test(g.title), g.title);
    assert.ok(!g.title.includes('Valiyev'));
  }
  const a = makeGreeting({ first: 'Ali', last: 'V', now: new Date() }).title;
  const b = makeGreeting({ first: 'Ali', last: 'V', now: new Date() }).title;
  assert.notEqual(a, b); // ketma-ket bir xil chiqmaydi
});

test('bildirishnomalar: yangilanish, kunlik hisobot, kunlik yangi id', () => {
  const acc = [A({ title: 'Eski', buy_price: 1, est_price: 100, created_at: '2026-09-01T10:00:00Z' })];
  const n1 = buildNotes({ accounts: acc, now: new Date(2026, 10, 20), update: { version: '9' }, profileIncomplete: true });
  assert.ok(n1.some((n) => n.kind === 'update') && n1.some((n) => n.kind === 'daily') && n1.some((n) => n.kind === 'profile'));
  const n2 = buildNotes({ accounts: acc, now: new Date(2026, 10, 21) });
  assert.notEqual(n1.find((n) => n.kind === 'daily').id, n2.find((n) => n.kind === 'daily').id);
});

test('versiya: config.js va version.json bir xil', () => {
  const cfg = readFileSync(new URL('../frontend/js/config.js', import.meta.url), 'utf8').match(/VERSION: '([^']+)'/)[1];
  const j = JSON.parse(readFileSync(new URL('../frontend/version.json', import.meta.url), 'utf8')).version;
  assert.equal(cfg, j);
});
