'use strict';
/* AccSavdo: akkaunt savdosi hisobi. Barcha foydalanuvchi matnlari esc() bilan tozalanadi. */
const CFG = window.APP_CONFIG;
const { calc, summarize, unpaidPartner, advice, fmt } = window.Logic;
const BUCKET = 'acc-images';
const MAX_IMAGES = 8;

if (!window.supabase || CFG.SUPABASE_URL.includes('YOUR-PROJECT')) {
  document.getElementById('app').innerHTML =
    '<p class="center">Sozlanmagan: <code>config.js</code> ichiga Supabase URL va anon kalitni yozing.</p>';
  throw new Error('config missing');
}
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const sign = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');

const state = { user: null, accounts: [], urls: {}, tab: 'home', filter: 'active', period: 'month', busy: false };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 2800);
}
function showModal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.classList.remove('hidden'); }
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; }
const errText = (e) => (e && e.message) ? e.message : String(e);

/* ------------------------------ AUTH ------------------------------ */
async function boot() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return loginView();
  state.user = data.session.user;
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') return mfaView();
  await loadAll();
  render();
}

function loginView(mode = 'in') {
  const signup = mode === 'up';
  $('#app').innerHTML = `
  <div class="login card">
    <h1>AccSavdo</h1>
    <form data-form="${signup ? 'signup' : 'login'}" autocomplete="on">
      <label>Email</label><input name="email" type="email" required autocomplete="username">
      <label>Parol ${signup ? '(kamida 10 belgi)' : ''}</label>
      <input name="password" type="password" required minlength="${signup ? 10 : 1}" autocomplete="${signup ? 'new-password' : 'current-password'}">
      <p id="lerr" class="neg small"></p>
      <button class="full" type="submit">${signup ? "Ro'yxatdan o'tish" : 'Kirish'}</button>
    </form>
    ${CFG.ALLOW_SIGNUP ? `<p class="center small"><a href="#" data-action="${signup ? 'to-login' : 'to-signup'}">${signup ? 'Akkauntim bor' : "Ro'yxatdan o'tish"}</a></p>` : ''}
  </div>`;
}

async function mfaView() {
  const { data } = await sb.auth.mfa.listFactors();
  const f = data && data.totp && data.totp[0];
  if (!f) { await loadAll(); return render(); }
  $('#app').innerHTML = `
  <div class="login card">
    <h1>Tasdiqlash kodi</h1>
    <p class="muted small">Authenticator ilovasidagi 6 xonali kodni kiriting.</p>
    <form data-form="mfa" data-factor="${esc(f.id)}">
      <input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code">
      <p id="lerr" class="neg small"></p>
      <button class="full" type="submit">Tasdiqlash</button>
    </form>
    <p class="center small"><a href="#" data-action="logout">Chiqish</a></p>
  </div>`;
}

/* ------------------------------ DATA ------------------------------ */
async function loadAll() {
  const { data, error } = await sb.from('accounts').select('*').order('created_at', { ascending: false });
  if (error) { toast('Yuklashda xato: ' + error.message); return; }
  state.accounts = data || [];
  await signFirstImages();
}

async function signUrls(paths) {
  const need = paths.filter((p) => p && !state.urls[p]);
  if (!need.length) return;
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(need, 3600);
  (data || []).forEach((d) => { if (d.signedUrl) state.urls[d.path] = d.signedUrl; });
}
const signFirstImages = () => signUrls(state.accounts.map((a) => a.images && a.images[0]));

async function shrink(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Faqat JPG/PNG/WEBP rasm mumkin');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.72));
}

/* ------------------------------ RENDER ------------------------------ */
const TITLES = { home: 'Bosh sahifa', own: 'Shaxsiy akkauntlar', partner: '50/50 akkauntlar', report: 'Hisobot', settings: 'Sozlamalar' };

function render() {
  const tabs = [['home', '🏠', 'Bosh'], ['own', '👤', 'Shaxsiy'], ['partner', '🤝', '50/50'], ['report', '📊', 'Hisobot'], ['settings', '⚙️', 'Sozlama']];
  const body = { home: homeView, own: () => listView('own'), partner: () => listView('partner'), report: reportView, settings: settingsView }[state.tab]();
  $('#app').innerHTML = `
    <header class="top"><h1>${TITLES[state.tab]}</h1></header>
    <main>${body}</main>
    ${['own', 'partner', 'home'].includes(state.tab) ? '<button class="fab" data-action="new" aria-label="Qo\'shish">+</button>' : ''}
    <nav class="bar">${tabs.map(([k, ic, l]) => `<button data-action="tab" data-tab="${k}" class="${state.tab === k ? 'on' : ''}"><span class="ic">${ic}</span>${l}</button>`).join('')}</nav>`;
}

function stat(l, v, cls = '') { return `<div class="stat"><div class="l">${esc(l)}</div><div class="v ${cls}">${esc(v)}</div></div>`; }

function homeView() {
  const now = new Date();
  const cur = summarize(state.accounts, 'month', now);
  const profit = cur.own.profit + cur.partner.profit;
  const active = cur.own.activeCount + cur.partner.activeCount;
  const est = cur.own.estProfit + cur.partner.estProfit;
  const up = unpaidPartner(state.accounts);
  const tips = advice(state.accounts, now);
  return `
    <div class="grid">
      ${stat('Bu oy haqiqiy foyda', fmt(profit), sign(profit))}
      ${stat('Kutilayotgan foyda', fmt(est), sign(est))}
      ${stat('Sotuvdagi akkauntlar', String(active))}
      ${stat("Sherikka to'lanadigan", fmt(up.sum), up.sum > 0 ? 'neg' : '')}
    </div>
    <h2>Eslatma va maslahatlar</h2>
    ${tips.length ? tips.map((t) => `<div class="tip ${t.level}" ${t.id ? `data-action="open" data-id="${esc(t.id)}"` : ''}>${esc(t.text)}</div>`).join('') : '<p class="muted">Hozircha hammasi joyida ✅</p>'}`;
}

function listView(kind) {
  const f = state.filter;
  const list = state.accounts.filter((a) => a.kind === kind && (f === 'all' || a.status === f));
  const chips = [['active', 'Sotuvda'], ['sold', 'Sotilgan'], ['all', 'Hammasi']]
    .map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-action="filter" data-f="${k}">${l}</button>`).join('');
  return `<div class="chips">${chips}</div>` + (list.length ? list.map(cardHtml).join('') : '<p class="center muted">Bu yerda hali akkaunt yo\'q.</p>');
}

function cardHtml(a) {
  const c = calc(a);
  const url = a.images && a.images[0] && state.urls[a.images[0]];
  const th = url ? `<img class="th" src="${esc(url)}" alt="">` : '<div class="th">rasm yo\'q</div>';
  return `<div class="card acc" data-action="open" data-id="${esc(a.id)}">${th}
    <div class="in">
      <div class="t">${esc(a.title)}</div>
      <div class="small muted">${esc(a.game)}</div>
      <div class="row"><span><span class="badge ${a.status === 'sold' ? 'sold' : ''}">${a.status === 'sold' ? 'Sotilgan' : 'Sotuvda'}</span>${a.kind === 'partner' ? '<span class="badge p">50/50</span>' : ''}</span></div>
      <div class="row small"><span>${a.status === 'sold' ? 'Sotildi' : 'Taxminiy'}: <b>${fmt(c.price)}</b></span><b class="${sign(c.my)}">${c.my >= 0 ? '+' : ''}${fmt(c.my)}</b></div>
    </div></div>`;
}

function reportView() {
  const p = state.period;
  const s = summarize(state.accounts, p, new Date());
  const periods = [['month', 'Bu oy'], ['prev', "O'tgan oy"], ['all', 'Hammasi']]
    .map(([k, l]) => `<button class="chip ${p === k ? 'on' : ''}" data-action="period" data-p="${k}">${l}</button>`).join('');
  const block = (title, x, partner) => `
    <h2>${title}</h2>
    <div class="card">
      <div class="kv"><span>Sotilgan soni</span><b>${x.soldCount} ta</b></div>
      <div class="kv"><span>Sotuv summasi</span><b>${fmt(x.revenue)}</b></div>
      <div class="kv"><span>Sotib olingan narx</span><b>${fmt(x.cost)}</b></div>
      ${partner ? `<div class="kv"><span>Sherik ulushi</span><b>${fmt(x.partnerShare)}</b></div>` : ''}
      <div class="kv"><span>Haqiqiy foyda (sizga)</span><b class="${sign(x.profit)}">${fmt(x.profit)}</b></div>
    </div>
    <div class="card">
      <div class="kv"><span>Sotuvda turibdi</span><b>${x.activeCount} ta</b></div>
      <div class="kv"><span>Band sarmoya</span><b>${fmt(x.tiedCapital)}</b></div>
      <div class="kv"><span>Taxminiy foyda (sizga)</span><b class="${sign(x.estProfit)}">${fmt(x.estProfit)}</b></div>
    </div>`;
  const tot = s.own.profit + s.partner.profit;
  return `<div class="chips">${periods}</div>
    <div class="stat"><div class="l">Jami haqiqiy foyda</div><div class="v ${sign(tot)}">${esc(fmt(tot))}</div></div>
    ${block('Shaxsiy akkauntlar', s.own, false)}${block('50/50 akkauntlar', s.partner, true)}
    <p class="small muted">Taxminiy ko'rsatkichlar faqat hozir sotuvdagi akkauntlar bo'yicha (davrga bog'liq emas).</p>`;
}

function settingsView() {
  return `
    <div class="card"><div class="kv"><span>Kirilgan</span><b>${esc(state.user.email)}</b></div></div>
    <div class="card">
      <b>Ikki bosqichli tasdiqlash (2FA)</b>
      <p class="small muted">Google Authenticator / Authy orqali. Parol o'g'irlansa ham himoya qiladi.</p>
      <div id="mfa-box"><button class="sec" data-action="mfa-status">Holatini tekshirish</button></div>
    </div>
    <div class="card">
      <b>Zaxira nusxa</b>
      <p class="small muted">Barcha akkaunt ma'lumotlarini (rasmsiz) faylga yuklab oling.</p>
      <button class="sec" data-action="export">JSON yuklab olish</button>
    </div>
    <button class="danger full" data-action="logout">Chiqish</button>`;
}

/* ------------------------------ FORMS ------------------------------ */
function accountForm(a) {
  const isNew = !a;
  a = a || { kind: state.tab === 'partner' ? 'partner' : 'own', title: '', game: '', partner_name: '', buy_price: '', est_price: '', notes: '', images: [] };
  const games = [...new Set(state.accounts.map((x) => x.game).filter(Boolean))];
  return `
  <h2>${isNew ? "Yangi akkaunt" : 'Tahrirlash'}</h2>
  <form data-form="account" data-id="${esc(a.id || '')}">
    <label>Turi</label>
    <div class="seg">
      <label class="${a.kind === 'own' ? 'on' : ''}"><input type="radio" name="kind" value="own" ${a.kind === 'own' ? 'checked' : ''}><span>Shaxsiy</span></label>
      <label class="${a.kind === 'partner' ? 'on' : ''}"><input type="radio" name="kind" value="partner" ${a.kind === 'partner' ? 'checked' : ''}><span>50/50</span></label>
    </div>
    <label>Nomi / ID (masalan: PUBG lvl 60)</label><input name="title" required maxlength="120" value="${esc(a.title)}">
    <label>O'yin</label><input name="game" maxlength="60" list="games" value="${esc(a.game)}">
    <datalist id="games">${games.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
    <div id="partner-wrap" class="${a.kind === 'partner' ? '' : 'hidden'}"><label>Sherik ismi</label><input name="partner_name" maxlength="60" value="${esc(a.partner_name)}"></div>
    <label>Sotib olingan narx (so'm)</label><input name="buy_price" inputmode="numeric" value="${esc(a.buy_price)}">
    <label>Taxminiy sotuv narxi (so'm)</label><input name="est_price" inputmode="numeric" value="${esc(a.est_price)}">
    <label>Izoh (login/parol yozmang!)</label><textarea name="notes" maxlength="2000">${esc(a.notes)}</textarea>
    <label>Rasmlar (${MAX_IMAGES} tagacha)</label>
    <div class="thumbs" id="thumbs">${(a.images || []).map((p) => thumbHtml(p)).join('')}</div>
    <input type="file" name="files" accept="image/jpeg,image/png,image/webp" multiple>
    <p id="ferr" class="neg small"></p>
    <div class="row"><button type="button" class="sec" data-action="close">Bekor</button><button type="submit">Saqlash</button></div>
  </form>`;
}
const thumbHtml = (p) => `<div class="tb" data-path="${esc(p)}"><img src="${esc(state.urls[p] || '')}" alt=""><button type="button" class="x" data-action="rm-img" aria-label="O'chirish">×</button></div>`;

async function openAccount(id) {
  const a = state.accounts.find((x) => x.id === id); if (!a) return;
  await signUrls(a.images || []);
  const c = calc(a);
  showModal(`
    <h2>${esc(a.title)}</h2>
    <div class="gal">${(a.images || []).map((p) => `<img src="${esc(state.urls[p] || '')}" alt="">`).join('')}</div>
    <div class="card">
      <div class="kv"><span>O'yin</span><b>${esc(a.game) || '-'}</b></div>
      <div class="kv"><span>Turi</span><b>${a.kind === 'partner' ? '50/50' + (a.partner_name ? ' (' + esc(a.partner_name) + ')' : '') : 'Shaxsiy'}</b></div>
      <div class="kv"><span>Sotib olingan</span><b>${fmt(a.buy_price)}</b></div>
      <div class="kv"><span>Taxminiy narx</span><b>${fmt(a.est_price)}</b></div>
      ${a.status === 'sold' ? `<div class="kv"><span>Sotilgan narx (${esc(a.sold_at)})</span><b>${fmt(a.sold_price)}</b></div>` : ''}
      <div class="kv"><span>${a.status === 'sold' ? 'Foyda' : 'Kutilayotgan foyda'} (sizga)</span><b class="${sign(c.my)}">${fmt(c.my)}</b></div>
      ${a.kind === 'partner' ? `<div class="kv"><span>Sherik ulushi${a.status === 'sold' ? (a.partner_paid ? " (to'langan ✅)" : " (to'lanmagan)") : ''}</span><b>${fmt(c.partner)}</b></div>` : ''}
      ${a.notes ? `<div class="kv"><span>Izoh</span><b>${esc(a.notes)}</b></div>` : ''}
    </div>
    <div class="grid">
      ${a.status === 'active' ? `<button data-action="sell" data-id="${esc(a.id)}">✅ Sotildi</button>` : `<button class="sec" data-action="unsell" data-id="${esc(a.id)}">Sotuvga qaytarish</button>`}
      ${a.kind === 'partner' && a.status === 'sold' ? `<button class="sec" data-action="togglepaid" data-id="${esc(a.id)}">${a.partner_paid ? "To'lanmagan deb belgilash" : "Sherikka to'landi"}</button>` : ''}
      <button class="sec" data-action="edit" data-id="${esc(a.id)}">✏️ Tahrirlash</button>
      <button class="danger" data-action="delete" data-id="${esc(a.id)}">🗑 O'chirish</button>
      <button class="sec" data-action="close">Yopish</button>
    </div>`);
}

function sellForm(id) {
  const a = state.accounts.find((x) => x.id === id);
  showModal(`
    <h2>Sotildi: ${esc(a.title)}</h2>
    <p class="muted small">Taxminiy narx: ${fmt(a.est_price)}. Haqiqiy narx uning o'rniga yoziladi.</p>
    <form data-form="sell" data-id="${esc(id)}">
      <label>Haqiqiy sotilgan narx (so'm)</label><input name="sold_price" inputmode="numeric" required value="${esc(a.est_price || '')}">
      <label>Sotilgan sana</label><input name="sold_at" type="date" required value="${today()}" max="${today()}">
      <p id="ferr" class="neg small"></p>
      <div class="row"><button type="button" class="sec" data-action="close">Bekor</button><button type="submit">Saqlash</button></div>
    </form>`);
}

/* ------------------------------ ACTIONS ------------------------------ */
async function saveAccount(form) {
  const f = new FormData(form);
  const id = form.dataset.id || crypto.randomUUID();
  const isNew = !form.dataset.id;
  const old = isNew ? null : state.accounts.find((x) => x.id === id);
  const keep = [...form.querySelectorAll('#thumbs .tb')].map((el) => el.dataset.path);
  const files = [...(form.files.files || [])];
  const err = $('#ferr');
  if (keep.length + files.length > MAX_IMAGES) { err.textContent = `Ko'pi bilan ${MAX_IMAGES} ta rasm`; return; }
  const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Saqlanmoqda…';
  try {
    const newPaths = [];
    for (const file of files) {
      const blob = await shrink(file);
      const path = `${state.user.id}/${id}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      newPaths.push(path);
    }
    const row = {
      title: String(f.get('title')).trim(), game: String(f.get('game') || '').trim(),
      kind: f.get('kind') === 'partner' ? 'partner' : 'own',
      partner_name: String(f.get('partner_name') || '').trim(),
      buy_price: num(f.get('buy_price')), est_price: num(f.get('est_price')),
      notes: String(f.get('notes') || '').trim(), images: [...keep, ...newPaths]
    };
    if (!row.title) throw new Error('Nomi kerak');
    if (row.kind === 'own') row.partner_name = '';
    const q = isNew ? sb.from('accounts').insert({ id, ...row }) : sb.from('accounts').update(row).eq('id', id);
    const { error } = await q;
    if (error) throw error;
    const removed = old ? (old.images || []).filter((p) => !keep.includes(p)) : [];
    if (removed.length) await sb.storage.from(BUCKET).remove(removed);
    closeModal(); await loadAll(); render(); toast('Saqlandi');
  } catch (e) { err.textContent = errText(e); btn.disabled = false; btn.textContent = 'Saqlash'; }
}

async function updateAcc(id, patch, msg) {
  const { error } = await sb.from('accounts').update(patch).eq('id', id);
  if (error) return toast('Xato: ' + error.message);
  closeModal(); await loadAll(); render(); toast(msg);
}

async function deleteAcc(id) {
  const a = state.accounts.find((x) => x.id === id);
  if (!confirm(`«${a.title}» o'chirilsinmi? Qaytarib bo'lmaydi.`)) return;
  if (a.images && a.images.length) await sb.storage.from(BUCKET).remove(a.images);
  const { error } = await sb.from('accounts').delete().eq('id', id);
  if (error) return toast('Xato: ' + error.message);
  closeModal(); await loadAll(); render(); toast("O'chirildi");
}

async function mfaStatus() {
  const { data } = await sb.auth.mfa.listFactors();
  const f = data && data.totp && data.totp[0];
  const box = $('#mfa-box');
  if (f) {
    box.innerHTML = `<p class="pos">✅ 2FA yoqilgan</p><button class="danger" data-action="mfa-off" data-id="${esc(f.id)}">O'chirish</button>`;
  } else {
    box.innerHTML = '<button data-action="mfa-on">2FA ni yoqish</button>';
  }
}

async function mfaEnroll() {
  const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
  if (error) return toast(error.message);
  $('#mfa-box').innerHTML = `
    <p class="small">1) Authenticator ilovasida QR kodni skanerlang.</p>
    <img class="qr" src="${esc(data.totp.qr_code)}" alt="QR">
    <p class="small">Yoki kalit: <code>${esc(data.totp.secret)}</code></p>
    <form data-form="mfa-enroll" data-factor="${esc(data.id)}">
      <label>2) Ilovadagi 6 xonali kod</label>
      <input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required>
      <p id="lerr" class="neg small"></p>
      <button type="submit">Tasdiqlash</button>
    </form>`;
}

function exportJson() {
  const data = state.accounts.map(({ user_id, images, ...r }) => r);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `accsavdo-${today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ------------------------------ EVENTS ------------------------------ */
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const act = el.dataset.action, id = el.dataset.id;
  if (el.tagName === 'A') e.preventDefault();
  switch (act) {
    case 'tab': state.tab = el.dataset.tab; state.filter = 'active'; render(); window.scrollTo(0, 0); break;
    case 'filter': state.filter = el.dataset.f; render(); break;
    case 'period': state.period = el.dataset.p; render(); break;
    case 'new': showModal(accountForm(null)); break;
    case 'open': await openAccount(id); break;
    case 'edit': { const a = state.accounts.find((x) => x.id === id); await signUrls(a.images || []); showModal(accountForm(a)); break; }
    case 'sell': sellForm(id); break;
    case 'unsell': await updateAcc(id, { status: 'active', sold_price: null, sold_at: null, partner_paid: false }, 'Sotuvga qaytarildi'); break;
    case 'togglepaid': { const a = state.accounts.find((x) => x.id === id); await updateAcc(id, { partner_paid: !a.partner_paid }, 'Yangilandi'); break; }
    case 'delete': await deleteAcc(id); break;
    case 'close': closeModal(); break;
    case 'rm-img': el.closest('.tb').remove(); break;
    case 'logout': await sb.auth.signOut(); state.accounts = []; state.urls = {}; loginView(); break;
    case 'to-signup': loginView('up'); break;
    case 'to-login': loginView('in'); break;
    case 'export': exportJson(); break;
    case 'mfa-status': await mfaStatus(); break;
    case 'mfa-on': await mfaEnroll(); break;
    case 'mfa-off': if (confirm("2FA o'chirilsinmi?")) { const { error } = await sb.auth.mfa.unenroll({ factorId: id }); toast(error ? error.message : "2FA o'chirildi"); await mfaStatus(); } break;
  }
});

document.addEventListener('change', (e) => {
  if (e.target.name === 'kind') {
    e.target.closest('.seg').querySelectorAll('label').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
    $('#partner-wrap').classList.toggle('hidden', e.target.value !== 'partner');
  }
});
document.addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]'); if (!form) return;
  e.preventDefault();
  const t = form.dataset.form, f = new FormData(form), lerr = $('#lerr');
  if (t === 'account') return saveAccount(form);
  if (t === 'sell') {
    const price = num(f.get('sold_price'));
    if (!price) { $('#ferr').textContent = 'Narxni kiriting'; return; }
    return updateAcc(form.dataset.id, { status: 'sold', sold_price: price, sold_at: String(f.get('sold_at')) }, 'Sotuv yozildi ✅');
  }
  if (t === 'login' || t === 'signup') {
    const creds = { email: String(f.get('email')).trim(), password: String(f.get('password')) };
    const { error } = t === 'login' ? await sb.auth.signInWithPassword(creds) : await sb.auth.signUp(creds);
    if (error) { lerr.textContent = t === 'login' ? "Email yoki parol noto'g'ri" : error.message; return; }
    if (t === 'signup') { lerr.textContent = "Emailingizga tasdiqlash xati yuborildi."; return; }
    return boot();
  }
  if (t === 'mfa' || t === 'mfa-enroll') {
    const factorId = form.dataset.factor;
    const ch = await sb.auth.mfa.challenge({ factorId });
    if (ch.error) { lerr.textContent = ch.error.message; return; }
    const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code: String(f.get('code')).trim() });
    if (v.error) { lerr.textContent = "Kod noto'g'ri"; return; }
    if (t === 'mfa') return boot();
    toast('2FA yoqildi ✅'); render();
  }
});

sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { state.user = null; loginView(); } });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
boot();
