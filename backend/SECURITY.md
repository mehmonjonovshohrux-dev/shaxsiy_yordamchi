# Xavfsizlik tahlili (v2.2.0)

Bu ilova bitta foydalanuvchi uchun; himoya 3 qatlamda: (1) Supabase Auth + RLS (haqiqiy himoya), (2) ilova qulfi PIN/biometrika (faqat qurilmada), (3) brauzer himoyasi (CSP, HSTS).

## Tuzatilgan / mavjud himoya
- Barcha jadvallarda RLS: `user_id = auth.uid()`; anon uchun huquq yo'q; rasmlar yopiq bucket'da (signed URL).
- Sign-up o'chiq, parol min. 10 belgi; CSP `script-src 'self'` (inline skript yo'q: XSS xavfi past); HSTS, frame-ancestors none.
- PIN: PBKDF2 210k; 5 xato → tizimdan chiqariladi; xato urinishlar saqlanadi.
- 2FA (TOTP): email+parol bilan qayta kirilganda authenticator kodi so'raladi (sinovdan o'tdi).
- v2.2: parolni ko'rishdan oldin PIN so'raladi; nusxalangan parol 30 soniyada buferdan o'chiriladi; "Boshqa qurilmalardan chiqish"; himoya darajasi ko'rsatkichi.

- v2.3: 2FA MAJBURIY. 2FA'siz ilovaga kirib bo'lmaydi: parol qayta so'raladi, QR skanerlanadi, kod tasdiqlanadi. 2FA'ni ilova ichidan o'chirib bo'lmaydi. Telefon yo'qolsa: Supabase → Authentication → Users → foydalanuvchi → Factors → o'chirish.
- DIQQAT: 2FA'ni egasi BIRINCHI bo'lib yoqishi kerak (boshqa odam parolni bilsa va u yoqmagan bo'lsa, o'zinikini ulashi mumkin). Shuning uchun ilovani o'rnatgach darhol kirib 2FA'ni sozlang.

- v2.4: 2FA qayta sozlanganda yangi kuchli parol majburiy; 003 (serverda majburiy 2FA) asosiy migratsiyaga kiritilgan; 2FA'ni faqat GitHub push (Action) orqali nollash mumkin (`RESET-2FA.md`), ilova ichidan emas.
- Eslatma: repoga push qila olgan har kim 2FA'ni nollay oladi. GitHub akkauntingizda 2FA yoqing, tokenni hech kimga bermang.

## Qolgan zaif tomonlar (halol ro'yxat)
1. **2FA serverda majburiy emas** (000_hammasi.sql / 003 ishga tushirilmaguncha), kimdir parolni bilsa 2FA'siz API orqali ma'lumotni o'qiy oladi (ilova ekrani so'raydi, server esa yo'q). **Eng muhim qadam:** 2FA yoqib sinab ko'rgach 003 ni ishga tushiring.
2. **PIN/barmoq izi faqat qurilma qulfi.** Brauzer saqlovini (DevTools) ochgan odam uni chetlab o'ta oladi; sessiya token'i qurilmada turadi. PIN 4 xonali: oflayn tanlab topish mumkin. Haqiqiy himoya — 2FA + kuchli parol.
3. **Akkaunt login/parollari bazada ochiq matnda** (RLS ostida, lekin Supabase admini / zaxira nusxa ko'ra oladi). Yaxshilash: kalit foydalanuvchi PIN'idan hosil bo'ladigan ilova ichidagi shifrlash (E2E) — parol unutilsa tiklab bo'lmaydi, shuning uchun alohida qaror.
4. **Authenticator kodi emas, email kodi emas:** 2FA — Google Authenticator/Authy ilovasidagi 6 xonali kod. Telefon yo'qolsa zaxira yo'q: authenticator sozlanganda maxfiy kalitni (secret) qog'ozga yozib qo'ying.
5. Brute-force: Supabase Auth o'zi limit qo'yadi, lekin Dashboard → Auth → Rate Limits ni tekshiring; CAPTCHA yoqilmagan.
6. Anon kalit kodda ochiq — bu normal (RLS himoya qiladi). `service_role` kalitini hech qachon frontend/GitHub'ga qo'ymang.
7. Service worker/keshdagi ma'lumotlar: faqat statik fayllar keshlanadi, akkaunt ma'lumotlari emas.
8. Push: maxfiy VAPID kalit faqat Supabase secrets'da; Edge Function `x-cron-secret` bilan himoyalangan.

## Tavsiya tartibi
004 → 005 (push kerak bo'lsa) → ilovada PIN + 2FA yoqing → 2FA bilan chiqib qayta kirib sinang → 003 ni ishga tushiring.
