// Bildirishnomalar: ma'lumotlardan hosil qilinadi (serverga bog'liq emas).
// Har kuni yangi "kunlik hisobot" chiqadi; maslahatlar ham har kuni yangidan ko'rinadi.
import { advice } from './advisor.js';
import { summarize } from './finance.js';
import { signedSom, som, todayISO } from '../core/format.js';

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

export function buildNotes({ accounts, now = new Date(), update = null, profileIncomplete = false }) {
  const day = todayISO(now);
  const out = [];
  if (update) out.push({ id: `update:${update.version}`, level: 'info', kind: 'update', title: 'Yangi versiya tayyor', text: `AccSavdo ${update.version} chiqdi. Yangilash tugmasini bosing.` });
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
