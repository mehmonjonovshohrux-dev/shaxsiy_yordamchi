// Bildirishnomalar: ma'lumotlardan hosil qilinadi (serverga bog'liq emas).
// Har kuni yangi "kunlik hisobot" chiqadi; maslahatlar ham har kuni yangidan ko'rinadi.
import { advice } from './advisor.js';
import { summarize } from './finance.js';
import { signedSom, som, todayISO, dateUz } from '../core/format.js';
import { dueSoon } from './installments.js';
import { newDevices } from './devices.js';

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

export function buildNotes({ accounts, payments = [], mfaEnforced = null, now = new Date(), update = null, profileIncomplete = false, devices = [], deviceId = '' }) {
  const day = todayISO(now);
  const out = [];
  if (update) out.push({ id: `update:${update.version}`, level: 'info', kind: 'update', title: 'Yangi versiya tayyor', text: `AccSavdo ${update.version} chiqdi. Yangilash tugmasini bosing.` });
  if (mfaEnforced === false) out.push({ id: 'mfa-server', level: 'bad', kind: 'security', title: 'Serverda 2FA majburiy emas', text: "Parol o'g'irlansa, ma'lumotlarga kod so'ralmasdan kirish mumkin. Supabase'da 000_hammasi.sql (yoki 003_require_mfa.sql) ni ishga tushiring." });
  for (const d of newDevices(devices, deviceId, now.getTime())) out.push({ id: `device:${d.id}`, level: 'warn', kind: 'security', title: 'Yangi qurilma kirdi', text: `${d.name || 'Qurilma'} hisobingizga ulandi. Bu siz bo'lmasangiz, uni chiqaring va parolni almashtiring.`, cta: 'Qurilmalar', act: 'open-devices' });
  if (profileIncomplete) out.push({ id: 'profile', level: 'info', kind: 'profile', title: "Profilni to'ldiring", text: "Ismingiz va telefon raqamingizni kiriting." });

  const cur = summarize(accounts, 'month', now).total;
  const all = summarize(accounts, 'all', now).total;
  if (accounts.length) {
    out.push({
      id: `daily:${day}`,
      level: 'good',
      kind: 'daily',
      title: 'Kunlik hisobot',
      text: `Sotuvda ${all.activeCount} ta akkaunt, kutilayotgan foyda ${signedSom(all.estProfit)}. Bu oy ${cur.soldCount} ta sotuv, foyda ${signedSom(cur.profit)}.`,
    });
  }
  for (const d of dueSoon(accounts, payments, day)) {
    const who = d.acc.buyer ? `${d.acc.buyer}dan` : 'Xaridordan';
    out.push({
      id: `inst:${d.acc.id}:${d.kind}:${d.due}`,
      level: d.kind === 'overdue' ? 'bad' : 'warn',
      kind: 'tip',
      title: d.kind === 'overdue' ? "To'lov muddati o'tdi" : "Yaqin to'lov",
      text: d.kind === 'overdue' ? `«${d.acc.title}»: ${who} ${som(d.amount)} olinmagan (muddat ${dateUz(d.due)}).` : `«${d.acc.title}»: ${dateUz(d.due)} kuni ${som(d.amount)} olinadi.`,
      accId: d.acc.id,
      cta: 'Ochish',
    });
  }
  for (const t of advice(accounts, now)) {
    if (t.level !== 'bad' && t.level !== 'warn') continue;
    out.push({ id: `tip:${hash(t.text)}:${day}`, level: t.level, kind: 'tip', title: t.level === 'bad' ? 'Diqqat!' : 'Eslatma', text: t.text, accId: t.id, cta: t.cta });
  }
  return out;
}

const KEY = (uid) => `accsavdo.read.${uid}`;
export function readSet(uid) {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY(uid)) || '[]'));
  } catch {
    return new Set();
  }
}
export function markRead(uid, ids) {
  const s = readSet(uid);
  ids.forEach((i) => s.add(i));
  try {
    localStorage.setItem(KEY(uid), JSON.stringify([...s].slice(-300)));
  } catch {}
}
export const unreadCount = (uid, notes) => {
  const r = readSet(uid);
  return notes.filter((n) => !r.has(n.id)).length;
};
export { som };
