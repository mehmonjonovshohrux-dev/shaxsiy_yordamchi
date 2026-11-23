// Muddatli to'lov maydonlari (sotuv formasi va "Rejani o'zgartirish" uchun umumiy):
//  rejim (teng qismlar / haftalik summa), kalendardan davr tanlash, sanalar, ko'rib chiqish.
import { esc } from '../core/dom.js';
import { getState } from '../core/store.js';
import { som, num, group, dateUz } from '../core/format.js';
import { schedule, diffDays } from '../logic/installments.js';
import { rangePickerHtml, mountRangePicker } from './range-picker.js';

export function instFieldsHtml({ start, end, parts = 3, weekly = 0, withFirst = false }) {
  const wk = getState().weeklyReady;
  const mode = weekly > 0 && wk ? 'weekly' : 'parts';
  return `
  ${
    wk
      ? `<div class="seg-pick mb" role="radiogroup" aria-label="To'lov usuli">
      <label class="${mode === 'parts' ? 'on' : ''}"><input type="radio" name="inst_mode" value="parts" ${mode === 'parts' ? 'checked' : ''}><span>Teng qismlar</span></label>
      <label class="${mode === 'weekly' ? 'on' : ''}"><input type="radio" name="inst_mode" value="weekly" ${mode === 'weekly' ? 'checked' : ''}><span>Haftasiga summa</span></label>
    </div>`
      : `<input type="hidden" name="inst_mode" value="parts"><p class="muted xs">Haftalik rejim uchun Supabase'da 008_installment_weekly.sql (yoki 000_hammasi.sql) ni ishga tushiring.</p>`
  }
  <div data-mode-pane="parts" ${mode === 'parts' ? '' : 'hidden'}>
    <label class="field"><span>Qismlar soni</span><input class="plain" name="inst_parts" type="number" inputmode="numeric" min="1" max="60" value="${parts}"></label>
  </div>
  <div data-mode-pane="weekly" ${mode === 'weekly' ? '' : 'hidden'}>
    <label class="field"><span>Haftasiga to'lanadigan summa</span><input class="plain" name="inst_weekly" inputmode="numeric" data-input="sell-price" value="${weekly ? group(weekly) : ''}" placeholder="0" autocomplete="off"><em>so'm</em></label>
  </div>
  <p class="muted xs">Kalendarda avval boshlanish, keyin tugash sanasini bosing: oraliq boshqa rangda ko'rinadi.</p>
  ${rangePickerHtml()}
  <div class="two">
    <label class="field"><span>Boshlanish</span><input class="plain" name="inst_start" type="date" value="${esc(start)}"></label>
    <label class="field"><span>Tugash sanasi</span><input class="plain" name="inst_end" type="date" value="${esc(end)}"></label>
  </div>
  ${withFirst ? `<label class="field"><span>Hozir olingan summa (ixtiyoriy)</span><input class="plain" name="inst_first" inputmode="numeric" data-input="sell-price" placeholder="0" autocomplete="off"><em>so'm</em></label>` : ''}
  <p class="preview" id="inst-preview" aria-live="polite"></p>`;
}

const modeOf = (form) => form.elements.inst_mode?.value || [...form.querySelectorAll('input[name=inst_mode]')].find((r) => r.checked)?.value || 'parts';

export function mountInstFields(form, getTotal) {
  mountRangePicker(form, { start: 'inst_start', end: 'inst_end' });
  const sync = () => {
    const mode = [...form.querySelectorAll('input[name=inst_mode]')].find((r) => r.checked)?.value || 'parts';
    form.querySelectorAll('[data-mode-pane]').forEach((p) => (p.hidden = p.dataset.modePane !== mode));
    form.querySelectorAll('.seg-pick label').forEach((l) => l.classList.toggle('on', !!l.querySelector('input')?.checked));
    preview(form, getTotal());
  };
  form.addEventListener('change', sync);
  form.addEventListener('input', () => preview(form, getTotal()));
  sync();
  return () => preview(form, getTotal());
}

export function preview(form, total) {
  const el = form.querySelector('#inst-preview');
  if (!el) return;
  const start = form.elements.inst_start.value;
  const end = form.elements.inst_end.value;
  if (!total || !start || !end) return void (el.textContent = '');
  if (end < start) return void (el.textContent = "Tugash sanasi boshlanishdan oldin bo'lmasin");
  const first = num(form.elements.inst_first?.value || 0);
  const tail = first ? ` · olingan: <b>${som(first)}</b>, qoldi <b>${som(Math.max(0, total - first))}</b>` : '';
  if (modeOf(form) === 'weekly') {
    const w = num(form.elements.inst_weekly.value);
    if (!w) return void (el.textContent = 'Haftalik summani kiriting');
    const sc = schedule({ start, end, parts: 1, total, weekly: w });
    const last = sc[sc.length - 1];
    el.innerHTML = `Har hafta <b>${som(w)}</b> qo'shilib boradi · ${sc.length} ta to'lov · oxirgisi ${esc(dateUz(last.due))}${last.amount !== w ? ` (${som(last.amount)})` : ''}${tail}`;
    return;
  }
  const parts = Math.max(1, Math.min(60, Number(form.elements.inst_parts.value) || 1));
  const sc = schedule({ start, end, parts, total });
  el.innerHTML = `${parts} qism · har biri ≈ <b>${som(sc[0].amount)}</b> · birinchisi ${esc(dateUz(sc[0].due))}${tail}`;
}

// Formadan o'qish va tekshirish: { inst, first } yoki { error }
export function readInst(form, fd, total) {
  const start = String(fd.get('inst_start') || '');
  const end = String(fd.get('inst_end') || '');
  const weekly = modeOf(form) === 'weekly' ? num(fd.get('inst_weekly')) : 0;
  const parts = modeOf(form) === 'weekly' ? 1 : Math.floor(Number(fd.get('inst_parts')));
  const first = num(fd.get('inst_first') || 0);
  if (!start || !end) return { error: "Muddatli to'lov sanalarini kiriting" };
  if (end < start) return { error: "Tugash sanasi boshlanishdan oldin bo'lmasin" };
  if (modeOf(form) === 'weekly') {
    if (!weekly) return { error: "Haftalik summani kiriting" };
    if (diffDays(end, start) / 7 > 520) return { error: 'Muddat juda uzun (10 yildan oshmasin)' };
  } else if (!(parts >= 1 && parts <= 60)) return { error: 'Qismlar soni 1 dan 60 gacha' };
  if (first > total) return { error: "Olingan summa sotilgan narxdan ko'p bo'lmasin" };
  return { inst: { start, end, parts, weekly }, first };
}
