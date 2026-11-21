// Akkauntlar ro'yxati (Shaxsiy va 50/50 bo'limlari bitta kod bilan)
import { $, esc } from '../core/dom.js';
import { getState, setState } from '../core/store.js';
import { som, signedSom, dateUz } from '../core/format.js';
import { registerActions, registerInputs } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { emptyState, skeletonCards } from '../ui/brand.js';
import { calc, sortAccounts } from '../logic/finance.js';
import { thumbPath } from '../services/images.service.js';
import { hydrate } from '../services/images.service.js';
import { registerTab, renderTab } from './shell.js';

const FILTERS = [['active', 'Sotuvda'], ['sold', 'Sotilgan'], ['all', 'Hammasi']];
const SORTS = [['new', 'Yangilari avval'], ['old', 'Eskilari avval'], ['price', 'Narx bo\'yicha'], ['profit', 'Foyda bo\'yicha']];

export function cardHtml(a) {
  const c = calc(a);
  const cover = a.images && a.images[0];
  const thumb = cover
    ? `<img data-path="${esc(thumbPath(cover))}" data-orig="${esc(cover)}" alt="" loading="lazy" decoding="async">`
    : `<span class="ph">${icon('image', 24)}</span>`;
  const count = a.images && a.images.length > 1 ? `<span class="img-count">${a.images.length}</span>` : '';
  const sold = a.status === 'sold';
  return `
  <article class="acc-card" role="button" tabindex="0" data-act="open-account" data-id="${esc(a.id)}">
    <div class="thumb">${thumb}${count}</div>
    <div class="acc-main">
      <div class="acc-title">${esc(a.title)}</div>
      <div class="acc-sub">${esc(a.game || "O'yin ko'rsatilmagan")}${sold && a.sold_at ? ` · ${esc(dateUz(a.sold_at))}` : ''}</div>
      <div class="badges">
        <span class="badge ${sold ? 'sold' : ''}">${sold ? 'Sotilgan' : 'Sotuvda'}</span>
        ${a.kind === 'partner' ? `<span class="badge p">50/50${a.partner_name ? ` · ${esc(a.partner_name)}` : ''}</span>` : ''}
        ${sold && a.kind === 'partner' && !a.partner_paid && c.partner > 0 ? '<span class="badge warn">Sherik to\'lanmagan</span>' : ''}
      </div>
    </div>
    <div class="acc-side">
      <div class="price">${som(c.price)}</div>
      <div class="profit ${c.my < 0 ? 'neg' : 'pos'}">${signedSom(c.my)}</div>
      <div class="muted xs">${sold ? 'foyda' : 'kutilayotgan'}</div>
    </div>
  </article>`;
}

function visible(kind) {
  const st = getState();
  const q = st.query.trim().toLowerCase();
  const list = st.accounts.filter(
    (a) =>
      a.kind === kind &&
      (st.filter === 'all' || a.status === st.filter) &&
      (!q || `${a.title} ${a.game} ${a.partner_name} ${a.buyer}`.toLowerCase().includes(q)),
  );
  return sortAccounts(list, st.sort);
}

function listHtml(kind) {
  const st = getState();
  if (!st.loaded) return skeletonCards(4);
  if (st.loadError) return emptyState({ iconName: 'wifioff', title: "Yuklab bo'lmadi", text: 'Internetni tekshirib, qayta urinib ko\'ring.', cta: 'Qayta urinish', act: 'retry-load' });
  const list = visible(kind);
  if (!list.length) {
    const searching = st.query.trim();
    return emptyState({
      iconName: searching ? 'search' : 'tag',
      title: searching ? 'Hech narsa topilmadi' : st.filter === 'sold' ? "Hali sotilgan akkaunt yo'q" : "Akkaunt yo'q",
      text: searching ? "Boshqa so'z bilan qidirib ko'ring." : kind === 'partner' ? "Sherik bilan 50/50 ishlaydigan akkauntlar shu yerda turadi." : "Shaxsiy akkauntlaringiz shu yerda turadi.",
      cta: searching || st.filter === 'sold' ? '' : "Akkaunt qo'shish",
      act: 'new-account',
    });
  }
  const total = list.reduce((s, a) => s + calc(a).my, 0);
  return `<p class="list-sum muted small">${list.length} ta · jami foyda: <b class="${total < 0 ? 'neg' : 'pos'}">${signedSom(total)}</b></p>${list.map(cardHtml).join('')}`;
}

function makeTab(kind) {
  return {
    title: kind === 'own' ? 'Shaxsiy akkauntlar' : '50/50 akkauntlar',
    view: (st) => `
      <div class="seg" role="tablist">${FILTERS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${st.filter === k}" class="${st.filter === k ? 'on' : ''}" data-act="set-filter" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="searchbar">
        <span class="lead">${icon('search', 18)}</span>
        <input type="search" placeholder="Qidirish: nom, o'yin, sherik…" value="${esc(st.query)}" data-input="acc-search" aria-label="Qidirish" enterkeyhint="search">
        <select data-change="acc-sort" aria-label="Saralash">${SORTS.map(([k, l]) => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div id="acc-list">${listHtml(kind)}</div>`,
  };
}

function repaintList() {
  const kind = getState().tab;
  const host = $('#acc-list');
  if (!host || (kind !== 'own' && kind !== 'partner')) return;
  host.innerHTML = listHtml(kind);
  hydrate(host);
}

registerTab('own', makeTab('own'));
registerTab('partner', makeTab('partner'));

let searchTimer;
registerInputs({
  'acc-search': (el) => {
    setState({ query: el.value });
    clearTimeout(searchTimer);
    searchTimer = setTimeout(repaintList, 120);
  },
  'acc-sort': (el) => {
    setState({ sort: el.value });
    repaintList();
  },
});

registerActions({
  'set-filter': (el) => {
    setState({ filter: el.dataset.v });
    renderTab();
  },
  'retry-load': async () => {
    const { loadAccounts } = await import('../services/accounts.service.js');
    try {
      await loadAccounts();
    } catch {}
    renderTab();
  },
});
