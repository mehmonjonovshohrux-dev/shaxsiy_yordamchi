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
