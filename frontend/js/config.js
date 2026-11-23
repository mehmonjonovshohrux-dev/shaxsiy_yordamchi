// Sozlamalar: faqat shu faylni o'zgartirasiz.
// anon kalit ochiq bo'lishi mumkin (himoya bazadagi RLS qoidalarida). service_role ni HECH QACHON qo'ymang!
export const CONFIG = Object.freeze({
  APP_NAME: 'AccSavdo',
  SUPABASE_URL: 'https://wwwbbtnbklntslzhmuyz.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d2JidG5ia2xudHNsemhtdXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMzYyMzUsImV4cCI6MjExMDgxMjIzNX0.tL8TWCGS8YOqftyo5r7aXdJe4ltpJfCiUBFP90JgIcE',


  // Rasmlar
  VERSION: '2.6.0',
  BUILD_DATE: '2026-11-21',
  ADMIN_TG: 'Ulugbek_5678',
  ADMIN_PHONE: '+998952255678',
  UPDATE_CHECK_MS: 30 * 60 * 1000,
  SECRET_REVEAL_MS: 30000,
  // Hisob egasi (ism/familiya hali kiritilmagan bo'lsa shu ishlatiladi; email'dan ism olinmaydi)
  DEFAULT_PROFILE: { first: 'Shohrux', last: 'Mehmonjonov' },
  // Push bildirishnoma uchun VAPID OCHIQ kalit (backend/PUSH.md dagi qadamlar bilan olinadi). Bo'sh bo'lsa: faqat ilova ochilganda
  VAPID_PUBLIC_KEY: '',
  BUCKET: 'acc-images',
  MAX_IMAGES: 12,
  MAX_FILE_MB: 25, // bundan katta fayl qabul qilinmaydi
  DOWNSCALE_OVER_MB: 8, // shundan katta rasm 3600px / 92% sifatga keltiriladi (qolganlari AYNAN ASLIDA saqlanadi)
  THUMB_PX: 480,

  // PIN-kod
  PIN_LENGTH: 4,
  PIN_MAX_TRIES: 5, // shuncha xatodan keyin parol bilan qayta kirish talab qilinadi
  LOCK_DEFAULT_MS: 30000,

  // Maslahatchi qoidalari
  STALE_DAYS: 14,
  VERY_STALE_DAYS: 30,
  LOW_MARGIN: 0.1,
  PRICE_DROP: 0.1,

});
