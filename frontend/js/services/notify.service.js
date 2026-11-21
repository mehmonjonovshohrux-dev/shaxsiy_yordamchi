// Telefon (tizim) bildirishnomalari.
//  1) Ilova ochilganda / qaytib kirilganda kuniga bir marta kunlik hisobot bildirishnomasi (serversiz ishlaydi).
//  2) Ilova yopiq bo'lganda ham kelishi uchun: Web Push (backend/PUSH.md dagi qadamlar kerak; VAPID kaliti config.js da).
import { sb } from '../core/supabase.js';
import { CONFIG } from '../config.js';
import { getState } from '../core/store.js';
import { todayISO } from '../core/format.js';

const PKEY = (uid) => `accsavdo.notif.${uid}`;
const DEFAULTS = { sys: false, daily: true, tips: true };

export const supported = () => 'Notification' in window && 'serviceWorker' in navigator;
export const permission = () => (supported() ? Notification.permission : 'unsupported');
export const pushConfigured = () => !!CONFIG.VAPID_PUBLIC_KEY && 'PushManager' in window;

export function prefs(uid = getState().user?.id) {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PKEY(uid)) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}
function savePrefs(uid, p) {
  try {
    localStorage.setItem(PKEY(uid), JSON.stringify(p));
  } catch {}
}

const b64ToBytes = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
};
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function registration() {
  return navigator.serviceWorker.ready;
}

export async function showLocal(title, body, tag = 'accsavdo') {
  if (permission() !== 'granted') return false;
  const reg = await registration();
  await reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'uz', data: { url: './' } });
  return true;
}

async function syncServer(uid) {
  if (!pushConfigured()) return;
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CONFIG.VAPID_PUBLIC_KEY) });
  const j = sub.toJSON();
  const p = prefs(uid);
  const { error } = await sb.from('push_subscriptions').upsert(
    { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, prefs: { daily: p.daily, tips: p.tips }, ua: navigator.userAgent.slice(0, 200) },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

// Yoqish: ruxsat so'raydi, (bo'lsa) push'ga yozadi
export async function enableSystem() {
  if (!supported()) throw new Error("Bu brauzer bildirishnomani qo'llamaydi");
  const res = await Notification.requestPermission();
  if (res !== 'granted') throw new Error('Ruxsat berilmadi. Brauzer/telefon sozlamalaridan bildirishnomaga ruxsat bering.');
  const uid = getState().user.id;
  savePrefs(uid, { ...prefs(uid), sys: true });
  let pushed = false;
  try {
    await syncServer(uid);
    pushed = pushConfigured();
  } catch (e) {
    console.warn('Push:', e);
  }
  return { pushed };
}

export async function disableSystem() {
  const uid = getState().user.id;
  savePrefs(uid, { ...prefs(uid), sys: false });
  try {
    const reg = await registration();
    const sub = await reg.pushManager?.getSubscription();
    if (sub) {
      await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
  } catch (e) {
    console.warn(e);
  }
}

export async function setPref(key, value) {
  const uid = getState().user.id;
  const p = { ...prefs(uid), [key]: value };
  savePrefs(uid, p);
  if (p.sys && pushConfigured() && permission() === 'granted') syncServer(uid).catch(() => {});
}

// Ilova ochilganda: kuniga bir marta kunlik hisobotni tizim bildirishnomasi qilib ko'rsatadi
export async function maybeDailyDigest(notes) {
  const uid = getState().user?.id;
  if (!uid || permission() !== 'granted') return;
  const p = prefs(uid);
  if (!p.sys) return;
  const day = todayISO();
  const key = `${PKEY(uid)}.last`;
  if (localStorage.getItem(key) === day) return;
  const pick = [p.daily && notes.find((n) => n.kind === 'daily'), p.tips && notes.find((n) => n.kind === 'tip' && n.level === 'bad'), p.tips && notes.find((n) => n.kind === 'tip' && n.level === 'warn')].filter(Boolean)[0];
  if (!pick) return;
  localStorage.setItem(key, day);
  await showLocal(pick.title, pick.text, `digest-${day}`);
}
export { b64url };
