// Ilova qulfi: PIN-kod va barmoq izi / yuz (WebAuthn).
//
// MUHIM: bu QURILMADA ilovani himoyalaydi (telefoningizni boshqa odam qo'liga olsa). Asosiy himoya
// baribir parol + 2FA + bazadagi qoidalar. PIN faqat shu qurilmada saqlanadi (PBKDF2 xesh, ochiq emas).
// PIN ketma-ket xato kiritilsa, hisobdan chiqariladi va parol bilan qayta kirish talab qilinadi.
import { CONFIG } from '../config.js';

const KEY = (uid) => `accsavdo.lock.v1.${uid}`;
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function read(uid) {
  try {
    return JSON.parse(localStorage.getItem(KEY(uid)) || 'null');
  } catch {
    return null;
  }
}
const write = (uid, v) => localStorage.setItem(KEY(uid), JSON.stringify(v));

async function derive(pin, saltB64, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations: iter }, key, 256);
  return b64(bits);
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const isEnabled = (uid) => !!read(uid)?.hash;
export const lockAfter = (uid) => read(uid)?.after ?? CONFIG.LOCK_DEFAULT_MS;
export function setLockAfter(uid, ms) {
  const s = read(uid);
  if (s) write(uid, { ...s, after: ms });
}

export async function setPin(uid, pin) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const iter = 210000;
  const hash = await derive(pin, salt, iter);
  const cur = read(uid) || {};
  write(uid, { ...cur, salt, iter, hash, fails: 0, after: cur.after ?? CONFIG.LOCK_DEFAULT_MS });
}

export async function verifyPin(uid, pin) {
  const s = read(uid);
  if (!s?.hash) return { ok: false, left: 0, exhausted: true };
  const h = await derive(pin, s.salt, s.iter);
  if (sameString(h, s.hash)) {
    write(uid, { ...s, fails: 0 });
    return { ok: true, left: CONFIG.PIN_MAX_TRIES, exhausted: false };
  }
  const fails = (s.fails || 0) + 1; // sahifani yangilab "urinishlarni nolga tushirish" mumkin emas: saqlanadi
  write(uid, { ...s, fails });
  return { ok: false, left: Math.max(0, CONFIG.PIN_MAX_TRIES - fails), exhausted: fails >= CONFIG.PIN_MAX_TRIES };
}

export const clearLock = (uid) => localStorage.removeItem(KEY(uid));

// ---------------- Barmoq izi / yuz (qurilma biometrikasi) ----------------
export async function bioSupported() {
  try {
    return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()));
  } catch {
    return false;
  }
}
export const bioEnabled = (uid) => !!read(uid)?.bio;

export async function enableBio(uid, email) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: CONFIG.APP_NAME, id: location.hostname },
      user: { id: enc.encode(uid).slice(0, 64), name: email, displayName: email },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000,
      attestation: 'none',
    },
  });
  const s = read(uid) || {};
  write(uid, { ...s, bio: b64(cred.rawId) });
}

export function disableBio(uid) {
  const s = read(uid);
  if (s) {
    delete s.bio;
    write(uid, s);
  }
}

export async function bioUnlock(uid) {
  const s = read(uid);
  if (!s?.bio) return false;
  try {
    const r = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: unb64(s.bio) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!r;
  } catch {
    return false; // bekor qilindi yoki mos kelmadi
  }
}
