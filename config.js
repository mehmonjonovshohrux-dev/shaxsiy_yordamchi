// Supabase -> Project Settings -> API dan oling.
// "anon public" kalit ochiq bo'lishi mumkin (himoya bazadagi RLS qoidalarida).
// HECH QACHON "service_role" kalitni bu yerga qo'ymang!
window.APP_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY',
  ALLOW_SIGNUP: false // keyin boshqa odamlarga sotsangiz true qiling (Supabase'da ham signup ni yoqing)
};
