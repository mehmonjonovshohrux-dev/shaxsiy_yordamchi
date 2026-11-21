# AccSavdo — akkaunt savdosi hisobi (PWA)

Ikki qism: **frontend/** (brauzer ilovasi, Cloudflare'da turadi) va **backend/** (Supabase: baza, rasm ombori, email shablonlari).

## Qaysi qism qaysi faylda

| Nimani o'zgartirmoqchisiz | Fayl |
|---|---|
| Ranglar, shrift, radius | `frontend/css/tokens.css` |
| Kirish ekrani | `frontend/js/screens/auth/login.js` |
| Parolni unutdim / kod / yangi parol | `frontend/js/screens/auth/forgot.js`, `code.js`, `newpass.js` |
| Parol kuchi qoidalari | `frontend/js/logic/password.js` |
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
1. Supabase → SQL Editor: `backend/migrations/001_accounts.sql`, so'ng `002_storage.sql`.
2. `backend/README.md` dagi qadamlar (email shabloni, parol siyosati, SMTP, 2FA).
3. `supabase.min.js` ni `frontend/vendor/` ga qo'ying.
4. `git add . && git commit -m "v2" && git push` — Cloudflare o'zi joylaydi.

Testlar: `node --test tests/logic.test.mjs`
