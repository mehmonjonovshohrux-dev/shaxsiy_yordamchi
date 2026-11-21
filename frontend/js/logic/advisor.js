// "Maslahatchi": oddiy qoidalar asosida eslatma va tavsiyalar (AI emas, lekin shunday ishlaydi).
// Yangi qoida qo'shish uchun faqat shu faylga yangi blok qo'shing.
import { CONFIG } from '../config.js';
import { calc, summarize, unpaidPartner } from './finance.js';
import { daysSince, som } from '../core/format.js';

const roundK = (n) => Math.round(n / 1000) * 1000;
const RANK = { bad: 0, warn: 1, info: 2, good: 3 };

export function advice(accounts, now = new Date()) {
  const out = [];
  const push = (level, text, id = null, cta = null) => out.push({ level, text, id, cta });
  const active = accounts.filter((a) => a.status === 'active');

  if (accounts.length === 0) {
    push('info', "Hali akkaunt yo'q. «+» tugmasi bilan birinchi akkauntni qo'shing: narxini kiritsangiz, ilova foydani o'zi hisoblab turadi.");
    return out;
  }

  // 1) Akkaunt bo'yicha qoidalar
  for (const a of active) {
    const c = calc(a);
    const age = daysSince(a.created_at, now);
    if (a.est_price > 0 && a.est_price < a.buy_price) {
      push('bad', `«${a.title}»: taxminiy narx (${som(a.est_price)}) sotib olinganidan (${som(a.buy_price)}) past: zarar bo'ladi.`, a.id, 'Narxni o\'zgartirish');
    } else if (age >= CONFIG.STALE_DAYS) {
      const suggested = roundK(a.est_price * (1 - CONFIG.PRICE_DROP));
      const tail = suggested > a.buy_price
        ? `Narxni ${som(suggested)} gacha tushirib ko'ring.`
        : `Narx tushirsangiz zarar bo'ladi (kamida ${som(a.buy_price)}). Boshqa joyda e'lon qilib ko'ring.`;
      push(age >= CONFIG.VERY_STALE_DAYS ? 'bad' : 'warn', `«${a.title}» ${age} kundan beri sotilmayapti. ${tail}`, a.id, 'Ochish');
    } else if (a.buy_price > 0 && c.base > 0 && c.base / a.buy_price < CONFIG.LOW_MARGIN) {
      push('warn', `«${a.title}»: kutilayotgan foyda juda oz (${Math.round((c.base / a.buy_price) * 100)}%). Narxni qayta ko'rib chiqing.`, a.id, 'Ochish');
    }
    if (!a.images || a.images.length === 0) {
      push('info', `«${a.title}»ga rasm qo'shilmagan: rasmli e'lon tezroq sotiladi.`, a.id, "Rasm qo'shish");
    }
    if (!a.est_price) {
      push('info', `«${a.title}»ga taxminiy narx kiritilmagan, shuning uchun foyda hisoblanmayapti.`, a.id, 'Narx kiritish');
    }
  }

  // 2) Sherik bilan hisob-kitob
  const up = unpaidPartner(accounts);
  if (up.sum > 0) push('warn', `Sherik(lar)ga ${som(up.sum)} to'lash qoldi (${up.n} ta akkaunt).`, null, 'Hisob-kitob');

  // 3) Oylik dinamika
  const cur = summarize(accounts, 'month', now).total;
  const prev = summarize(accounts, 'prev', now).total;
  if (prev.profit > 0 && cur.profit !== 0) {
    const ch = Math.round(((cur.profit - prev.profit) / prev.profit) * 100);
    if (ch <= -20) push('warn', `Bu oy foydangiz o'tgan oydan ${Math.abs(ch)}% kam.`);
    else if (ch >= 20) push('good', `Bu oy foydangiz o'tgan oydan ${ch}% ko'p. Zo'r natija!`);
  }
  if (cur.soldCount === 0 && now.getDate() >= 10 && active.length > 0) {
    push('info', "Bu oyda hali sotuv bo'lmadi. Sotuvdagi akkauntlar narxi va rasmlarini ko'rib chiqing.");
  }

  // 4) Eng foydali o'yin
  const byGame = {};
  for (const a of accounts) {
    if (a.status !== 'sold' || !a.game) continue;
    const g = (byGame[a.game] = byGame[a.game] || { n: 0, p: 0 });
    g.n++;
    g.p += calc(a).my;
  }
  const best = Object.entries(byGame).filter(([, g]) => g.n >= 2).sort((x, y) => y[1].p - x[1].p)[0];
  if (best && best[1].p > 0) push('good', `Eng ko'p foyda keltirgan o'yin: ${best[0]} (${best[1].n} ta sotuv, ${som(best[1].p)}).`);

  // 5) Sarmoya
  const tied = active.reduce((s, a) => s + (a.buy_price || 0), 0);
  if (tied > 0) push('info', `Sotuvdagi ${active.length} ta akkauntga ${som(tied)} sarmoya band bo'lib turibdi.`);
  if (active.length === 0) push('info', "Sotuvda akkaunt qolmadi. Yangi akkaunt qo'shishingiz mumkin.");

  return out.sort((x, y) => RANK[x.level] - RANK[y.level]).slice(0, 10);
}
