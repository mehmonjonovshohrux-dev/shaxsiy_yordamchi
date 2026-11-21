/* Hisob-kitob va "maslahatchi" qoidalari. Brauzerda ham, Node testida ham ishlaydi. */
(function (root) {
  'use strict';

  function parseDate(s) {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Foyda: shaxsiy -> hammasi menga; 50/50 -> foydaning yarmi menga, yarmi sherikka
  function calc(a) {
    const price = a.status === 'sold' ? (a.sold_price || 0) : (a.est_price || 0);
    const base = price - (a.buy_price || 0);
    const my = a.kind === 'partner' ? Math.floor(base / 2) : base;
    const partner = a.kind === 'partner' ? base - my : 0;
    return { price, base, my, partner };
  }

  function inPeriod(dateStr, period, now) {
    if (period === 'all') return true;
    if (!dateStr) return false;
    const d = parseDate(dateStr);
    const y = now.getFullYear(), m = now.getMonth();
    if (period === 'month') return d.getFullYear() === y && d.getMonth() === m;
    if (period === 'prev') {
      const p = new Date(y, m - 1, 1);
      return d.getFullYear() === p.getFullYear() && d.getMonth() === p.getMonth();
    }
    return false;
  }

  function blank() {
    return { soldCount: 0, revenue: 0, cost: 0, profit: 0, partnerShare: 0,
             activeCount: 0, estRevenue: 0, estProfit: 0, tiedCapital: 0 };
  }

  function summarize(accounts, period, now) {
    now = now || new Date();
    const out = { own: blank(), partner: blank() };
    for (const a of accounts) {
      const s = out[a.kind];
      if (!s) continue;
      const c = calc(a);
      if (a.status === 'sold') {
        if (!inPeriod(a.sold_at, period, now)) continue;
        s.soldCount++; s.revenue += a.sold_price || 0; s.cost += a.buy_price || 0;
        s.profit += c.my; s.partnerShare += c.partner;
      } else {
        s.activeCount++; s.estRevenue += a.est_price || 0; s.estProfit += c.my;
        s.tiedCapital += a.buy_price || 0;
      }
    }
    return out;
  }

  function unpaidPartner(accounts) {
    let sum = 0, n = 0;
    for (const a of accounts) {
      if (a.kind === 'partner' && a.status === 'sold' && !a.partner_paid) {
        const p = calc(a).partner;
        if (p > 0) { sum += p; n++; }
      }
    }
    return { sum, n };
  }

  const roundK = (n) => Math.round(n / 1000) * 1000;
  const fmt = (n) => Math.round(n || 0).toLocaleString('ru-RU') + " so'm";

  // Oddiy qoidalarga asoslangan maslahatlar (AI emas, lekin shunday ishlaydi)
  function advice(accounts, now) {
    now = now || new Date();
    const out = [];
    const push = (level, text, id) => out.push({ level, text, id: id || null });
    const active = accounts.filter((a) => a.status === 'active');
    const ageDays = (a) => Math.floor((now - parseDate(a.created_at)) / 864e5);

    if (accounts.length === 0) {
      push('info', "Hali akkaunt yo'q. Pastdagi «+» tugmasi bilan birinchi akkauntni qo'shing.");
      return out;
    }

    for (const a of active) {
      const c = calc(a);
      const age = ageDays(a);
      if (a.est_price > 0 && a.est_price < a.buy_price) {
        push('bad', `«${a.title}»: taxminiy narx (${fmt(a.est_price)}) sotib olingan narxdan (${fmt(a.buy_price)}) past, zarar bo'ladi.`, a.id);
      } else if (age >= 14) {
        const sug = roundK(a.est_price * 0.9);
        const floor = a.buy_price;
        const tail = sug > floor
          ? `Narxni ${fmt(sug)} gacha tushirib ko'ring.`
          : `Narx tushirsangiz zarar bo'ladi (minimal: ${fmt(floor)}), boshqa joyda e'lon qilib ko'ring.`;
        push(age >= 30 ? 'bad' : 'warn', `«${a.title}» ${age} kundan beri sotilmayapti. ${tail}`, a.id);
      } else if (a.buy_price > 0 && c.base > 0 && c.base / a.buy_price < 0.1) {
        push('warn', `«${a.title}»: kutilayotgan foyda juda oz (${Math.round((c.base / a.buy_price) * 100)}%). Narxni qayta ko'rib chiqing.`, a.id);
      }
      if (!a.images || a.images.length === 0) {
        push('info', `«${a.title}»ga rasm qo'shilmagan, rasmli e'lon tezroq sotiladi.`, a.id);
      }
    }

    const up = unpaidPartner(accounts);
    if (up.sum > 0) push('warn', `Sherik(lar)ga ${fmt(up.sum)} to'lash qoldi (${up.n} ta akkaunt).`);

    const cur = summarize(accounts, 'month', now);
    const prev = summarize(accounts, 'prev', now);
    const curP = cur.own.profit + cur.partner.profit;
    const prevP = prev.own.profit + prev.partner.profit;
    if (prevP > 0 && curP !== 0) {
      const ch = Math.round(((curP - prevP) / prevP) * 100);
      if (ch <= -20) push('warn', `Bu oy foydangiz o'tgan oydan ${Math.abs(ch)}% kam.`);
      else if (ch >= 20) push('good', `Bu oy foydangiz o'tgan oydan ${ch}% ko'p. Zo'r!`);
    }
    if (cur.own.soldCount + cur.partner.soldCount === 0 && now.getDate() >= 10 && active.length > 0) {
      push('info', "Bu oyda hali sotuv bo'lmadi. Sotuvdagi akkauntlar narxini ko'rib chiqing.");
    }

    // Eng foydali o'yin
    const byGame = {};
    for (const a of accounts) {
      if (a.status !== 'sold' || !a.game) continue;
      const g = (byGame[a.game] = byGame[a.game] || { n: 0, p: 0 });
      g.n++; g.p += calc(a).my;
    }
    const best = Object.entries(byGame).filter(([, g]) => g.n >= 2).sort((x, y) => y[1].p - x[1].p)[0];
    if (best && best[1].p > 0) push('good', `Eng ko'p foyda keltirgan o'yin: ${best[0]} (${best[1].n} ta sotuv, ${fmt(best[1].p)}).`);

    const tied = active.reduce((s, a) => s + (a.buy_price || 0), 0);
    if (tied > 0) push('info', `Sotuvdagi ${active.length} ta akkauntga ${fmt(tied)} sarmoya band bo'lib turibdi.`);
    if (active.length === 0) push('info', "Sotuvda akkaunt qolmadi. Yangi akkaunt qo'shishingiz mumkin.");

    const rank = { bad: 0, warn: 1, info: 2, good: 3 };
    return out.sort((x, y) => rank[x.level] - rank[y.level]).slice(0, 10);
  }

  const api = { parseDate, calc, inPeriod, summarize, unpaidPartner, advice, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof self !== 'undefined' ? self : this);
