# AccSavdo: o'rnatish (taxminan 15 daqiqa, bepul)

## 1. Supabase (baza + login + rasmlar)
1. supabase.com ga kiring -> New project (region: yaqin joy, kuchli baza paroli qo'ying).
2. **SQL Editor** -> `schema.sql` ichidagini yopishtiring -> Run.
3. **Authentication -> Providers -> Email**: "Confirm email" yoqilgan tursin.
4. **Authentication -> Sign In / Providers -> "Allow new users to sign up" ni O'CHIRING** (hozir faqat siz kirasiz).
5. **Authentication -> Users -> Add user**: o'z emailingiz va kuchli parol (kamida 14 belgi).
6. **Authentication -> Multi-Factor**: TOTP yoqilgan bo'lsin.
7. **Project Settings -> API**: `Project URL` va `anon public` kalitni nusxalang.

## 2. Sozlash
`config.js` ichida `SUPABASE_URL` va `SUPABASE_ANON_KEY` ni almashtiring.
(`service_role` kalitni HECH QACHON qo'ymang.)

## 3. Joylash (Cloudflare Pages, bepul, 24/7)
Cloudflare -> Workers & Pages -> Create -> Pages -> **Upload assets** -> shu papkadagi hamma fayllarni (`_headers` ham) yuklang.
Tayyor: `https://nom.pages.dev`. Chrome'da ochib "Ilovani o'rnatish" (Install) ni bosing.

## 4. Birinchi kirgandan keyin
Sozlama -> **2FA ni yoqish**. Ishlashini tekshirgach `schema.sql` oxiridagi `require_mfa` siyosatining izohini olib, qayta Run qiling. Shunda kodsiz hech kim ma'lumotga kira olmaydi.

## Boshqa odamlarga sotish uchun
- `config.js`: `ALLOW_SIGNUP: true`, Supabase'da ham sign up ni yoqing.
- Ma'lumotlar allaqachon foydalanuvchi bo'yicha ajratilgan (RLS), qo'shimcha kod kerak emas.
- Pullik obuna kerak bo'lsa, keyin qo'shiladi.

## Xavfsizlik eslatmalari
- Akkaunt login/parollarini ilovada saqlamang (izohga ham yozmang).
- Sahifa `cdn.jsdelivr.net` dan supabase-js ni yuklaydi (versiya qotirilgan). Yanada qattiq himoya uchun `supabase.min.js` ni yuklab, shu papkaga qo'yib, `index.html` va `_headers` dagi CDN ni olib tashlang.
- Supabase bepul rejasida 1 hafta faol bo'lmasa loyiha "pauza" qilinishi mumkin; ilovadan har kuni foydalansangiz muammo bo'lmaydi. 
