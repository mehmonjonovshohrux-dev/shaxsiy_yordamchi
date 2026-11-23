// "Ulangan qurilmalar": ro'yxat, oxirgi faollik, joylashuv (GPS, ixtiyoriy), chiqarish
import { esc } from '../core/dom.js';
import { getState } from '../core/store.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet, confirmDialog } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { dateUz } from '../core/format.js';
import { mapUrl, hasLoc, lastSeenUz } from '../logic/devices.js';
import * as dev from '../services/devices.service.js';
import * as auth from '../services/auth.service.js';

let ctl = null;

const locHtml = (d) =>
  hasLoc(d)
    ? `<a class="dev-loc" href="${esc(mapUrl(d.lat, d.lng))}" target="_blank" rel="noopener noreferrer">${icon('pin', 15)} Xaritada ko'rish</a> <small class="muted">${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}${d.accuracy ? ` · ±${Math.round(d.accuracy)} m` : ''} · ${esc(lastSeenUz(d.loc_at))}</small>`
    : `<small class="muted">Joylashuv saqlanmagan</small>`;

function card(d, curId) {
  const cur = d.device_id === curId;
  return `<div class="card dev ${d.revoked ? 'revoked' : ''}">
    <div class="dev-top"><span class="set-ic">${icon(/iPhone|Android|iPad/.test(d.name) ? 'phone' : 'monitor', 20)}</span>
      <span class="set-tx"><b>${esc(d.name || 'Qurilma')}</b><small>${cur ? 'Shu qurilma · ' : ''}${esc(lastSeenUz(d.last_seen))} · birinchi kirish ${esc(dateUz(String(d.first_seen).slice(0, 10)))}</small></span>
      ${cur ? '<span class="badge ok">Shu qurilma</span>' : d.revoked ? '<span class="badge bad">Chiqarilgan</span>' : ''}</div>
    <div class="dev-loc-row">${locHtml(d)}</div>
    ${cur || d.revoked ? '' : `<button type="button" class="btn sm danger-ghost" data-act="dev-revoke" data-id="${esc(d.id)}">${icon('logout', 16)} Chiqarish</button>`}
    ${d.revoked ? `<button type="button" class="btn sm ghost" data-act="dev-forget" data-id="${esc(d.id)}">Ro'yxatdan olib tashlash</button>` : ''}
  </div>`;
}

function html() {
  const st = getState();
  const curId = dev.deviceId();
  const geo = dev.geoEnabled(st.user.id);
  if (!st.devicesReady) {
    return `<p class="tip warn"><span class="tip-ic">${icon('alert', 18)}</span><span class="tip-tx">Qurilmalar ro'yxati yoqilmagan: Supabase'da <b>009_devices.sql</b> (yoki 000_hammasi.sql) ni ishga tushiring.</span></p>`;
  }
  const list = [...st.devices].sort((a, b) => (a.device_id === curId ? -1 : b.device_id === curId ? 1 : 0));
  return `
  <p class="muted small">Hisobingizga kirgan qurilmalar. Notanish qurilma ko'rsangiz, uni chiqaring va parolni almashtiring.</p>
  <div class="card list">
    <div class="set-row"><span class="set-ic">${icon('pin', 20)}</span><span class="set-tx"><b>Shu qurilmaning joylashuvi (GPS)</b><small>Ilova ochilganda oxirgi joy saqlanadi. Telefoningiz ruxsat so'raydi.</small></span>
      <span class="set-right"><button type="button" class="switch ${geo ? 'on' : ''}" role="switch" aria-checked="${geo}" data-act="dev-geo"><i></i></button></span></div>
  </div>
  <h2 class="sec-title">Qurilmalar (${list.length})</h2>
  ${list.map((d) => card(d, curId)).join('') || '<p class="muted">Hozircha ro\'yxat bo\'sh.</p>'}
  <button type="button" class="btn danger-ghost block mt" data-act="sec-signout-others">${icon('logout', 18)} Boshqa barcha qurilmalardan chiqarish</button>
  <p class="muted xs">Joylashuv faqat qurilmada ilova ochilganda yangilanadi: bu jonli kuzatuv emas va yo'qolgan telefonni topish uchun emas. «Chiqarish» tugmasi qurilmani keyingi ochilishida tizimdan chiqaradi; darhol va to'liq chiqarish uchun pastdagi tugmani bosing.</p>`;
}

function repaint() {
  if (ctl && ctl.body.isConnected) ctl.body.innerHTML = html();
}

export async function openDevices() {
  ctl = openSheet({ title: 'Ulangan qurilmalar', size: 'full', html: html(), onClose: () => (ctl = null) });
  try {
    await dev.loadDevices();
  } catch (e) {
    console.warn(e);
  }
  repaint();
}

registerActions({
  'open-devices': () => openDevices(),
  'dev-geo': async (el) => {
    const on = el.getAttribute('aria-checked') !== 'true';
    try {
      await dev.setLocationTracking(on);
      toast(on ? 'Joylashuv yoqildi ✅' : "Joylashuv o'chirildi");
    } catch (e) {
      console.warn(e);
      toast("Joylashuvga ruxsat berilmadi. Telefon sozlamalarida ruxsat bering", { type: 'error' });
    }
    repaint();
  },
  'dev-revoke': async (el) => {
    if (!(await confirmDialog({ title: 'Qurilma chiqarilsinmi?', text: "U keyingi safar ilovani ochganda tizimdan chiqadi.", ok: 'Chiqarish', danger: true }))) return;
    try {
      await dev.revokeDevice(el.dataset.id);
      toast('Qurilma chiqarildi ✅');
    } catch {
      toast("Bajarib bo'lmadi", { type: 'error' });
    }
    repaint();
  },
  'dev-forget': async (el) => {
    try {
      await dev.forgetDevice(el.dataset.id);
    } catch {
      toast("Bajarib bo'lmadi", { type: 'error' });
    }
    repaint();
  },
});
