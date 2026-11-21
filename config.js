// Supabase -> Project Settings -> API dan oling.
// "anon public" kalit ochiq bo'lishi mumkin (himoya bazadagi RLS qoidalarida).
// HECH QACHON "service_role" kalitni bu yerga qo'ymang!
window.APP_CONFIG = {
  SUPABASE_URL: 'https://wwwbbtnbklntslzhmuyz.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d2JidG5ia2xudHNsemhtdXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMzYyMzUsImV4cCI6MjExMDgxMjIzNX0.tL8TWCGS8YOqftyo5r7aXdJe4ltpJfCiUBFP90JgIcE',
  ALLOW_SIGNUP: false // keyin boshqa odamlarga sotsangiz true qiling (Supabase'da ham signup ni yoqing)
};
