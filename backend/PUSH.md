# Telefon ekraniga bildirishnoma (Web Push)

Ilova ichidagi qo'ng'iroqcha va "ilova ochilganda tizim bildirishnomasi" serversiz ishlaydi.
Ilova **yopiq** paytda ham xabar kelishi uchun quyidagi bir martalik sozlash kerak (ixtiyoriy).

1. **Kalit yaratish** (kompyuterda): `node backend/tools/generate-vapid.mjs`
   - OCHIQ kalit → `frontend/js/config.js` dagi `VAPID_PUBLIC_KEY: '...'`
   - MAXFIY kalit → faqat 3-qadamdagi secrets ga (GitHub'ga yuklamang!)
2. SQL Editor: `migrations/005_push.sql` ni Run qiling.
3. Supabase CLI bilan (`npm i -g supabase`, `supabase login`, `supabase link --project-ref <ref>`):
   ```
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:sizning@emailingiz CRON_SECRET=<uzun tasodifiy qator>
   supabase functions deploy daily-push --no-verify-jwt --project-ref <ref>
   ```
   (`SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY` avtomatik beriladi.)
4. Har kuni soat 09:00 (Toshkent = 04:00 UTC) yuborish. SQL Editor'da:
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select cron.schedule('daily-push', '0 4 * * *', $$
     select net.http_post(
       url := 'https://<ref>.supabase.co/functions/v1/daily-push',
       headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
     );
   $$);
   ```
5. Ilovada: Sozlamalar → Bildirishnoma sozlamalari → "Telefon ekranida xabar" ni yoqing → "Sinab ko'rish".

Tekshirish: `curl -X POST -H "x-cron-secret: <CRON_SECRET>" https://<ref>.supabase.co/functions/v1/daily-push` → `{"sent":1,...}`.

Eslatma: iPhone'da faqat ilova bosh ekranga o'rnatilgan bo'lsa ishlaydi (iOS 16.4+).
