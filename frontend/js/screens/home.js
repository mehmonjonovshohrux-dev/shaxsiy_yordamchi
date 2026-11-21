// Bosh sahifa: oylik foyda, ko'rsatkichlar, maslahatlar, grafik, so'nggi sotuvlar
import { esc } from '../core/dom.js';
import { greeting, som, signedSom, dateUz } from '../core/format.js';
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

function nameOf(user) {
  const n = (user?.email || '').split('@')[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
}

function view(st) {
  const now = new Date();
  const cur = summarize(st.accounts, 'month', now);
  const prev = summarize(st.accounts, 'prev', now);
  const up = unpaidPartner(st.accounts);
  const all = summarize(st.accounts, 'all', now);

  if (st.loaded && st.accounts.length === 0) {
    return `
    <p class="greet">${greeting(now)}, <b>${esc(nameOf(st.user))}</b> 👋</p>
    ${emptyState({ iconName: 'wallet', title: 'Boshlaymizmi?', text: "Birinchi akkauntingizni qo'shing: sotib olgan va sotmoqchi bo'lgan narxni kiritsangiz, foyda avtomatik hisoblanadi.", cta: "Akkaunt qo'shish", act: 'new-account' })}`;
  }

  const delta = prev.total.profit > 0 ? Math.round(((cur.total.profit - prev.total.profit) / prev.total.profit) * 100) : null;
  const tips = advice(st.accounts, now);
  const series = monthlySeries(st.accounts, 6, now);
  const chart = barChart(series);
  const recent = st.accounts.filter((a) => a.status === 'sold').sort((a, b) => (b.sold_at || '').localeCompare(a.sold_at || '')).slice(0, 3);

  return `
  <p class="greet">${greeting(now)}, <b>${esc(nameOf(st.user))}</b> 👋</p>

  <section class="hero-card">
    <span class="hero-lbl">Bu oy haqiqiy foyda</span>
    <strong class="hero-val ${cur.total.profit < 0 ? 'neg' : ''}">${signedSom(cur.total.profit)}</strong>
    <span class="hero-sub">${cur.total.soldCount} ta sotuv${delta === null ? '' : ` · o'tgan oyga nisbatan <b>${delta > 0 ? '+' : ''}${delta}%</b>`}</span>
  </section>

  <div class="stat-grid">
    <div class="stat"><span class="l">Sotuvda</span><strong>${all.total.activeCount} ta</strong></div>
    <div class="stat"><span class="l">Kutilayotgan foyda</span><strong>${signedSom(all.total.estProfit)}</strong></div>
    <div class="stat"><span class="l">Band sarmoya</span><strong>${som(all.total.tiedCapital)}</strong></div>
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
      ? `<h2 class="sec-title">So'nggi sotuvlar</h2>
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
