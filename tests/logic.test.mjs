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

// ---- muddatli to'lov ----
import * as inst from '../frontend/js/logic/installments.js';
test('muddatli: jadval teng bo\'linadi, oxirgi qism tugash sanasida', () => {
  const s = inst.schedule({ start: '2026-01-01', end: '2026-01-31', parts: 3, total: 1000 });
  assert.equal(s.length, 3);
  assert.equal(s.reduce((x, p) => x + p.amount, 0), 1000);
  assert.equal(s[2].due, '2026-01-31');
  assert.deepEqual(s.map((p) => p.due), ['2026-01-11', '2026-01-21', '2026-01-31']);
});
test('muddatli: to\'lovlar eng eski qismdan taqsimlanadi, muddati o\'tganlar aniqlanadi', () => {
  const acc = { id: 'a', status: 'sold', inst_on: true, sold_price: 900, sold_at: '2026-01-01', inst_start: '2026-01-01', inst_end: '2026-03-01', inst_parts: 3 };
  const pay = [{ account_id: 'a', amount: 450, paid_at: '2026-01-05' }];
  const st = inst.status(acc, pay, '2026-02-15');
  assert.equal(st.paid, 450);
  assert.equal(st.left, 450);
  assert.equal(st.parts[0].state, 'paid');
  assert.equal(st.parts[1].state, 'overdue');
  assert.equal(st.overdueSum, 150);
  assert.equal(st.next.n, 2);
  assert.equal(st.pct, 50);
});
test('muddatli: kalendar to\'ri 7 ga bo\'linadi', () => {
  const g = inst.monthGrid(2026, 10);
  assert.equal(g.length % 7, 0);
  assert.equal(g.filter((d) => d.inMonth).length, 30);
});

test('muddatli: haftalik rejim — har hafta summa qo\'shilib boradi', () => {
  const s = inst.schedule({ start: '2026-01-01', end: '2026-03-01', parts: 1, total: 1000, weekly: 300 });
  assert.deepEqual(s.map((p) => p.amount), [300, 300, 300, 100]);
  assert.deepEqual(s.map((p) => p.due), ['2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29']);
});
test('muddatli: haftalik, muddat qisqa bo\'lsa qoldiq tugash sanasiga qo\'shiladi', () => {
  const s = inst.schedule({ start: '2026-01-01', end: '2026-01-20', parts: 1, total: 1000, weekly: 300 });
  assert.equal(s.reduce((x, p) => x + p.amount, 0), 1000);
  assert.equal(s[s.length - 1].due, '2026-01-20');
});
test('muddatli: to\'planishi kerak bo\'lgan summa (accrued)', () => {
  const acc = { id: 'a', status: 'sold', inst_on: true, sold_price: 1000, sold_at: '2026-01-01', inst_start: '2026-01-01', inst_end: '2026-03-01', inst_parts: 1, inst_weekly: 300 };
  const st = inst.status(acc, [{ account_id: 'a', amount: 300, paid_at: '2026-01-09' }], '2026-01-16');
  assert.equal(st.accrued, 600);
  assert.equal(st.paid, 300);
  assert.equal(st.overdueSum, 300);
});

// ---- v2.6: qurilmalar, hisobot, zip ----
import { deviceName, mapUrl, newDevices, lastSeenUz } from '../frontend/js/logic/devices.js';
import { buildReport } from '../frontend/js/logic/report-data.js';
import { crc32, zip } from '../frontend/js/ui/zip.js';
import { buildDocx } from '../frontend/js/ui/docx.js';

test('qurilma nomi UA dan', () => {
  assert.equal(deviceName('Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'), 'Android · Chrome');
  assert.equal(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'), 'iPhone · Safari');
  assert.equal(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36 Edg/120'), 'Windows · Edge');
  assert.equal(deviceName(''), 'Qurilma');
});

test('yangi qurilma: boshqa, chiqarilmagan, 24 soat ichida', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  const list = [
    { device_id: 'me', first_seen: '2026-11-23T11:00:00Z' },
    { device_id: 'a', first_seen: '2026-11-23T08:00:00Z' },
    { device_id: 'b', first_seen: '2026-11-01T08:00:00Z' },
    { device_id: 'c', first_seen: '2026-11-23T09:00:00Z', revoked: true },
  ];
  assert.deepEqual(newDevices(list, 'me', now).map((d) => d.device_id), ['a']);
  assert.match(mapUrl(41.3, 69.28), /openstreetmap\.org\/\?mlat=41\.30000&mlon=69\.28000/);
  assert.equal(lastSeenUz('2026-11-23T11:30:00Z', now), '30 daqiqa oldin');
});

test('hisobot bloklari', () => {
  const accs = [
    { id: '1', title: 'A', game: 'PUBG', kind: 'own', status: 'sold', buy_price: 100, sold_price: 300, sold_at: '2026-11-05' },
    { id: '2', title: 'B', game: 'FF', kind: 'partner', partner_name: 'S', status: 'sold', buy_price: 100, sold_price: 300, sold_at: '2026-11-06', partner_paid: false },
    { id: '3', title: 'C', game: 'FF', kind: 'own', status: 'active', buy_price: 50, est_price: 80 },
  ];
  const r = buildReport({ accounts: accs, period: 'all', now: new Date('2026-11-23T10:00:00') });
  const titles = r.blocks.filter((b) => b.type === 'table').map((b) => b.title);
  assert.deepEqual(titles, ["Turlar bo'yicha", "O'yinlar bo'yicha foyda", 'Sotilgan akkauntlar', 'Hozir sotuvda', "Sherikka to'lanmagan ulushlar"]);
  assert.match(r.blocks[0].items[0][1], /^\+300/);
});

test('zip + docx: CRC va imzo to\'g\'ri', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const z = zip([{ name: 'a.txt', data: 'salom' }]);
  assert.equal(z[0], 0x50); assert.equal(z[1], 0x4b);
  const d = buildDocx(buildReport({ accounts: [], now: new Date('2026-11-23T10:00:00') }));
  assert.ok(d.length > 800);
});

import { cmpVer, isBlocked } from '../frontend/js/services/update-gate.js';
test('versiya taqqoslash va bloklash', () => {
  assert.equal(cmpVer('2.3.0', '2.10.0'), -1);
  assert.equal(cmpVer('2.7.0', '2.7.0'), 0);
  assert.equal(cmpVer('3.0.0', '2.9.9'), 1);
  assert.equal(isBlocked('2.6.0', '2.7.0'), true);
  assert.equal(isBlocked('2.7.0', '2.7.0'), false);
  assert.equal(isBlocked('2.7.0', null), false);
});
