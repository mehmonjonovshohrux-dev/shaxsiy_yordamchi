// 2FA'ni nollaydi: egasining barcha TOTP faktorlarini o'chiradi va sessiyalarni tugatadi.
// GitHub Action chaqiradi (repoga `backend/reset-2fa.trigger` fayli push qilinganda). Maxfiy kalit faqat GitHub Secrets'da.
import { readFileSync } from 'node:fs';

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`${k} GitHub Secrets'da yo'q`);
    process.exit(1);
  }
  return v;
};
const url = need('SUPABASE_URL').replace(/\/$/, '');
const key = need('SUPABASE_SERVICE_ROLE_KEY');
const email = need('OWNER_EMAIL').trim().toLowerCase();

// Ehtiyot chorasi: fayl "RESET" so'zi bilan boshlanishi shart (tasodifiy push nollamasin)
let trig = '';
try {
  trig = readFileSync(new URL('../reset-2fa.trigger', import.meta.url), 'utf8');
} catch {}
if (!/^RESET\b/.test(trig.trim())) {
  console.error('backend/reset-2fa.trigger "RESET" so\'zi bilan boshlanishi kerak. Hech narsa o\'zgartirilmadi.');
  process.exit(1);
}

const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const call = async (path, init = {}) => {
  const r = await fetch(url + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${r.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
};

let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const res = await call(`/auth/v1/admin/users?page=${page}&per_page=200`);
  const list = res.users || [];
  user = list.find((u) => (u.email || '').toLowerCase() === email) || null;
  if (list.length < 200) break;
}
if (!user) {
  console.error('Foydalanuvchi topilmadi (OWNER_EMAIL ni tekshiring)');
  process.exit(1);
}

const factors = await call(`/auth/v1/admin/users/${user.id}/factors`);
for (const f of factors || []) {
  await call(`/auth/v1/admin/users/${user.id}/factors/${f.id}`, { method: 'DELETE' });
  console.log('Faktor o\'chirildi:', f.id, f.factor_type);
}
await call('/rest/v1/rpc/admin_revoke_sessions', { method: 'POST', body: JSON.stringify({ p_user: user.id }) });
console.log(`Tayyor: ${factors?.length || 0} ta faktor o'chirildi, barcha sessiyalar tugatildi. Ilovaga kirganda 2FA qayta sozlanadi.`);
