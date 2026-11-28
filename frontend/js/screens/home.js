// Bosh sahifa: oylik foyda, ko'rsatkichlar, maslahatlar, grafik, so'nggi sotuvlar
import { esc } from '../core/dom.js';
import { som, signedSom, dateUz, daysSince, todayISO } from '../core/format.js';
import { totals as instTotals } from '../logic/installments.js';
import { CONFIG } from '../config.js';
import { makeGreeting } from '../logic/greetings.js';
import { getProfile } from '../services/profile.service.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { barChart } from '../ui/chart.js';
import { emptyState } from '../ui/brand.js';
import { summarize, unpaidPartner, monthlySeries, calc } from '../logic/finance.js';
import { advice } from '../logic/advisor.js';
import { registerTab, setTab } from './shell.js';
import { openAccount } from './account-detail.js';
import { openSettle } from './partner-settle.js';

const LEVEL_ICON = { bad: 'alert', warn: 'alert', info: 'info', good: 'trend' };

// Salomlashuv ilova ochilganda bir marta tanlanadi (har safar boshqa matn), tab almashganda o'zgarmaydi
let greet = null;
let greetKey = '';
function greetingHtml(st, now) {
  const p = getProfile();
  const key = `${p.first}|${p.last}`;
  if (key !== greetKey) greet = null; // ism o'zgarsa, salom yangilanadi
  if (!greet && st.loaded) {
    greetKey = key;
    const active = st.accounts.filter((a) => a.status === 'active');
    const cur = summarize(st.accounts, 'month', now).total;
    const up = unpaidPartner(st.accounts);
    greet = makeGreeting({
      first: p.first,
      last: p.last,
      now,
      ctx: {
        active: active.length,
        tied: som(active.reduce((s, a) => s + (a.buy_price || 0), 0)),
        monthProfit: cur.profit,
        monthProfitText: signedSom(cur.profit),
        monthSold: cur.soldCount,
        unpaid: up.sum,
        unpaidText: som(up.sum),
        stale: active.filter((a) => daysSince(a.created_at, now) >= CONFIG.STALE_DAYS).length,
      },
    });
  }
  if (!greet) return '<div class="greet"><i class="sk-line"></i></div>';
  return `<div class="greet"><h2 class="greet-title">${esc(greet.title)}</h2>${greet.sub ? `<p class="greet-sub">${esc(greet.sub)}</p>` : ''}</div>`;
}

function profileCard() {
  if (getProfile().complete) return '';
  return `<div class="tip info"><span class="tip-ic">${icon('info', 18)}</span><span class="tip-tx">Profilni to'ldiring: ism va telefon raqamingizni kiriting.</span><button type="button" class="tip-cta" data-act="open-profile">Kiritish</button></div>`;
}

function view(st) {
  const now = new Date();
  const cur = summarize(st.accounts, 'month', now);
  const prev = summarize(st.accounts, 'prev', now);
  const up = unpaidPartner(st.accounts);
  const instTot = instTotals(st.accounts, st.payments, todayISO());
  const all = summarize(st.accounts, 'all', now);

  if (st.loaded && st.accounts.length === 0) {
    return `
    ${greetingHtml(st, now)}${profileCard()}
    ${emptyState({ iconName: 'wallet', title: 'Boshlaymizmi?', text: "Birinchi akkauntingizni qo'shing: sotib olgan va sotmoqchi bo'lgan narxni kiritsangiz, foyda avtomatik hisoblanadi.", cta: "Akkaunt qo'shish", act: 'new-account' })}`;
  }

  const delta = prev.total.profit > 0 ? Math.round(((cur.total.profit - prev.total.profit) / prev.total.profit) * 100) : null;
  const tips = advice(st.accounts, now);
  const series = monthlySeries(st.accounts, 6, now);
  const chart = barChart(series);
  const recent = st.accounts.filter((a) => a.status === 'sold').sort((a, b) => (b.sold_at || '').localeCompare(a.sold_at || '')).slice(0, 3);

  return `
  ${greetingHtml(st, now)}${profileCard()}

  <section class="hero-card">
    <span class="hero-lbl">Bu oy haqiqiy foyda</span>
    <strong class="hero-val ${cur.total.profit < 0 ? 'neg' : ''}">${signedSom(cur.total.profit)}</strong>
    <span class="hero-sub">${cur.total.soldCount} ta sotuv${delta === null ? '' : ` · o'tgan oyga nisbatan <b>${delta > 0 ? '+' : ''}${delta}%</b>`}</span>
  </section>

  <div class="stat-grid">
    <div class="stat"><span class="l">Sotuvda</span><strong>${all.total.activeCount} ta</strong></div>
    <div class="stat"><span class="l">Kutilayotgan foyda</span><strong>${signedSom(all.total.estProfit)}</strong></div>
    <div class="stat"><span class="l">Band sarmoya</span><strong>${som(all.total.tiedCapital)}</strong></div>
    ${instTot.count ? `<button type="button" class="stat ${instTot.overdue ? 'warn' : ''} as-btn" data-act="open-inst-all"><span class="l">Muddatli qarz (olinadi)</span><strong>${som(instTot.left)}</strong></button>` : ''}
    <button type="button" class="stat ${up.sum > 0 ? 'warn' : ''} as-btn" data-act="open-settle"><span class="l">Sherikka to'lanadigan</span><strong>${som(up.sum)}</strong></button>
  </div>

  <h2 class="sec-title">Eslatma va maslahatlar</h2>
  ${
    tips.length
      ? tips
          .map(
            (t) => `
    <div class="tip ${t.level}">
      <span class="tip-ic">${icon(LEVEL_ICON[t.level], 18)}</span>
      <span class="tip-tx">${esc(t.text)}</span>
      ${t.id ? `<button type="button" class="tip-cta" data-act="open-account" data-id="${esc(t.id)}">${esc(t.cta || 'Ochish')}</button>` : t.cta === 'Hisob-kitob' ? '<button type="button" class="tip-cta" data-act="open-settle">Hisob-kitob</button>' : ''}
    </div>`,
          )
          .join('')
      : '<p class="muted">Hozircha hammasi joyida ✅</p>'
  }

  ${chart ? `<h2 class="sec-title">So'nggi 6 oy foydasi</h2><div class="card">${chart}</div>` : ''}

  ${
    recent.length
      ? `<h2 class="sec-title sec-row">So'nggi sotuvlar <button type="button" class="link-btn inline" data-act="goto-tab" data-tab="sold">Hammasi</button></h2>
    <div class="card list">${recent
      .map(
        (a) => `
      <div class="row-item" role="button" tabindex="0" data-act="open-account" data-id="${esc(a.id)}">
        <div><b>${esc(a.title)}</b><span class="muted small">${esc(dateUz(a.sold_at))}</span></div>
        <b class="${calc(a).my < 0 ? 'neg' : 'pos'}">${signedSom(calc(a).my)}</b>
      </div>`,
      )
      .join('')}</div>`
      : ''
  }`;
}

registerTab('home', { title: 'Bosh sahifa', view });
registerActions({
  'open-settle': () => openSettle(),
  'goto-tab': (el) => setTab(el.dataset.tab),
});
export { openAccount };
