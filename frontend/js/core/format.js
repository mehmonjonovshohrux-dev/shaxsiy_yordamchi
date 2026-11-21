// Pul, sana va raqam formatlari.
export const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
export const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export const num = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;
export const group = (n, sep = ' ') => String(Math.abs(Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
export const som = (n) => `${n < 0 ? '−' : ''}${group(n)} so'm`;
export const signedSom = (n) => `${n > 0 ? '+' : ''}${som(n)}`;

export function short(n) {
  const a = Math.abs(n || 0);
  const s = n < 0 ? '−' : '';
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1).replace(/\.0$/, '')}m`;
  if (a >= 1e3) return `${s}${Math.round(a / 1e3)}k`;
  return `${s}${a}`;
}

export const pad = (n) => String(n).padStart(2, '0');
export const todayISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDate(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function dateUz(s) {
  if (!s) return '';
  const d = parseDate(s);
  return `${d.getDate()}-${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export const daysSince = (s, now = new Date()) => Math.max(0, Math.floor((now - parseDate(s)) / 864e5));

export function agoUz(s, now = new Date()) {
  const d = daysSince(s, now);
  if (d === 0) return 'bugun';
  if (d === 1) return 'kecha';
  if (d < 30) return `${d} kun oldin`;
  if (d < 365) return `${Math.floor(d / 30)} oy oldin`;
  return `${Math.floor(d / 365)} yil oldin`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}
