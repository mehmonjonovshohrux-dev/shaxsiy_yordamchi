// Hisobot: davr bo'yicha foyda, shaxsiy va 50/50 alohida, o'yinlar kesimi, CSV yuklab olish
import { esc } from '../core/dom.js';
import { getState, setState } from '../core/store.js';
import { som, signedSom, todayISO } from '../core/format.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { barChart } from '../ui/chart.js';
import { toast } from '../ui/toast.js';
import { summarize, monthlySeries, profitByGame, accountsToCsv } from '../logic/finance.js';
import { buildReport, periodLabel } from '../logic/report-data.js';
import { buildDocx } from '../ui/docx.js';
import { printReport } from '../ui/report-print.js';
import { getProfile } from '../services/profile.service.js';
import { registerTab, renderTab } from './shell.js';
import { openSettle } from './partner-settle.js';

const PERIODS = [['month', 'Bu oy'], ['prev', "O'tgan oy"], ['3m', '3 oy'], ['year', 'Bu yil'], ['all', 'Hammasi']];

const block = (title, ic, x, partner) => `
  <section class="card">
    <h3 class="card-title">${icon(ic, 18)} ${title}</h3>
    <div class="kv"><span>Sotilgan</span><b>${x.soldCount} ta</b></div>
    <div class="kv"><span>Sotuv summasi</span><b>${som(x.revenue)}</b></div>
    <div class="kv"><span>Sotib olingan</span><b>${som(x.cost)}</b></div>
    ${partner ? `<div class="kv"><span>Sherik ulushi</span><b>${som(x.partnerShare)}</b></div>` : ''}
    <div class="kv total"><span>Haqiqiy foyda (sizga)</span><b class="${x.profit < 0 ? 'neg' : 'pos'}">${signedSom(x.profit)}</b></div>
    <hr>
    <div class="kv"><span>Hozir sotuvda</span><b>${x.activeCount} ta</b></div>
    <div class="kv"><span>Band sarmoya</span><b>${som(x.tiedCapital)}</b></div>
    <div class="kv"><span>Kutilayotgan foyda</span><b class="${x.estProfit < 0 ? 'neg' : ''}">${signedSom(x.estProfit)}</b></div>
  </section>`;

function view(st) {
  const now = new Date();
  const s = summarize(st.accounts, st.period, now);
  const games = profitByGame(st.accounts, st.period, now).slice(0, 5);
  const chart = barChart(monthlySeries(st.accounts, 6, now));
  return `
  <div class="seg scroll">${PERIODS.map(([k, l]) => `<button type="button" class="${st.period === k ? 'on' : ''}" data-act="set-period" data-v="${k}">${l}</button>`).join('')}</div>

  <section class="hero-card small">
    <span class="hero-lbl">Jami haqiqiy foyda</span>
    <strong class="hero-val ${s.total.profit < 0 ? 'neg' : ''}">${signedSom(s.total.profit)}</strong>
    <span class="hero-sub">${s.total.soldCount} ta sotuv · aylanma ${som(s.total.revenue)}</span>
  </section>

  ${block('Shaxsiy akkauntlar', 'user', s.own, false)}
  ${block('50/50 akkauntlar', 'users', s.partner, true)}
  <button type="button" class="btn ghost block" data-act="open-settle">${icon('wallet', 18)} Sherik bilan hisob-kitob</button>

  ${chart ? `<h2 class="sec-title">So'nggi 6 oy</h2><div class="card">${chart}</div>` : ''}
  ${
    games.length
      ? `<h2 class="sec-title">O'yinlar bo'yicha foyda</h2><div class="card list">${games.map((g) => `<div class="kv"><span>${esc(g.game)} <small class="muted">· ${g.count} ta</small></span><b class="${g.profit < 0 ? 'neg' : 'pos'}">${signedSom(g.profit)}</b></div>`).join('')}</div>`
      : ''
  }
  <h2 class="sec-title">Hisobotni yuklab olish</h2>
  <div class="card">
    <p class="muted small">Tanlangan davr (<b>${esc(periodLabel(st.period))}</b>) bo'yicha tayyor hisobot: jadvallar, foyda, sotilganlar, muddatli qarzlar.</p>
    <div class="btn-grid">
      <button type="button" class="btn span2" data-act="export-docx">${icon('file', 18)} Word (.docx)</button>
      <button type="button" class="btn ghost" data-act="export-pdf">${icon('download', 18)} PDF</button>
      <button type="button" class="btn ghost" data-act="export-csv">${icon('download', 18)} Excel (CSV)</button>
    </div>
  </div>
  <p class="muted xs">Taxminiy ko'rsatkichlar faqat hozir sotuvdagi akkauntlar bo'yicha (davrga bog'liq emas).</p>`;
}

export function download(name, data, type) {
  const blob = new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

registerTab('report', { title: 'Hisobot', view });
registerActions({
  'set-period': (el) => {
    setState({ period: el.dataset.v });
    renderTab();
  },
  'export-csv': () => {
    download(`accsavdo-${todayISO()}.csv`, accountsToCsv(getState().accounts), 'text/csv;charset=utf-8');
    toast('CSV yuklab olindi');
  },
  'export-json': () => {
    const data = getState().accounts.map(({ user_id, ...r }) => r);
    download(`accsavdo-zaxira-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json');
    toast('Zaxira yuklab olindi');
  },
  'export-docx': () => {
    const st = getState();
    const p = getProfile();
    const r = buildReport({ accounts: st.accounts, payments: st.payments, period: st.period, owner: [p.first, p.last].filter(Boolean).join(' ') });
    download(`accsavdo-hisobot-${todayISO()}.docx`, buildDocx(r), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    toast('Word hisobot yuklab olindi');
  },
  'export-pdf': () => {
    const st = getState();
    const p = getProfile();
    printReport(buildReport({ accounts: st.accounts, payments: st.payments, period: st.period, owner: [p.first, p.last].filter(Boolean).join(' ') }));
    toast('Chop etish oynasida «PDF sifatida saqlash» ni tanlang');
  },
});
