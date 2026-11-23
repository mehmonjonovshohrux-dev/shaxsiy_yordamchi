// Rasmlar: ixtiyoriy formatni qabul qilish, SIFATNI SAQLAB yuklash, kichik ko'rinish (thumbnail), imzolangan havolalar.
//
//  - Asl fayl o'zgarishsiz saqlanadi (EXIF, rang, sifat saqlanadi). Faqat DOWNSCALE_OVER_MB dan katta bo'lsa
//    3600px / 92% sifatga keltiriladi (bepul 1 GB joyni tez to'ldirmaslik uchun).
//  - Ro'yxat uchun alohida kichik nusxa (…t.jpg) yaratiladi: tez ochiladi, internet kam sarflanadi.
//  - Brauzer ochmaydigan format (masalan HEIC) bo'lsa ham saqlanadi, yuklab olish mumkin.
import { sb } from '../core/supabase.js';
import { CONFIG } from '../config.js';

const B = () => sb.storage.from(CONFIG.BUCKET);
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif', 'image/bmp': 'bmp', 'image/tiff': 'tif', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/jxl': 'jxl' };
const IMG_NAME = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?|jfif|svg|ico|jxl|jp2|psd|dng|raw|cr2|cr3|nef|arw|orf|rw2|tga)$/i;

export const thumbPath = (p) => p.replace(/\.[^./]+$/, '.t.jpg');
export const isThumb = (p) => /\.t\.jpg$/.test(p);

function extOf(file) {
  if (EXT[file.type]) return EXT[file.type];
  const e = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  return e || 'bin';
}

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
}

function draw(bmp, maxSide, quality) {
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', quality));
}

// Faylni tekshirib, yuklashga tayyorlaydi
export async function prepare(file) {
  const mb = file.size / 1048576;
  // Har qanday rasm formati: image/* yoki ma'lum kengaytma (RAW, DNG, SVG, ICO, JXL, PSD…) yoki turi aniqlanmagan fayl
  if (/^(video|audio)\//.test(file.type) || file.type === 'application/pdf') throw new Error(`«${file.name}» rasm emas`);
  if (!file.type.startsWith('image/') && file.type && !IMG_NAME.test(file.name)) throw new Error(`«${file.name}» rasm emas`);
  if (mb > CONFIG.MAX_FILE_MB) throw new Error(`«${file.name}» juda katta (${mb.toFixed(1)} MB). Eng ko'pi ${CONFIG.MAX_FILE_MB} MB.`);
  if (file.size === 0) throw new Error(`«${file.name}» bo'sh fayl`);

  const bmp = await decode(file);
  let main = file;
  let ext = extOf(file);
  let type = file.type || 'application/octet-stream';
  let downscaled = false;

  if (bmp && mb > CONFIG.DOWNSCALE_OVER_MB) {
    const blob = await draw(bmp, 3600, 0.92);
    if (blob && blob.size < file.size) {
      main = blob;
      ext = 'jpg';
      type = 'image/jpeg';
      downscaled = true;
    }
  }
  const thumb = bmp ? await draw(bmp, CONFIG.THUMB_PX, 0.8) : null;
  if (bmp && bmp.close) bmp.close();
  return { main, ext, type, thumb, name: file.name, size: main.size, downscaled, previewable: !!bmp };
}

export async function upload(userId, accId, p) {
  const path = `${userId}/${accId}/${crypto.randomUUID()}.${p.ext}`;
  const { error } = await B().upload(path, p.main, { contentType: p.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  if (p.thumb) await B().upload(thumbPath(path), p.thumb, { contentType: 'image/jpeg', cacheControl: '31536000' }); // muvaffaqiyatsiz bo'lsa ham zarari yo'q
  return path;
}

export async function removeFiles(paths) {
  const all = paths.flatMap((p) => [p, thumbPath(p)]);
  if (all.length) await B().remove(all);
}

// ---- imzolangan havolalar (yopiq bucket) ----
const cache = new Map(); // path -> {url, exp}
const TTL = 50 * 60 * 1000;
export const urlOf = (p) => {
  const c = cache.get(p);
  return c && c.exp > Date.now() ? c.url : null;
};

export async function ensureUrls(paths) {
  const need = [...new Set(paths)].filter((p) => p && !urlOf(p));
  if (!need.length) return;
  const { data } = await B().createSignedUrls(need, 3600);
  const exp = Date.now() + TTL;
  (data || []).forEach((d) => {
    if (d.signedUrl) cache.set(d.path, { url: d.signedUrl, exp });
  });
}

// <img data-path="...thumb" data-orig="...asl"> larga manzil qo'yadi
export async function hydrate(root = document) {
  const imgs = Array.from(root.querySelectorAll('img[data-path]'));
  if (!imgs.length) return;
  await ensureUrls(imgs.map((i) => i.dataset.path));
  const missing = [];
  for (const img of imgs) {
    const u = urlOf(img.dataset.path);
    if (u) img.src = u;
    else if (img.dataset.orig) missing.push(img);
    else img.classList.add('broken');
  }
  if (missing.length) {
    await ensureUrls(missing.map((i) => i.dataset.orig));
    for (const img of missing) {
      const u = urlOf(img.dataset.orig);
      if (u) img.src = u;
      else img.classList.add('broken');
    }
  }
}

// Rasm yuklanmasa: avval aslini sinab ko'ramiz, bo'lmasa "buzilgan" holat
document.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.path) return;
    if (img.dataset.orig && img.dataset.path !== img.dataset.orig && !img.dataset.fb) {
      img.dataset.fb = '1';
      ensureUrls([img.dataset.orig]).then(() => {
        const u = urlOf(img.dataset.orig);
        if (u) img.src = u;
        else img.classList.add('broken');
      });
    } else img.classList.add('broken');
  },
  true,
);

export async function downloadUrl(path) {
  await ensureUrls([path]);
  return urlOf(path);
}
