// Yo'riqnoma va "Ilova haqida"
import { CONFIG } from '../config.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { logo } from '../ui/brand.js';
import { openSheet } from '../ui/sheet.js';
import { dateUz } from '../core/format.js';
import { isStandalone } from '../services/install.service.js';
import { getState } from '../core/store.js';

// Yo'riqnomani o'zgartirish: shu ro'yxatni tahrirlang
const GUIDE = [
  ['Akkaunt qo\'shish', "Pastdagi «+» tugmasini bosing. Nomi, o'yin, sotib olingan narx va taxminiy sotuv narxini kiriting. Rasmlar va akkauntning kirish ma'lumotlari (login, parol) ham shu yerda kiritiladi. Shaxsiy yoki 50/50 turini tanlang."],
  ['Shaxsiy va 50/50 farqi', "Shaxsiy akkauntda foydaning hammasi sizga qoladi. 50/50 akkauntda foyda teng bo'linadi: yarmi sizga, yarmi sherikka."],
  ['Akkaunt sotilganda', "Akkaunt ichida «Sotildi» tugmasini bosing, haqiqiy narxni kiriting. U taxminiy narxning o'rniga yoziladi va akkaunt «Sotilgan» bo'limiga o'tadi. Sotuvdagi ro'yxatlarda endi ko'rinmaydi."],
  ['Sotilganni tahrirlash', "«Sotilgan» bo'limidan akkauntni oching: sotilgan narx, sana va xaridorni o'zgartirish yoki akkauntni qayta sotuvga qaytarish mumkin."],
  ['Hisobot', "Hisobot bo'limida oy, 3 oy, yil va hammasi bo'yicha foyda ko'rinadi: shaxsiy va 50/50 alohida. Excel (CSV) va zaxira nusxani ham shu yerdan yuklab olasiz."],
  ['Sherik bilan hisob-kitob', "Bosh sahifadagi «Sherikka to'lanadigan» katagi sherikka berish kerak summani ko'rsatadi. To'langach, akkaunt ichida «Sherikka to'landi» ni belgilang."],
  ["Muddatli to'lov", "Akkauntni sotayotganda «Muddatli to'lov» ni yoqing: boshlanish va tugash sanasi, qismlar soni va hozir olingan summani kiriting. Keyin akkaunt oynasida to'lovlarni qo'shing, kalendarda ko'ring, tugash sanasini o'zgartiring. Menyu → Muddatli to'lovlar: barcha qarzlar bir joyda."],
  ['Bildirishnomalar', "Yuqoridagi qo'ng'iroqcha kunlik hisobot, eslatma va maslahatlarni ko'rsatadi. Sozlamalar → Bildirishnomalar'da telefon ekraniga xabar kelishini yoqishingiz mumkin. Yangi versiya chiqsa, shu yerda «Yangilash» tugmasi paydo bo'ladi."],
  ['Xavfsizlik', "Menyudan «Ma'lumotlar va xavfsizlik»ni oching: PIN-kod, barmoq izi/yuz bilan ochish, 2 bosqichli tasdiqlash va parolni almashtirish shu yerda. Akkauntlarning login va parollari faqat siz «Ko'rsatish»ni bosganingizda ochiladi."],
  ['Ilovani o\'rnatish', "Telefonda Chrome (yoki iPhone'da Safari) orqali oching va «O'rnatish»ni bosing. Shundan so'ng ilova bosh ekranda turadi va har safar kirish so'ramaydi."],
  ["«Orqaga» tugmasi", "Ochiq oyna bo'lsa, uni yopadi. Boshqa bo'limda bo'lsangiz, Bosh sahifaga qaytaradi. Bosh sahifada ikki marta bosilsa, ilovadan chiqadi."],
  ['PIN esdan chiqsa', "Qulf ekranidagi «Parol bilan kirish» tugmasini bosing, hisob parolingiz bilan kirib, yangi PIN qo'yasiz."],
];

const CHANGELOG = [
  ['2.5.0', ["Muddatli to'lov: haftasiga summa (qo'shilib boradi) yoki teng qismlar", "Kalendarda boshlanish va tugash sanasini bosing: oraliq boshqa rangda", "Hozirgacha to'planishi kerak bo'lgan summa ko'rinadi"]],
  ['2.4.0', ["Muddatli to'lov: qismlar, kalendar, to'lovlar tarixi, tugash sanasini o'zgartirish", "Rasm: Galereya, Kamera va Fayl tugmalari", "2FA qayta sozlashda yangi kuchli parol majburiy", "2FA'ni faqat GitHub push orqali nollash mumkin", "Kirish ma'lumotlari xatosi sababi aniq ko'rsatiladi"]],
  ['2.3.0', ["2 bosqichli tasdiqlash majburiy: kirishda parol qayta so'raladi va bir martalik kod talab etiladi", "Akkaunt formasidan «O'yin» va «Izoh» olib tashlandi", "Sotuvni saqlash tuzatildi", "Rasm har qanday formatda qabul qilinadi"]],
  ['2.2.0', ["Bosh sahifa sarlavhasi yangi dizaynda", "Sozlama pastki panelda", "Avatar bosilsa profil menyusi", "Bildirishnoma sozlamalari alohida; telefon ekraniga xabar", "Ilova ochilishida PIN/2FA yoqishni so'raydi", "Himoya darajasi va boshqa qurilmalardan chiqish", "Parolni ko'rishdan oldin PIN"]],
  ['2.1.0', ["Profil: rasm, ism, familiya, telefon", "Bildirishnomalar va yangilash tugmasi", "Chap menyu va yangi bo'limlar", "Sotilganlar alohida bo'lim", "Akkaunt kirish ma'lumotlari (login/parol)", "Yo'riqnoma va admin bilan aloqa"]],
  ['2.0.0', ["Yangi dizayn va kirish ekrani", "PIN va barmoq izi bilan qulf", "Rasmlar asl sifatda saqlanadi", "«Orqaga» tugmasi to'g'ri ishlaydi"]],
];

export function openGuide() {
  openSheet({
    title: "Yo'riqnoma",
    size: 'full',
    html: `<div class="faq">${GUIDE.map(([q, a], i) => `<details ${i === 0 ? 'open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
    <button type="button" class="btn ghost block mt" data-act="open-contact">${icon('headset', 18)} Savol qoldimi? Admin bilan bog'lanish</button>`,
  });
}

export function openAbout() {
  const st = getState();
  openSheet({
    title: 'Ilova haqida',
    size: 'full',
    html: `
    <div class="about-head">${logo(64)}<h3>AccSavdo</h3><p class="muted">Akkaunt savdosi hisobi</p></div>
    <div class="card list">
      <div class="kv"><span>Versiya</span><b>${CONFIG.VERSION}</b></div>
      <div class="kv"><span>Sana</span><b>${dateUz(CONFIG.BUILD_DATE)}</b></div>
      <div class="kv"><span>Ishlash usuli</span><b>${isStandalone() ? "O'rnatilgan ilova" : 'Brauzer'}</b></div>
      <div class="kv"><span>Holat</span><b>${st.update ? `Yangi versiya bor (${st.update.version})` : "Eng so'nggi versiya ✅"}</b></div>
      <div class="kv"><span>Ma'lumotlar</span><b>Shifrlangan, faqat sizga ko'rinadi</b></div>
    </div>
    <div class="btn-grid">
      ${st.update ? `<button type="button" class="btn" data-act="apply-update">${icon('refresh', 18)} Yangilash</button>` : `<button type="button" class="btn ghost" data-act="check-update">${icon('refresh', 18)} Tekshirish</button>`}
      <button type="button" class="btn ghost" data-act="open-guide">${icon('book', 18)} Yo'riqnoma</button>
    </div>
    <h2 class="sec-title">Yangiliklar</h2>
    <div class="card">${CHANGELOG.map(([v, items]) => `<div class="log"><b>${v}</b><ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>
    <p class="muted xs center-t">© ${new Date().getFullYear()} AccSavdo</p>`,
  });
}

registerActions({
  'open-guide': () => openGuide(),
  'open-about': () => openAbout(),
});
