// Sana oralig'ini kalendardan tanlash: 1-bosish = boshlanish (avtomatik), 2-bosish = tugash; oraliq boshqa rangda ko'rinadi.
// root ichida ikkita <input type=date> bo'lishi kerak (nomlari bilan beriladi): ular bilan ikki tomonlama sinxron.
import { MONTHS, todayISO } from '../core/format.js';
import { monthGrid, diffDays } from '../logic/installments.js';
import { icon } from './icons.js';

const WD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export const rangePickerHtml = () => `<div class="rp"><div class="cal-head"><button type="button" class="icon-btn" data-rp="-1" aria-label="Oldingi oy">${icon('left', 20)}</button><b data-rp-title></b><button type="button" class="icon-btn" data-rp="1" aria-label="Keyingi oy">${icon('right', 20)}</button></div>
  <div class="cal-grid" data-rp-grid></div><p class="rp-hint" data-rp-hint aria-live="polite"></p></div>`;

export function mountRangePicker(form, { start, end, onChange }) {
  const rp = form.querySelector('.rp');
  const si = form.elements[start];
  const ei = form.elements[end];
  const base = si.value ? new Date(si.value + 'T00:00:00') : new Date();
  let y = base.getFullYear();
  let m = base.getMonth();
  let phase = 'start'; // keyingi bosish nimani belgilaydi

  const paint = () => {
    const s = si.value;
    const e = ei.value;
    rp.querySelector('[data-rp-title]').textContent = `${MONTHS[m]} ${y}`;
    rp.querySelector('[data-rp-grid]').innerHTML =
      WD.map((d) => `<span class="cal-wd">${d}</span>`).join('') +
      monthGrid(y, m)
        .map((c) => {
          const inR = s && e && c.iso >= s && c.iso <= e;
          const cls = ['cal-cell', c.inMonth ? '' : 'out', c.iso === todayISO() ? 'today' : '', inR ? 'in-range' : '', c.iso === s ? 'range-start' : '', c.iso === e ? 'range-end' : ''].join(' ');
          return `<button type="button" class="${cls}" data-rp-day="${c.iso}"><span>${Number(c.iso.slice(8))}</span></button>`;
        })
        .join('');
    const days = s && e && e >= s ? diffDays(e, s) + 1 : 0;
    rp.querySelector('[data-rp-hint]').textContent = phase === 'end' && s ? `Tugash sanasini bosing${days ? ` · tanlangan davr: ${days} kun` : ''}` : 'Boshlanish sanasini bosing';
  };

  const set = (input, v) => {
    input.value = v;
  };
  rp.addEventListener('click', (ev) => {
    const nav = ev.target.closest('[data-rp]');
    if (nav) {
      const d = new Date(y, m + Number(nav.dataset.rp), 1);
      y = d.getFullYear();
      m = d.getMonth();
      return paint();
    }
    const day = ev.target.closest('[data-rp-day]')?.dataset.rpDay;
    if (!day) return;
    if (phase === 'start' || !si.value || day < si.value) {
      set(si, day); // boshlanish avtomatik olinadi
      set(ei, day);
      phase = 'end';
    } else {
      set(ei, day); // tugash: oraliq bo'yalanadi
      phase = 'start';
    }
    paint();
    form.dispatchEvent(new Event('input', { bubbles: true }));
    onChange?.();
  });
  const resync = () => paint();
  si.addEventListener('change', resync);
  ei.addEventListener('change', resync);
  paint();
}
