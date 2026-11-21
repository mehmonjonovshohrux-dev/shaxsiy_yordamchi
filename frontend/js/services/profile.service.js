// Profil: ism, familiya, telefon va rasm. Ma'lumot Supabase hisobining "user_metadata" qismida saqlanadi,
// rasm esa yopiq `acc-images` omborida (faqat egasi ko'radi).
import { sb } from '../core/supabase.js';
import { CONFIG } from '../config.js';
import { getState, setState } from '../core/store.js';
import { toE164 } from '../logic/phone.js';

export function getProfile(user = getState().user) {
  const m = user?.user_metadata || {};
  const email = user?.email || '';
  const local = email.split('@')[0] || '';
  return {
    first: (m.first_name || '').trim(),
    last: (m.last_name || '').trim(),
    phone: m.phone || '',
    avatar: m.avatar || '',
    email,
    // ism kiritilmagan bo'lsa email boshidan olinadi
    displayFirst: (m.first_name || '').trim() || (local ? local[0].toUpperCase() + local.slice(1) : ''),
    complete: !!((m.first_name || '').trim() && m.phone),
  };
}

export const initials = (p) => ((p.first || p.displayFirst || '?')[0] + (p.last ? p.last[0] : '')).toUpperCase();

async function updateMeta(patch) {
  const { data, error } = await sb.auth.updateUser({ data: patch });
  if (error) throw error;
  setState({ user: data.user });
  return data.user;
}

export const saveProfile = ({ first, last, phone }) =>
  updateMeta({ first_name: first.trim(), last_name: last.trim(), phone: toE164(phone) });

// ---- Rasm ----
function loadBitmap(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bu rasm formatini ochib bo'lmadi. JPG yoki PNG tanlang."));
    };
    img.src = url;
  });
}

async function squareJpeg(file, size = 512) {
  const img = await loadBitmap(file);
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  const c = document.createElement('canvas');
  c.width = c.height = Math.min(size, s);
  c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Rasmni tayyorlab bo\'lmadi'))), 'image/jpeg', 0.92));
}

const urlCache = new Map();
export async function avatarUrl(path) {
  if (!path) return '';
  const hit = urlCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await sb.storage.from(CONFIG.BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return '';
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 3000 * 1000 });
  return data.signedUrl;
}

export async function uploadAvatar(file) {
  const user = getState().user;
  if (file.size > CONFIG.MAX_FILE_MB * 1024 * 1024) throw new Error(`Rasm ${CONFIG.MAX_FILE_MB} MB dan katta`);
  const blob = await squareJpeg(file);
  const old = getProfile(user).avatar;
  const path = `${user.id}/avatar-${Date.now()}.jpg`;
  const up = await sb.storage.from(CONFIG.BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600' });
  if (up.error) throw up.error;
  try {
    await updateMeta({ avatar: path });
  } catch (e) {
    sb.storage.from(CONFIG.BUCKET).remove([path]).catch(() => {});
    throw e;
  }
  if (old) sb.storage.from(CONFIG.BUCKET).remove([old]).catch(() => {});
  return path;
}

export async function removeAvatar() {
  const old = getProfile().avatar;
  await updateMeta({ avatar: '' });
  if (old) sb.storage.from(CONFIG.BUCKET).remove([old]).catch(() => {});
}

// Sahifadagi barcha [data-avatar] elementlarni to'ldiradi (rasm bo'lsa rasm, bo'lmasa bosh harflar)
export async function hydrateAvatars(root = document) {
  const p = getProfile();
  const url = await avatarUrl(p.avatar);
  root.querySelectorAll('[data-avatar]').forEach((el) => {
    if (url) el.innerHTML = `<img src="${url}" alt="">`;
    else el.textContent = initials(p);
  });
}
