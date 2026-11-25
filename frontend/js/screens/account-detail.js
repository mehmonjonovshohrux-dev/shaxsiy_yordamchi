// Akkaunt tafsilotlari oynasi: rasmlar, narxlar, foyda taqsimoti, amallar
import { esc } from '../core/dom.js';
import { findAccount } from '../core/store.js';
import { som, signedSom, dateUz } from '../core/format.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet, confirmDialog } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { closeTop, dropOverlays } from '../core/router.js';
import { calc } from '../logic/finance.js';
import { thumbPath, hydrate, removeFiles } from '../services/images.service.js';
import { deleteAccount, unsell, setPartnerPaid } from '../services/accounts.service.js';
import { loadSecret } from '../services/secrets.service.js';
import { CONFIG } from '../config.js';
import { requirePin } from '../ui/pin-gate.js';
import { renderTab } from './shell.js';
import { openAccountForm } from './account-form.js';
import { openSellForm } from './sell.js';
import { openGallery } from './gallery.js';

function detailHtml(a) {
  const c = calc(a);
  const sold = a.status === 'sold';
  const imgs = a.images || [];
  return `
  ${
    imgs.length
      ? `<div class="gal">${imgs.map((p, i) => `<button type="button" class="gal-item" data-act="open-gallery-acc" data-id="${esc(a.id)}" data-i="${i}" aria-label="Rasmni ochish"><img data-path="${esc(thumbPath(p))}" data-orig="${esc(p)}" alt="" decoding="async"></button>`).join('')}</div>`
      : `<div class="gal-empty">${icon('image', 28)}<span>Rasm qo'shilmagan</span></div>`
  }
  <div class="badges mb"><span class="badge ${sold ? 'sold' : ''}">${sold ? 'Sotilgan' : 'Sotuvda'}</span>${a.kind === 'partner' ? '<span class="badge p">50/50</span>' : '<span class="badge">Shaxsiy</span>'}</div>
  <div class="card list">
    <div class="kv"><span>O'yin</span><b>${esc(a.game) || '—'}</b></div>
    ${a.kind === 'partner' ? `<div class="kv"><span>Sherik</span><b>${esc(a.partner_name) || '—'}</b></div>` : ''}
    <div class="kv"><span>Sotib olingan narx</span><b>${som(a.buy_price)}</b></div>
    <div class="kv"><span>Taxminiy narx</span><b>${som(a.est_price)}</b></div>
    ${sold ? `<div class="kv"><span>Sotilgan narx</span><b>${som(a.sold_price)}</b></div><div class="kv"><span>Sotilgan sana</span><b>${esc(dateUz(a.sold_at))}</b></div>${a.buyer ? `<div class="kv"><span>Xaridor</span><b>${esc(a.buyer)}</b></div>` : ''}` : ''}
    <div class="kv total"><span>${sold ? 'Foyda' : 'Kutilayotgan foyda'}${a.kind === 'partner' ? ' (sizga)' : ''}</span><b class="${c.my < 0 ? 'neg' : 'pos'}">${signedSom(c.my)}</b></div>
    ${a.kind === 'partner' ? `<div class="kv"><span>Sherik ulushi${sold ? (a.partner_paid ? " · to'langan ✅" : " · to'lanmagan") : ''}</span><b>${som(c.partner)}</b></div>` : ''}
    ${a.notes ? `<div class="kv col"><span>Izoh</span><p class="notes">${esc(a.notes)}</p></div>` : ''}
  </div>
  <div class="card secret-card" id="secret-card">
    <div class="card-title">${icon('lock', 18)} Kirish ma'lumotlari</div>
    <p class="muted small">Login va parol faqat siz «Ko'rsatish»ni bosganingizda ochiladi.</p>
    <button type="button" class="btn ghost block" data-act="secret-show" data-id="${esc(a.id)}">${icon('eye', 18)} Ko'rsatish</button>
  </div>
  <div class="btn-grid">
    ${sold ? `<button type="button" class="btn" data-act="do-sell" data-id="${esc(a.id)}">${icon('edit', 18)} Sotuvni tahrirlash</button><button type="button" class="btn ghost" data-act="do-unsell" data-id="${esc(a.id)}">↩ Sotuvga qaytarish</button>` : `<button type="button" class="btn" data-act="do-sell" data-id="${esc(a.id)}">${icon('check', 18)} Sotildi</button>`}
    ${a.kind === 'partner' && sold ? `<button type="button" class="btn ghost" data-act="do-paid" data-id="${esc(a.id)}">${a.partner_paid ? "To'lanmagan deb belgilash" : "Sherikka to'landi"}</button>` : ''}
    <button type="button" class="btn ghost" data-act="do-edit" data-id="${esc(a.id)}">${icon('edit', 18)} Tahrirlash</button>
    <button type="button" class="btn ghost" data-act="do-copy-ad" data-id="${esc(a.id)}">${icon('copy', 18)} E'lon matni</button>
    <button type="button" class="btn danger-ghost" data-act="do-delete" data-id="${esc(a.id)}">${icon('trash', 18)} O'chirish</button>
  </div>`;
}

export function openAccount(id) {
  const a = findAccount(id);
  if (!a) return;
  const ctl = openSheet({ title: a.title, size: 'full', html: detailHtml(a), onClose: () => { clearTimeout(secretTimer); secretCache = null; } });
  hydrate(ctl.body);
}

let secretTimer = null;
let secretCache = null;
const SECRET_FIELDS = [['login', 'Login / email'], ['password', 'Parol'], ['extra', "Qo'shimcha"]];

function secretHtml(d, id) {
  const rows = SECRET_FIELDS.filter(([k]) => d[k])
    .map(([k, l]) => `<div class="kv"><span>${l}</span><b class="secret-val">${esc(d[k])}</b><button type="button" class="icon-btn" data-act="secret-copy" data-k="${k}" aria-label="${l} nusxalash">${icon('copy', 18)}</button></div>`)
    .join('');
  return `<div class="card-title">${icon('lock', 18)} Kirish ma'lumotlari</div>
    ${rows || '<p class="muted small">Kiritilmagan. «Tahrirlash» orqali qo\'shishingiz mumkin.</p>'}
    <p class="muted xs">${CONFIG.SECRET_REVEAL_MS / 1000} soniyadan keyin avtomatik yashiriladi.</p>
    <button type="button" class="btn ghost block" data-act="secret-hide" data-id="${esc(id)}">${icon('eyeoff', 18)} Yashirish</button>`;
}
function hideSecret(id) {
  clearTimeout(secretTimer);
  secretCache = null;
  const card = document.getElementById('secret-card');
  if (!card) return;
  card.innerHTML = `<div class="card-title">${icon('lock', 18)} Kirish ma'lumotlari</div>
    <p class="muted small">Login va parol faqat siz «Ko'rsatish»ni bosganingizda ochiladi.</p>
    <button type="button" class="btn ghost block" data-act="secret-show" data-id="${esc(id)}">${icon('eye', 18)} Ko'rsatish</button>`;
}

const adText = (a) =>
  [`🎮 ${a.game ? `${a.game} akkaunt` : 'Akkaunt'}: ${a.title}`, `💰 Narxi: ${som(a.est_price)}`, '📩 Sotib olish uchun yozing'].join('\n');

registerActions({
  'secret-show': async (el) => {
    const id = el.dataset.id;
    if (!(await requirePin('Parolni ko\'rish uchun PIN'))) return;
    el.disabled = true;
    try {
      secretCache = await loadSecret(id);
      document.getElementById('secret-card').innerHTML = secretHtml(secretCache, id);
      clearTimeout(secretTimer);
      secretTimer = setTimeout(() => hideSecret(id), CONFIG.SECRET_REVEAL_MS);
    } catch (e) {
      console.error(e);
      el.disabled = false;
      toast("Yuklab bo'lmadi. Internetni tekshiring.", { type: 'error' });
    }
  },
  'secret-hide': (el) => hideSecret(el.dataset.id),
  'secret-copy': async (el) => {
    const v = secretCache?.[el.dataset.k];
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      toast('Nusxalandi (30 soniyadan keyin buferdan o\'chiriladi)');
      setTimeout(() => navigator.clipboard.writeText(' ').catch(() => {}), 30000);
    } catch {
      toast("Nusxalab bo'lmadi", { type: 'error' });
    }
  },
  'open-account': (el) => openAccount(el.dataset.id),
  'open-gallery-acc': (el) => {
    const a = findAccount(el.dataset.id);
    if (a) openGallery(a.images, Number(el.dataset.i || 0));
  },
  'do-edit': (el) => openAccountForm(el.dataset.id),
  'do-sell': (el) => openSellForm(el.dataset.id),
  'do-copy-ad': async (el) => {
    const a = findAccount(el.dataset.id);
    try {
      await navigator.clipboard.writeText(adText(a));
      toast("E'lon matni nusxalandi");
    } catch {
      toast("Nusxalab bo'lmadi", { type: 'error' });
    }
  },
  'do-unsell': async (el) => {
    const id = el.dataset.id;
    if (!(await confirmDialog({ title: 'Sotuvga qaytarilsinmi?', text: "Sotilgan narx va sana o'chiriladi, akkaunt yana «Sotuvda» bo'ladi.", ok: 'Qaytarish' }))) return;
    await unsell(id);
    dropOverlays();
    renderTab();
    toast('Sotuvga qaytarildi');
  },
  'do-paid': async (el) => {
    const a = findAccount(el.dataset.id);
    await setPartnerPaid(a.id, !a.partner_paid);
    dropOverlays();
    renderTab();
    toast(a.partner_paid ? "Sherikka to'langan deb belgilandi" : "To'lanmagan deb belgilandi");
  },
  'do-delete': async (el) => {
    const a = findAccount(el.dataset.id);
    if (!(await confirmDialog({ title: "O'chirilsinmi?", text: `«${a.title}» va uning rasmlari butunlay o'chiriladi. Qaytarib bo'lmaydi.`, ok: "O'chirish", danger: true }))) return;
    if (a.images?.length) removeFiles(a.images).catch(() => {});
    await deleteAccount(a.id);
    dropOverlays();
    renderTab();
    toast("Akkaunt o'chirildi");
  },
});

export { closeTop };
