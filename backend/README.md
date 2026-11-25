# Backend (Supabase)

Server qismi **Supabase** (Postgres + Auth + Storage). Qoidalar bazaning o'zida (RLS), shuning
uchun front-end buzilsa ham begona ma'lumotga kira olmaydi.

| Fayl | Nima qiladi |
|---|---|
| `migrations/001_accounts.sql` | Akkauntlar jadvali, cheklovlar, faqat egasi ko'radi (RLS) |
| `migrations/002_storage.sql` | Rasmlar uchun yopiq bucket, ixtiyoriy format, 25 MB gacha |
| `migrations/004_account_secrets.sql` | Akkaunt login/parol jadvali (alohida, RLS bilan) |
| `migrations/003_require_mfa.sql` | (ixtiyoriy) 2FA ni majburiy qilish |

## Bir martalik o'rnatish
1. **SQL Editor**da `001`, `002`, keyin `004` ni Run qiling (har birini alohida query'da).
2. **Authentication → Users**: hisobingiz bor (Add user → email + kuchli parol, "Auto Confirm" belgilangan).
3. **Authentication → Sign In / Providers → Email**: *Allow new users to sign up* — **o'chiq**.
   Minimum password length **10**.
4. **Authentication → Multi-Factor**: TOTP yoqilgan.
5. Ilovaga telefonda bir marta kiring → o'rnating → Sozlamalar'da PIN, barmoq izi, 2FA ni yoqing.
   Keyin 2FA ishlashini tekshirib `003_require_mfa.sql` ni Run qiling (ixtiyoriy; 004 dan KEYIN).

Parolni tiklash oynasi yo'q: bu bir kishilik ilova. Parol esdan chiqsa — Supabase → Authentication →
Users → hisob → **Send password recovery** yoki parolni qo'lda o'zgartirish.
