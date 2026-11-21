# Backend (Supabase)

Bu ilovada server qismi **Supabase** (Postgres + Auth + Storage). Hamma qoidalar bazaning o'zida
(qatorli himoya, cheklovlar), shuning uchun front-end buzilsa ham ma'lumotga begona kira olmaydi.

| Fayl | Nima qiladi |
|---|---|
| `migrations/001_accounts.sql` | Akkauntlar jadvali, cheklovlar, har kim faqat o'zinikini ko'rishi (RLS) |
| `migrations/002_storage.sql` | Rasmlar uchun yopiq bucket, ixtiyoriy format, 25 MB gacha |
| `migrations/003_require_mfa.sql` | (ixtiyoriy) 2FA ni majburiy qilish |
| `email-templates/recovery.html` | "Parolni unutdim" xati: kod bilan |
| `email-templates/confirm-signup.html` | Ro'yxatdan o'tishdagi tasdiqlash kodi |

## Birinchi o'rnatish (bir marta)
1. **SQL Editor**da `001` keyin `002` ni ketma-ket Run qiling ("Success" chiqsin). Eski bazangiz bo'lsa ham xavfsiz.
2. **Authentication → Email Templates → Reset password**: `recovery.html` ichidagini yopishtiring.
   Usiz xatda kod emas, havola ketadi va ilovadagi "kod bilan tiklash" ishlamaydi.
3. **Authentication → Sign In / Providers → Email**:
   - *Confirm email*: yoqilgan.
   - *Minimum password length*: **10**, *Password requirements*: katta+kichik harf, raqam, belgi.
   - *Allow new users to sign up*: hozircha **o'chiq** (faqat siz kirasiz).
4. **Authentication → Multi-Factor**: TOTP yoqilgan.
5. **Authentication → URL Configuration → Site URL**: saytingiz manzili.
6. **Email yetkazib berish (muhim):** Supabase'ning o'z pochtasi soatiga bir necha xat bilan cheklangan.
   Parol tiklash ishonchli ishlashi uchun **Project Settings → Authentication → SMTP Settings** ga
   bepul pochta xizmatini (masalan Resend yoki Brevo) ulang.

## 2FA ni majburiy qilish
Ilovada 2FA ni yoqib sinab ko'ring → keyin `003_require_mfa.sql` ni Run qiling.

## Boshqa odamlarga sotish
`frontend/js/config.js` da `ALLOW_SIGNUP: true`, Supabase'da ham sign up ni yoqing va `confirm-signup.html`
shablonini qo'ying. Har bir foydalanuvchi ma'lumoti RLS tufayli avtomatik ajratilgan.
