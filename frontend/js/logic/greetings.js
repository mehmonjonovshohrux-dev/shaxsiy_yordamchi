// Bosh sahifadagi salomlashuv: har ochilganda boshqa matn (30 dan ortiq variant).
// Yangi variant qo'shish: T ro'yxatiga bitta qator. {ism} {fam} {to'liq} avtomatik almashadi.
// t: qaysi vaqtga mos (m=tong, d=kun, e=kech, n=tun, a=istalgan); need: familiya kerakmi.
const T = [
  // tong 5-11
  { t: 'm', x: 'Xayrli tong, {ism}! ☀️' },
  { t: 'm', x: 'Tongingiz xayrli bo\'lsin, {ism}. Bugun savdolar omadli kelsin' },
  { t: 'm', x: 'Assalomu alaykum, {ism}! Kun yaxshi boshlansin' },
  { t: 'm', x: 'Erta turgan yutadi, {ism} 💪' },
  { t: 'm', x: 'Hurmatli {fam}, xayrli tong!', need: 'fam' },
  // kun 11-17
  { t: 'd', x: 'Salom, {ism}! Savdolar qalay?' },
  { t: 'd', x: 'Xush kelibsiz, {ism} 👋' },
  { t: 'd', x: 'Kuningiz xayrli, {ism}!' },
  { t: 'd', x: 'Ishlar yaxshimi, {ism}?' },
  { t: 'd', x: 'Hurmatli {fam}, xush kelibsiz', need: 'fam' },
  // kech 17-22
  { t: 'e', x: 'Xayrli kech, {ism}!' },
  { t: 'e', x: 'Kun qanday o\'tdi, {ism}?' },
  { t: 'e', x: 'Bugungi natijalarni ko\'rib chiqamizmi, {ism}?' },
  { t: 'e', x: 'Kechqurun ham ishda, {ism}? Barakalla 👏' },
  { t: 'e', x: 'Kechingiz xayrli, {fam} janoblari', need: 'fam' },
  // tun 22-5
  { t: 'n', x: 'Hali uxlamadingizmi, {ism}? 🌙' },
  { t: 'n', x: 'Tungi savdogar, salom {ism}!' },
  { t: 'n', x: 'Dam olishni ham unutmang, {ism}' },
  { t: 'n', x: 'Xayrli tun, {ism}. Hisobotlar tayyor' },
  // istalgan vaqt
  { t: 'a', x: 'Qaytganingizdan xursandmiz, {ism}!' },
  { t: 'a', x: 'Salom, {to\'liq}!', need: 'fam' },
  { t: 'a', x: '{ism} {fam}, hisob-kitoblaringiz tayyor', need: 'fam' },
  { t: 'a', x: 'Yana bir foydali kun, {ism} 🚀' },
  { t: 'a', x: 'Sizni ko\'rib turganimizdan xursandmiz, {ism}' },
  { t: 'a', x: 'Marhamat, {ism}. Bugun nimani sotamiz?' },
  { t: 'a', x: 'Hurmat bilan, {fam} janoblari: xush kelibsiz', need: 'fam' },
  { t: 'a', x: 'Yangi kun — yangi imkoniyat, {ism}' },
  { t: 'a', x: 'Savdo sizniki, {ism}! 💼' },
  { t: 'a', x: 'Hamma narsa nazoratda, {ism} ✅' },
  { t: 'a', x: 'Ilova tayyor, {ism}. Boshlaymizmi?' },
  { t: 'a', x: 'Sabr va hisob-kitob — foyda kaliti, {ism}' },
  { t: 'a', x: 'Salom, {fam}! Yaxshi kun tilayman', need: 'fam' },
];

// Ma'lumotga qarab ikkinchi qator ("aqlli" ko'rinish uchun)
const SUBS = [
  (c) => c.active > 0 && `Hozir ${c.active} ta akkaunt sotuvda`,
  (c) => c.active > 0 && `Sotuvdagi akkauntlar: ${c.active} ta, band sarmoya ${c.tied}`,
  (c) => c.monthProfit > 0 && `Bu oy ${c.monthProfitText} foyda qildingiz`,
  (c) => c.monthSold > 0 && `Bu oy ${c.monthSold} ta akkaunt sotildi`,
  (c) => c.unpaid > 0 && `Sherikka to'lash kerak: ${c.unpaidText}`,
  (c) => c.stale > 0 && `${c.stale} ta akkaunt uzoq vaqtdan beri sotilmayapti`,
  (c) => c.active === 0 && "Hozircha sotuvda akkaunt yo'q, yangisini qo'shing",
  () => "Bugun ham yaxshi natijalar tilayman",
  () => "Hisobotlar va maslahatlar pastda",
  () => "Hamma ma'lumot sizning qurilmangizda himoyalangan",
];

const slot = (h) => (h >= 5 && h < 11 ? 'm' : h < 17 && h >= 11 ? 'd' : h >= 17 && h < 22 ? 'e' : 'n');

function pickIndex(n, key) {
  let last = -1;
  try {
    last = Number(localStorage.getItem(key));
  } catch {}
  let i = Math.floor(Math.random() * n);
  if (n > 1 && i === last) i = (i + 1) % n;
  try {
    localStorage.setItem(key, String(i));
  } catch {}
  return i;
}

export function makeGreeting({ first = '', last = '', ctx = {}, now = new Date() }) {
  const s = slot(now.getHours());
  const hasFam = !!last;
  const pool = T.filter((v) => (v.t === s || v.t === 'a') && (!v.need || hasFam));
  const v = pool[pickIndex(pool.length, 'accsavdo.greet')];
  const ism = first || last || 'do\'st';
  const title = v.x
    .replace('{ism}', ism)
    .replace('{fam}', last || first)
    .replace("{to'liq}", `${first} ${last}`.trim());
  const subs = SUBS.map((f) => f(ctx)).filter(Boolean);
  const sub = subs.length ? subs[pickIndex(subs.length, 'accsavdo.greet.sub')] : '';
  return { title, sub };
}
export const GREETING_COUNT = T.length;
