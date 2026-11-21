// Bildirishnoma SOZLAMALARI (Sozlamalar ichida). Xabarlarning o'zi qo'ng'iroqcha oynasida.
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import * as ns from '../services/notify.service.js';
import { isStandalone, isIOS } from '../services/install.service.js';

let ctl = null;

const row = ({ ic, title, sub = '', right = '' }) => `
  <div class="set-row"><span class="set-ic">${icon(ic, 20)}</span><span class="set-tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="set-right">${right}</span></div>`;
const sw = (on, key) => `<button type="button" class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="ns-toggle" data-key="${key}"><i></i></button>`;

function html() {
  const p = ns.prefs();
  const perm = ns.permission();
  const sysOn = p.sys && perm === 'granted';
  const blocked = perm === 'denied';
  const iosNote = isIOS() && !isStandalone();
  return `
  ${iosNote ? `<p class="tip warn"><span class="tip-ic">${icon('info', 18)}</span><span class="tip-tx">iPhone'da bildirishnoma faqat ilova bosh ekranga o'rnatilgandan keyin ishlaydi.</span></p>` : ''}
  ${blocked ? `<p class="tip bad"><span class="tip-ic">${icon('alert', 18)}</span><span class="tip-tx">Bildirishnoma brauzer sozlamalarida bloklangan. Saytning sozlamalaridan ruxsat bering.</span></p>` : ''}
  ${perm === 'unsupported' ? `<p class="tip warn"><span class="tip-ic">${icon('info', 18)}</span><span class="tip-tx">Bu qurilma/brauzer tizim bildirishnomasini qo'llamaydi. Xabarlar faqat qo'ng'iroqchada ko'rinadi.</span></p>` : ''}
  <h2 class="sec-title first">Telefon bildirishnomalari</h2>
  <div class="card list">
    ${row({ ic: 'bell', title: 'Telefon ekranida xabar', sub: sysOn ? (ns.pushConfigured() ? 'Yoqilgan: ilova yopiq bo\'lsa ham keladi' : 'Yoqilgan: ilova ochilganda ko\'rsatiladi') : "Telegram kabi tepada chiqadigan xabar", right: sw(sysOn, 'sys') })}
    ${sysOn ? row({ ic: 'send', title: 'Sinab ko\'rish', sub: 'Hozir test xabar yuboriladi', right: '<button type="button" class="btn sm ghost" data-act="ns-test">Yuborish</button>' }) : ''}
  </div>
  <h2 class="sec-title">Qanday xabarlar</h2>
  <div class="card list">
    ${row({ ic: 'chart', title: 'Kunlik hisobot', sub: 'Sotuvdagi akkauntlar va foyda', right: sw(p.daily, 'daily') })}
    ${row({ ic: 'alert', title: 'Eslatma va maslahatlar', sub: 'Sotilmayotgan akkaunt, sherik to\'lovi', right: sw(p.tips, 'tips') })}
  </div>
  <p class="muted xs">Qo'ng'iroqcha (bosh sahifa tepasida) doim ishlaydi. Telefon ekranidagi xabar uchun ruxsat kerak.${ns.pushConfigured() ? '' : ' Ilova yopiq paytida kelishi uchun server sozlanishi kerak (backend/PUSH.md).'}</p>`;
}

export function openNotifSettings() {
  ctl = openSheet({ title: 'Bildirishnoma sozlamalari', size: 'full', html: html(), onClose: () => (ctl = null) });
}
const repaint = () => ctl?.body.isConnected && (ctl.body.innerHTML = html());

registerActions({
  'open-notif-settings': () => openNotifSettings(),
  'ns-toggle': async (el) => {
    const key = el.dataset.key;
    const on = el.getAttribute('aria-checked') !== 'true';
    try {
      if (key === 'sys') {
        if (on) {
          const r = await ns.enableSystem();
          toast(r.pushed ? 'Yoqildi ✅' : 'Yoqildi: ilova ochilganda ko\'rsatiladi ✅');
        } else {
          await ns.disableSystem();
          toast("Telefon bildirishnomasi o'chirildi");
        }
      } else await ns.setPref(key, on);
    } catch (e) {
      toast(e.message || "Bajarib bo'lmadi", { type: 'error' });
    }
    repaint();
  },
  'ns-test': async () => {
    try {
      await ns.showLocal('AccSavdo', 'Bildirishnoma ishlayapti ✅', 'test');
      toast('Yuborildi: telefon ekranining tepasiga qarang');
    } catch {
      toast("Yuborib bo'lmadi", { type: 'error' });
    }
  },
});
