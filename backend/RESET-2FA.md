# 2FA'ni nollash va qayta yoqish (faqat push orqali)

Ilova ichida 2FA'ni o'chirib yoki nollab bo'lmaydi. Nollash faqat GitHub'ga **push** orqali: repoga yozish huquqi faqat sizda.
Telefon yo'qolganda yoki 2FA'ni boshidan sozlamoqchi bo'lsangiz shundan foydalaning.

## Bir martalik tayyorgarlik
1. Supabase SQL Editor'da `migrations/000_hammasi.sql` ni Run qiling (007 va 003 ham ichida).
2. GitHub'da repo → Settings → Secrets and variables → Actions → **New repository secret** (uchta):
   - `SUPABASE_URL` = `https://<ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Project Settings → API → **service_role** kaliti (MAXFIY: hech kimga bermang, kodga/chatga yozmang)
   - `OWNER_EMAIL` = kirish emailingiz
3. GitHub akkauntingizda ham 2FA'ni yoqing (kim repoga push qila olsa, 2FA'ni nollay oladi).

## Nollash (har safar)
PowerShell:
```powershell
cd D:\Projects\shaxsiy_yordamchi
"RESET $(Get-Date -Format s)" | Set-Content -Encoding ascii backend\reset-2fa.trigger
git add -A
git commit -m "2FA reset"
git push
```
GitHub → Actions → "Reset 2FA" yashil bo'lsa tayyor: barcha faktorlar o'chiriladi va barcha sessiyalar tugatiladi.
Keyingi kirishda ilova: parol → yangi KUCHLI parol → QR → kod (2FA qayta yoqiladi).

Ilovaga yangi 2FA sozlanmaguncha ma'lumotlar ko'rinmaydi (003: serverda majburiy).
Fayl "RESET" so'zi bilan boshlanmasa, hech narsa o'zgarmaydi.
