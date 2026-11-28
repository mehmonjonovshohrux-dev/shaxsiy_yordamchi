// Akkaunt qo'shish / tahrirlash formasi (rasmlar bilan)
import { esc, setBusy, showFormError, $ } from '../core/dom.js';
import { CONFIG } from '../config.js';
import { getState, findAccount } from '../core/store.js';
import { num, group, signedSom } from '../core/format.js';
import { registerActions, registerForms, registerInputs } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet, confirmDialog } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { closeTop, dropOverlays } from '../core/router.js';
import { calc } from '../logic/finance.js';
import { prepare, upload, removeFiles, thumbPath, hydrate } from '../services/images.service.js';
import { createAccount, updateAccount } from '../services/accounts.service.js';
import { loadSecret, saveSecret, secretHint } from '../services/secrets.service.js';
import { renderTab } from './shell.js';

// Bitta ochiq forma uchun vaqtinchalik holat
let fs = null;

const money = (v) => (v ? group(v, ' ') : '');

function thumbsHtml() {
  const items = [
    ...fs.existing.map((p, i) => ({ kind: 'old', key: p, i })),
    ...fs.added.map((a, i) => ({ kind: 'new', key: a.url || '', i, a })),
  ];
  if (!items.length) return `<p class="muted small">Hali rasm yo'q. Birinchi rasm asosiy (muqova) bo'ladi.</p>`;
  return items
    .map((it, idx) => {
      const img =
        it.kind === 'old'
          ? `<img data-path="${esc(thumbPath(it.key))}" data-orig="${esc(it.key)}" alt="">`
          : it.a.previewable
            ? `<img src="${esc(it.key)}" alt="">`
            : `<span class="ph">${icon('file', 22)}<small>${esc(it.a.ext.toUpperCase())}</small></span>`;
      return `<div class="tb ${idx === 0 ? 'cover' : ''}" data-kind="${it.kind}" data-i="${it.i}">
        ${img}
        ${idx === 0 ? '<span class="cover-tag">Muqova</span>' : `<button type="button" class="tb-btn star" data-act="img-cover" data-kind="${it.kind}" data-i="${it.i}" aria-label="Muqova qilish">${icon('star', 14)}</button>`}
        <button type="button" class="tb-btn x" data-act="img-remove" data-kind="${it.kind}" data-i="${it.i}" aria-label="Rasmni olib tashlash">${icon('x', 14)}</button>
      </div>`;
    })
    .join('');
}

function paintThumbs() {
  const host = $('#img-thumbs');
  if (!host) return;
  host.innerHTML = thumbsHtml();
  hydrate(host);
  const cnt = $('#img-count');
  if (cnt) cnt.textContent = `${fs.existing.length + fs.added.length} / ${CONFIG.MAX_IMAGES}`;
}

function preview() {
  const f = $('form[data-form=account]');
  if (!f) return;
  const kind = f.elements.kind.value;
  const buy = num(f.elements.buy_price.value);
  const est = num(f.elements.est_price.value);
  const c = calc({ kind, status: 'active', buy_price: buy, est_price: est });
  const el = $('#form-preview');
  if (!el) return;
  if (!est) {
    el.textContent = '';
    return;
  }
  el.innerHTML = `Kutilayotgan foyda${kind === 'partner' ? ' (sizga, 50%)' : ''}: <b class="${c.my < 0 ? 'neg' : 'pos'}">${signedSom(c.my)}</b>`;
}

export function openAccountForm(id = null, kind = null) {
  const a = id ? findAccount(id) : null;
  const k = a?.kind || kind || (getState().tab === 'partner' ? 'partner' : 'own');
  fs = { secretLoaded: !a, secretFailed: false, id: a?.id || null, existing: [...(a?.images || [])], added: [], removed: [], dirty: false, force: false, saving: false };

  const ctl = openSheet({
    title: a ? 'Akkauntni tahrirlash' : "Yangi akkaunt",
    size: 'full',
    html: `
    <form data-form="account" novalidate>
      <div class="seg-pick" role="radiogroup" aria-label="Turi">
        <label class="${k === 'own' ? 'on' : ''}"><input type="radio" name="kind" value="own" ${k === 'own' ? 'checked' : ''} data-change="kind-change"><span>${icon('user', 18)} Shaxsiy</span></label>
        <label class="${k === 'partner' ? 'on' : ''}"><input type="radio" name="kind" value="partner" ${k === 'partner' ? 'checked' : ''} data-change="kind-change"><span>${icon('users', 18)} 50/50</span></label>
      </div>

      <label class="field"><span>Nomi / ID <i class="req">*</i></span>
        <input class="plain" name="title" required maxlength="120" value="${esc(a?.title)}" placeholder="Masalan: PUBG lvl 60, 5 ta skin" autocomplete="off"></label>
      <div id="partner-wrap" ${k === 'partner' ? '' : 'hidden'}>
        <label class="field"><span>Sherik ismi</span>
          <input class="plain" name="partner_name" maxlength="60" value="${esc(a?.partner_name)}" placeholder="Foydaning yarmi shu odamga" autocomplete="off"></label>
      </div>
      <div class="two">
        <label class="field"><span>Sotib olingan narx</span>
          <input class="plain" name="buy_price" inputmode="numeric" data-input="money-preview" value="${money(a?.buy_price)}" placeholder="0" autocomplete="off"><em>so'm</em></label>
        <label class="field"><span>Taxminiy sotuv narxi</span>
          <input class="plain" name="est_price" inputmode="numeric" data-input="money-preview" value="${money(a?.est_price)}" placeholder="0" autocomplete="off"><em>so'm</em></label>
      </div>
      <p class="preview" id="form-preview" aria-live="polite"></p>

      <fieldset class="secret-box">
        <legend>${icon('lock', 16)} Akkaunt kirish ma'lumotlari</legend>
        <p class="muted xs" id="secret-note">${a ? 'Yuklanmoqda…' : "Faqat siz ko'rasiz: ro'yxatlarda va hisobotda chiqmaydi."}</p>
        <label class="field"><span>Login / email</span><input class="plain" name="s_login" maxlength="300" autocomplete="off" autocapitalize="none" spellcheck="false" ${a ? 'disabled' : ''}></label>
        <label class="field"><span>Parol</span>
          <div class="input-wrap"><input class="plain" name="s_password" type="password" maxlength="300" autocomplete="new-password" spellcheck="false" ${a ? 'disabled' : ''}><button type="button" class="eye" data-act="toggle-pw" aria-label="Ko'rsatish / yashirish">${icon('eye', 18)}</button></div></label>
        <label class="field"><span>Qo'shimcha (bog'langan email, kod, savol-javob…)</span><textarea class="plain" name="s_extra" maxlength="2000" ${a ? 'disabled' : ''}></textarea></label>
      </fieldset>

      <div class="field-head"><span>Rasmlar</span><span class="muted small" id="img-count"></span></div>
      <div class="thumbs" id="img-thumbs"></div>
      <div class="pick-row">
        <label class="btn ghost file-btn">${icon('image', 18)} Galereya
          <input type="file" accept="image/*" multiple hidden data-change="pick-images">
        </label>
        <label class="btn ghost file-btn">${icon('camera', 18)} Kamera
          <input type="file" accept="image/*" capture="environment" hidden data-change="pick-images">
        </label>
        <label class="btn ghost file-btn">${icon('folder', 18)} Fayl
          <input type="file" accept="image/*,.heic,.heif,.avif,.jxl,.dng,.raw,.cr2,.nef,.arw,.svg,.ico,.tif,.tiff,.bmp,.jp2,.psd" multiple hidden data-change="pick-images">
        </label>
      </div>
      <p class="muted xs">Har qanday rasm formati qabul qilinadi. Asl sifat saqlanadi (juda katta rasm ${CONFIG.DOWNSCALE_OVER_MB} MB dan oshsa, sifati deyarli yo'qolmasdan kichraytiriladi).</p>

      <progress id="up-progress" max="100" value="0" hidden></progress>
      <p class="form-error" role="alert" hidden></p>
      <div class="btn-row sticky"><button type="button" class="btn ghost" data-act="form-cancel">Bekor qilish</button><button type="submit" class="btn">Saqlash</button></div>
    </form>`,
    guard: () => fs && fs.dirty && !fs.force && !fs.saving,
    onBlocked: async () => {
      const ok = await confirmDialog({ title: 'Chiqilsinmi?', text: "Kiritilgan o'zgarishlar saqlanmaydi.", ok: 'Chiqish', cancel: 'Davom etish', danger: true });
      if (ok) {
        fs.force = true;
        closeTop();
      }
    },
    onClose: () => {
      fs?.added.forEach((x) => x.url && URL.revokeObjectURL(x.url));
      fs = null;
    },
  });
  const form = ctl.body.querySelector('form');
  form.addEventListener('input', () => {
    if (fs) fs.dirty = true;
  });
  paintThumbs();
  preview();
  if (a) loadSecretInto(form, a.id);
}

async function loadSecretInto(form, id) {
  const note = $('#secret-note');
  try {
    const d = await loadSecret(id);
    if (!fs || fs.id !== id) return;
    form.elements.s_login.value = d.login || '';
    form.elements.s_password.value = d.password || '';
    form.elements.s_extra.value = d.extra || '';
    fs.secretLoaded = true;
    if (note) note.textContent = "Faqat siz ko'rasiz: ro'yxatlarda va hisobotda chiqmaydi.";
  } catch (e) {
    console.error(e);
    if (fs) fs.secretFailed = true; // yuklanmadi: mavjud ma'lumotni bosib yubormaslik uchun saqlanmaydi
    if (note) note.textContent = "Kirish ma'lumotlarini yuklab bo'lmadi. Bu maydonlar saqlanmaydi.";
    return;
  }
  ['s_login', 's_password', 's_extra'].forEach((n) => (form.elements[n].disabled = false));
}

registerInputs({
  'money-preview': (el) => {
    const d = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
    el.value = d ? group(Number(d), ' ') : '';
    preview();
  },
  'kind-change': (el) => {
    const form = el.closest('form');
    form.querySelectorAll('.seg-pick label').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
    $('#partner-wrap').hidden = el.value !== 'partner';
    preview();
  },
  'pick-images': async (el) => {
    const files = Array.from(el.files || []);
    el.value = '';
    if (!fs || !files.length) return;
    const form = $('form[data-form=account]');
    showFormError(form, '');
    const room = CONFIG.MAX_IMAGES - fs.existing.length - fs.added.length;
    if (files.length > room) toast(`Faqat ${Math.max(room, 0)} ta rasm qo'shish mumkin (jami ${CONFIG.MAX_IMAGES})`, { type: 'error' });
    const errors = [];
    for (const f of files.slice(0, Math.max(room, 0))) {
      try {
        const p = await prepare(f);
        p.url = p.thumb || p.previewable ? URL.createObjectURL(p.thumb || p.main) : '';
        fs.added.push(p);
        fs.dirty = true;
      } catch (e) {
        errors.push(e.message);
      }
    }
    if (errors.length) showFormError(form, errors.join(' '));
    paintThumbs();
  },
});

const pick = (kind, i) => (kind === 'old' ? fs.existing : fs.added)[Number(i)];

registerActions({
  'new-account': () => openAccountForm(),
  'form-cancel': () => closeTop(),
  'img-remove': (el) => {
    const { kind, i } = el.dataset;
    if (kind === 'old') {
      fs.removed.push(fs.existing[Number(i)]);
      fs.existing.splice(Number(i), 1);
    } else {
      const [x] = fs.added.splice(Number(i), 1);
      if (x?.url) URL.revokeObjectURL(x.url);
    }
    fs.dirty = true;
    paintThumbs();
  },
  'img-cover': (el) => {
    const { kind, i } = el.dataset;
    const list = kind === 'old' ? fs.existing : fs.added;
    const [it] = list.splice(Number(i), 1);
    // muqova = eng birinchi eski rasm; yangilar saqlashda oxiriga qo'shiladi, shuning uchun tartibni birlashtiramiz
    if (kind === 'old') fs.existing.unshift(it);
    else {
      fs.added.unshift(it);
      fs.coverNew = true;
    }
    fs.dirty = true;
    paintThumbs();
  },
});

registerForms({
  account: async (form, fd) => {
    if (!fs) return;
    const title = String(fd.get('title')).trim();
    if (!title) return showFormError(form, 'Nomini kiriting');
    const kind = fd.get('kind') === 'partner' ? 'partner' : 'own';
    const buy = num(fd.get('buy_price'));
    const est = num(fd.get('est_price'));
    if (est > 0 && est < buy && !(await confirmDialog({ title: 'Zarar bo\'ladi', text: 'Taxminiy narx sotib olingan narxdan past. Baribir saqlaymizmi?', ok: 'Saqlash' }))) return;

    const user = getState().user;
    const id = fs.id || crypto.randomUUID();
    const prog = $('#up-progress');
    fs.saving = true;
    showFormError(form, '');
    setBusy(form, true, 'Saqlanmoqda…');
    const uploaded = [];
    try {
      if (fs.added.length) {
        prog.hidden = false;
        let done = 0;
        for (const p of fs.added) {
          uploaded.push(await upload(user.id, id, p));
          prog.value = Math.round((++done / fs.added.length) * 100);
        }
      }
      // yangi rasmlar muqova bo'lishi so'ralgan bo'lsa, ular boshiga qo'yiladi
      const images = fs.coverNew ? [...uploaded, ...fs.existing] : [...fs.existing, ...uploaded];
      const row = {
        title,
        kind,
        partner_name: kind === 'partner' ? String(fd.get('partner_name') || '').trim() : '',
        buy_price: buy,
        est_price: est,
        images,
      };
      const isNew = !fs.id;
      if (isNew) await createAccount({ id, user_id: user.id, ...row });
      else await updateAccount(id, row);
      if (fs.secretLoaded && !fs.secretFailed) {
        try {
          await saveSecret(id, { login: String(fd.get('s_login') || '').trim(), password: String(fd.get('s_password') || ''), extra: String(fd.get('s_extra') || '').trim() });
        } catch (e) {
          console.error(e);
          toast(`Akkaunt saqlandi, lekin kirish ma'lumotlari saqlanmadi. ${secretHint(e)}`, { type: 'error', ms: 9000 });
        }
      }
      if (fs.removed.length) removeFiles(fs.removed).catch(() => {});
      fs.force = true;
      fs.saving = false;
      dropOverlays();
      renderTab();
      toast(isNew ? "Akkaunt qo'shildi ✅" : 'Saqlandi ✅');
    } catch (e) {
      console.error(e);
      if (uploaded.length) removeFiles(uploaded).catch(() => {}); // yarim yuklangan rasmlarni tozalaymiz
      fs.saving = false;
      prog.hidden = true;
      setBusy(form, false);
      showFormError(form, navigator.onLine ? `Saqlab bo'lmadi: ${e.message || 'xatolik'}` : "Internet yo'q. Aloqa tiklangach qayta urinib ko'ring.");
    }
  },
});

export { pick };
