# Backend (Supabase)

Server qismi **Supabase** (Postgres + Auth + Storage). Qoidalar bazaning o'zida (RLS), shuning
uchun front-end buzilsa ham begona ma'lumotga kira olmaydi.

| Fayl | Nima qiladi |
|---|---|
| `migrations/001_accounts.sql` | Akkauntlar jadvali, cheklovlar, faqat egasi ko'radi (RLS) |
| `migrations/002_storage.sql` | Rasmlar uchun yopiq bucket, ixtiyoriy format, 25 MB gacha |
| `migrations/004_account_secrets.sql` | Akkaunt login/parol jadvali (alohida, RLS bilan) |
| `migrations/003_require_mfa.sql` | 2FA ni serverda majburiy qilish |
| `migrations/006_installments.sql` | Muddatli to'lov (bo'lib to'lash) |
| `migrations/007_reset_support.sql` | 2FA nollash uchun yordamchi (RESET-2FA.md) |
| `migrations/000_hammasi.sql` | Yuqoridagilarning hammasi bir faylda |

## Bir martalik o'rnatish
1. **SQL Editor**da `migrations/000_hammasi.sql` ni Run qiling (001, 002, 004, 006, 007 va 003 hammasi ichida; qayta ishga tushirsa bo'ladi).
2. **Authentication → Users**: hisobingiz bor (Add user → email + kuchli parol, "Auto Confirm" belgilangan).
3. **Authentication → Sign In / Providers → Email**: *Allow new users to sign up* — **o'chiq**.
   Minimum password length **10**.
4. **Authentication → Multi-Factor**: TOTP yoqilgan.
5. Ilovaga telefonda bir marta kiring → o'rnating → Sozlamalar'da PIN, barmoq izi, 2FA ni yoqing.
   Keyin 2FA ishlashini tekshirib `003_require_mfa.sql` ni Run qiling (ixtiyoriy; 004 dan KEYIN).

Parolni tiklash oynasi yo'q: bu bir kishilik ilova. Parol esdan chiqsa — Supabase → Authentication →
Users → hisob → **Send password recovery** yoki parolni qo'lda o'zgartirish.

## 008 — haftalik muddatli to'lov
`migrations/008_installment_weekly.sql` (yoki `000_hammasi.sql` ni qayta ishga tushiring) — `accounts.inst_weekly` ustunini qo'shadi.
