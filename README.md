# AccSavdo — akkaunt savdosi hisobi (PWA)

Ikki qism: **frontend/** (brauzer ilovasi, Cloudflare'da turadi) va **backend/** (Supabase: baza, rasm ombori, email shablonlari).

## Qaysi qism qaysi faylda

| Nimani o'zgartirmoqchisiz | Fayl |
|---|---|
| Ranglar, shrift, radius | `frontend/css/tokens.css` |
| Kirish ekrani | `frontend/js/screens/auth/login.js` |
| Parol kuchi qoidalari | `frontend/js/logic/password.js` |
| Profil (rasm, ism, telefon) | `frontend/js/screens/profile.js`, `services/profile.service.js` |
| Telefon formati (+998 xx xxx xx xx) | `frontend/js/logic/phone.js` |
| Salomlashuv matnlari (30+ variant) | `frontend/js/logic/greetings.js` |
| Bildirishnomalar (qo'ng'iroqcha) | `frontend/js/screens/notifications.js`, `logic/notifications.js` |
| Yangi versiya tekshiruvi / yangilash | `frontend/js/services/update.service.js`, `frontend/version.json` |
| Avatar menyusi (profil, chiqish) | `frontend/js/screens/account-menu.js` |
| Bildirishnoma sozlamalari / telefon xabari | `screens/notif-settings.js`, `services/notify.service.js`, `sw.js`, `backend/PUSH.md` |
| Ilova ochilganda himoya so'rovi | `screens/security-onboarding.js` |
| Xavfsizlik tahlili | `backend/SECURITY.md` |
| Chap menyu | `frontend/js/screens/menu.js` |
| Sozlamalar sahifasi | `frontend/js/screens/settings.js` |
| Ma'lumotlar va xavfsizlik (PIN, 2FA…) | `frontend/js/screens/security-hub.js` (amallari `security.js`) |
| Yo'riqnoma va Ilova haqida | `frontend/js/screens/help.js` |
| Admin bilan aloqa (Telegram/telefon) | `frontend/js/screens/contact.js`, raqamlar `config.js` |
| Sotilganlar bo'limi | `frontend/js/screens/accounts.js` |
| Akkaunt login/parol | `account-form.js`, `account-detail.js`, `services/secrets.service.js`, `backend/migrations/004_account_secrets.sql` |
| Foyda, 50/50 hisobi | `frontend/js/logic/finance.js` |
| Eslatma va maslahatlar | `frontend/js/logic/advisor.js` |
| Bosh sahifa | `frontend/js/screens/home.js` |
| Akkaunt qo'shish/tahrirlash | `frontend/js/screens/account-form.js` |
| Sotish oynasi | `frontend/js/screens/sell.js` |
| Rasm yuklash | `frontend/js/services/images.service.js` |
| PIN / barmoq izi | `frontend/js/services/lock.service.js`, `screens/lock.js`, `screens/security.js` |
| "Orqaga" tugmasi | `frontend/js/core/router.js` |
| O'rnatish tugmasi | `frontend/js/services/install.service.js`, `screens/install.js` |
| Sozlamalar (limitlar, URL) | `frontend/js/config.js` |
| Baza jadvali | `backend/migrations/001_accounts.sql` |
| Rasm ombori | `backend/migrations/002_storage.sql` |

## Ishga tushirish
1. Supabase → SQL Editor (har biri alohida query): `001_accounts.sql`, `002_storage.sql`, `004_account_secrets.sql`.
2. `backend/README.md` dagi qadamlar (foydalanuvchi, sign up o'chiq, 2FA).
3. `supabase.min.js` ni `frontend/vendor/` ga qo'ying.
4. `git add . && git commit -m "v2" && git push` — Cloudflare o'zi joylaydi.

Testlar: `node --test tests/logic.test.mjs`

## Yangi versiya chiqarish
`frontend/js/config.js` dagi `VERSION` va `frontend/version.json` ni bir xil qilib oshiring (test tekshiradi), keyin push. Ochiq ilovalarda qo'ng'iroqcha yonida «Yangilash» chiqadi.

## 2.3.1 — majburiy yangilanish mexanizmi (o'chirilgan holatda)
`frontend/version.json` ga `"min": "x.y.z"` qo'shilsa, undan past versiyalar «Yangilash majburiy» oynasida to'xtaydi. Hozir `min` yo'q, shuning uchun hech kim bloklanmaydi.
