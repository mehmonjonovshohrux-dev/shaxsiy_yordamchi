// Supabase mijozi (kutubxona vendor/supabase.min.js dan yuklanadi, CDN ishlatilmaydi).
import { CONFIG } from '../config.js';

if (!window.supabase || !window.supabase.createClient) {
  throw new Error('supabase kutubxonasi yuklanmadi (vendor/supabase.min.js)');
}

export const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
