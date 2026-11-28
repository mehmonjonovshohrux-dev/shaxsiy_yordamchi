// PDF: hisobot sahifaga chiziladi va brauzerning chop etish oynasi ochiladi ("PDF sifatida saqlash").
import { esc } from '../core/dom.js';

export function reportHtml(r) {
  const blocks = r.blocks
    .map((b) => {
      if (b.type === 'kpis') {
        return `<div class="pr-kpis">${b.items.map(([l, v, t]) => `<div class="pr-kpi"><span>${esc(l)}</span><b class="${t || ''}">${esc(v)}</b></div>`).join('')}</div>`;
      }
      const tone = (v) => (String(v).startsWith('−') ? 'neg' : String(v).startsWith('+') ? 'pos' : '');
      return `<h2>${esc(b.title)}</h2><table><thead><tr>${b.head.map((h, i) => `<th class="${b.align[i]}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows
        .map((row, ri) => `<tr class="${b.totalRow && ri === b.rows.length - 1 ? 'total' : ''}">${row.map((v, i) => `<td class="${b.align[i]} ${b.align[i] === 'r' ? tone(v) : ''}">${esc(v)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`;
    })
    .join('');
  return `<h1>${esc(r.title)}</h1><p class="pr-sub"><b>Davr: ${esc(r.period)}</b> · Tuzilgan sana: ${esc(r.created)}${r.owner ? ` · ${esc(r.owner)}` : ''}</p>${blocks}<p class="pr-foot">So'mda hisoblangan. Foyda: shaxsiy akkauntlarda to'liq sizga, 50/50 akkauntlarda yarmi sizga.</p>`;
}

export function printReport(r) {
  let root = document.getElementById('print-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'print-root';
    document.body.appendChild(root);
  }
  root.innerHTML = reportHtml(r);
  const done = () => {
    root.innerHTML = '';
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 60);
}
