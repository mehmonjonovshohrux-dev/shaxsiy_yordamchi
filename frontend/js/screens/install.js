// Ilovani o'rnatish: doimiy taklif paneli (o'rnatilmaguncha ko'rinadi) va yo'riqnoma.
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { isStandalone, isIOS, canPromptInstall, promptInstall } from '../services/install.service.js';

const inAppBrowser = () => /telegram|instagram|fban|fbav|line\/|miuibrowser/i.test(navigator.userAgent);

export function installBannerHtml() {
  if (isStandalone()) return '';
  return `
  <div class="install-bar">
    <div class="install-ic">${icon('phone', 22)}</div>
    <div class="install-txt"><b>Ilovani o'rnating</b><span>Tezroq ochiladi, brauzer paneli yo'q, PIN bilan himoyalanadi</span></div>
    <button type="button" class="btn sm" data-act="install-app">O'rnatish</button>
  </div>`;
}

export function openInstallHelp() {
  const ios = isIOS();
  const steps = ios
    ? [
        "<b>Safari</b> brauzerida shu sahifani oching (Telegram yoki boshqa ilova ichidagi brauzer ishlamaydi).",
        `Pastdagi <b>Ulashish</b> tugmasini bosing ${icon('share', 16)}`,
        '<b>«Bosh ekranga qo\'shish»</b> ni tanlang.',
        '<b>«Qo\'shish»</b> ni bosing: ilova bosh ekranda paydo bo\'ladi.',
      ]
    : [
        inAppBrowser() ? '<b>Chrome</b> brauzerida oching (Telegram yoki boshqa ilova ichidagi brauzerda o\'rnatib bo\'lmaydi).' : 'Chrome brauzerida shu sahifani oching.',
        `Yuqori o'ngdagi <b>⋮</b> menyusini bosing ${icon('more', 16)}`,
        '<b>«Ilovani o\'rnatish»</b> (yoki «Bosh ekranga qo\'shish») ni tanlang.',
        '<b>«O\'rnatish»</b> ni bosing. Kompyuterda manzil qatoridagi o\'rnatish belgisi ham ishlaydi.',
      ];
  openSheet({
    title: "Ilovani o'rnatish",
    html: `<ol class="steps">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <p class="muted small">O'rnatgandan keyin Sozlama bo'limidan <b>PIN-kod</b> va <b>barmoq izi</b> ni yoqing.</p>`,
  });
}

registerActions({
  'install-app': async () => {
    if (canPromptInstall()) {
      const r = await promptInstall();
      if (r === 'accepted') toast("Ilova o'rnatildi ✅");
      return;
    }
    openInstallHelp();
  },
});
