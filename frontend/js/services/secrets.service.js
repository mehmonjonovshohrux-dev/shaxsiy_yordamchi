// Akkauntning kirish ma'lumotlari (login/parol): alohida jadvalda, faqat kerak bo'lganda yuklanadi.
// Ro'yxat va hisobotlarda, CSV/zaxira faylda BU MA'LUMOT YO'Q.
import { sb } from '../core/supabase.js';

export async function loadSecret(accountId) {
  const { data, error } = await sb.from('account_secrets').select('login,password,extra').eq('account_id', accountId).maybeSingle();
  if (error) throw error;
  return data || { login: '', password: '', extra: '' };
}

export async function saveSecret(accountId, { login = '', password = '', extra = '' }) {
  if (!login && !password && !extra) {
    const { error } = await sb.from('account_secrets').delete().eq('account_id', accountId);
    if (error) throw error;
    return;
  }
  const { error } = await sb.from('account_secrets').upsert({ account_id: accountId, login, password, extra }, { onConflict: 'account_id' });
  if (error) throw error;
}

// Xato sababini foydalanuvchiga tushunarli qilib beradi
export function secretHint(e) {
  const m = `${e?.code || ''} ${e?.message || ''}`.toLowerCase();
  if (!navigator.onLine) return "Internet yo'q.";
  if (m.includes('42p01') || m.includes('pgrst205') || m.includes('schema cache') || m.includes('does not exist') || m.includes('account_secrets'))
    return "Supabase'da 004_account_secrets.sql hali ishga tushirilmagan (yoki 000_hammasi.sql). Uni SQL Editor'da Run qiling.";
  if (m.includes('42501') || m.includes('row-level security') || m.includes('aal2')) return "Ruxsat yo'q: 2FA tasdiqlanmagan bo'lishi mumkin. Chiqib, qayta kiring.";
  return `Sabab: ${String(e?.message || 'noma\'lum').slice(0, 120)}`;
}
