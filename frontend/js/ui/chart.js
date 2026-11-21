// Oddiy ustunli grafik (SVG, tashqi kutubxonasiz). Hamma o'lcham atributlarda: CSP uchun qulay.
import { esc } from '../core/dom.js';
import { short } from '../core/format.js';

export function barChart(series, { w = 300, h = 150 } = {}) {
  const vals = series.map((s) => s.profit);
  if (!vals.some((v) => v !== 0)) return '';
  const top = 18;
  const bottom = 24;
  const area = h - top - bottom;
  const max = Math.max(0, ...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const y = (v) => top + ((max - v) / span) * area;
  const zero = y(0);
  const slot = w / series.length;
  const bw = Math.min(30, slot - 14);

  const bars = series
    .map((s, i) => {
      const x = slot * i + (slot - bw) / 2;
      const yy = y(s.profit);
      const hh = Math.max(Math.abs(yy - zero), s.profit === 0 ? 0 : 2);
      const ry = s.profit >= 0 ? zero - hh : zero;
      const labelY = s.profit >= 0 ? ry - 4 : ry + hh + 10;
      return `<g>
        <rect class="bar ${s.profit < 0 ? 'neg' : ''}" x="${x.toFixed(1)}" y="${ry.toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}" rx="5"/>
        ${s.profit !== 0 ? `<text class="bar-val" x="${(x + bw / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle">${esc(short(s.profit))}</text>` : ''}
        <text class="bar-lbl" x="${(x + bw / 2).toFixed(1)}" y="${h - 7}" text-anchor="middle">${esc(s.label)}</text>
      </g>`;
    })
    .join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Oylik foyda grafigi"><line class="axis" x1="0" x2="${w}" y1="${zero.toFixed(1)}" y2="${zero.toFixed(1)}"/>${bars}</svg>`;
}
