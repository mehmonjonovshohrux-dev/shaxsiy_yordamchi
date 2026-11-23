// Kirish, parol tiklash (email kodi bilan), 2 bosqichli tasdiqlash. Faqat Supabase Auth bilan gaplashadi.
import { sb } from '../core/supabase.js';

export function humanizeAuthError(err) {
  const m = String(err?.message || '').toLowerCase();
  const code = err?.code || '';
  if (m.includes('failed to fetch') || m.includes('network') || !navigator.onLine) return "Internet aloqasi yo'q";
  if (m.includes('invalid login') || code === 'invalid_credentials') return "Email yoki parol noto'g'ri";
  if (m.includes('email not confirmed')) return 'Email hali tasdiqlanmagan';
  if (err?.status === 429 || m.includes('rate limit') || code.includes('rate_limit')) return "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring";
  if (code === 'otp_expired' || m.includes('expired') || (m.includes('token') && m.includes('invalid')) || m.includes('otp')) return "Kod noto'g'ri yoki muddati tugagan";
  if (code === 'same_password' || m.includes('different from the old')) return 'Yangi parol eskisidan farq qilishi kerak';
  if (code === 'weak_password' || m.includes('weak') || m.includes('password should')) return 'Parol yetarlicha kuchli emas';
  if (m.includes('already registered') || code === 'user_already_exists') return "Bu email bilan allaqachon ro'yxatdan o'tilgan";
  if (m.includes('signups not allowed') || code === 'signup_disabled') return "Hozircha yangi foydalanuvchilar qo'shilmaydi";
  if (m.includes('aal2')) return 'Avval 2 bosqichli tasdiqlash kodini kiriting';
  return "Xatolik yuz berdi. Qayta urinib ko'ring";
}

export const getSession = async () => (await sb.auth.getSession()).data.session;
export const signIn = (email, password) => sb.auth.signInWithPassword({ email, password });
export const signOut = () => sb.auth.signOut();
export const signOutOthers = () => sb.auth.signOut({ scope: 'others' });

// Serverda 2FA majburiymi (backend/migrations/003 ishga tushirilganmi)
export async function mfaEnforced() {
  const { data, error } = await sb.rpc('mfa_enforced');
  return !error && data === true;
}
export const onAuthChange = (fn) => sb.auth.onAuthStateChange(fn);

export const setNewPassword = (password) => sb.auth.updateUser({ password });

// ---- 2 bosqichli tasdiqlash (TOTP) ----
export async function mfaNeeded() {
  const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  return !!data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

export async function mfaFactor() {
  const { data } = await sb.auth.mfa.listFactors();
  return data?.totp?.[0] || null; // faqat tasdiqlangan
}

export async function mfaVerifyCode(factorId, code) {
  const ch = await sb.auth.mfa.challenge({ factorId });
  if (ch.error) return { error: ch.error };
  return sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
}

export async function mfaEnroll() {
  // yarim qolgan (tasdiqlanmagan) urinishlarni tozalaymiz
  const { data } = await sb.auth.mfa.listFactors();
  for (const f of data?.all || []) {
    if (f.factor_type === 'totp' && f.status === 'unverified') await sb.auth.mfa.unenroll({ factorId: f.id });
  }
  return sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `AccSavdo ${Date.now()}` });
}

