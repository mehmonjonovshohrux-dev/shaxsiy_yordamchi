// Ulangan qurilmalar: har bir qurilma ilovani ochganda o'z qatorini yangilaydi (009_devices.sql).
// Chiqarilgan (revoked) qurilma keyingi ochilishda o'zi tizimdan chiqadi.
import { sb } from '../core/supabase.js';
import { getState, setState } from '../core/store.js';
import { deviceName } from '../logic/devices.js';
import * as auth from './auth.service.js';

const ID_KEY = 'accsavdo.deviceId';
const GEO_KEY = (uid) => `accsavdo.geo.${uid}`;
const THROTTLE_MS = 5 * 60 * 1000;
let last = 0;

export function deviceId() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `d${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return 'session-only-device';
  }
}

export const geoEnabled = (uid) => {
  try {
    return localStorage.getItem(GEO_KEY(uid)) === '1';
  } catch {
    return false;
  }
};
export const setGeoEnabled = (uid, on) => {
  try {
    on ? localStorage.setItem(GEO_KEY(uid), '1') : localStorage.removeItem(GEO_KEY(uid));
  } catch {}
};

const missing = (e) => {
  const m = `${e?.code || ''} ${e?.message || ''}`.toLowerCase();
  return m.includes('42p01') || m.includes('pgrst205') || m.includes('schema cache') || m.includes('does not exist');
};

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(e),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export async function loadDevices() {
  const { data, error } = await sb.from('devices').select('*').order('last_seen', { ascending: false });
  if (error) {
    setState({ devices: [], devicesReady: missing(error) ? false : getState().devicesReady });
    if (!missing(error)) throw error;
    return [];
  }
  setState({ devices: data || [], devicesReady: true });
  return data || [];
}

// Ilova ochilganda / oldinga chiqqanda chaqiriladi. { force } - 5 daqiqalik cheklovsiz.
export async function ping({ force = false } = {}) {
  const user = getState().user;
  if (!user || (!force && Date.now() - last < THROTTLE_MS)) return;
  last = Date.now();
  try {
    const id = deviceId();
    const own = await sb.from('devices').select('revoked').eq('device_id', id).maybeSingle();
    if (own.error) return missing(own.error) ? setState({ devicesReady: false }) : undefined;
    if (own.data?.revoked) {
      await auth.signOut();
      location.reload();
      return;
    }
    const row = { user_id: user.id, device_id: id, name: deviceName(navigator.userAgent), last_seen: new Date().toISOString() };
    if (geoEnabled(user.id)) {
      try {
        const p = await getPosition();
        Object.assign(row, { lat: p.lat, lng: p.lng, accuracy: p.accuracy, loc_at: new Date().toISOString() });
      } catch {}
    }
    const { error } = await sb.from('devices').upsert(row, { onConflict: 'user_id,device_id' });
    if (error && !missing(error)) console.warn('devices:', error);
    if (!error) await loadDevices().catch(() => {});
  } catch (e) {
    console.warn('devices ping', e);
  }
}

export function startDevicePing() {
  ping({ force: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ping();
  });
}

export async function revokeDevice(id) {
  const { error } = await sb.from('devices').update({ revoked: true }).eq('id', id);
  if (error) throw error;
  setState({ devices: getState().devices.map((d) => (d.id === id ? { ...d, revoked: true } : d)) });
}

export async function forgetDevice(id) {
  const { error } = await sb.from('devices').delete().eq('id', id);
  if (error) throw error;
  setState({ devices: getState().devices.filter((d) => d.id !== id) });
}

// Shu qurilma uchun GPS'ni yoqish/o'chirish (joylashuv darhol yoziladi)
export async function setLocationTracking(on) {
  const uid = getState().user.id;
  if (on) {
    await getPosition(); // ruxsat so'raladi; rad etilsa xato tashlaydi
    setGeoEnabled(uid, true);
    await ping({ force: true });
  } else {
    setGeoEnabled(uid, false);
    await sb.from('devices').update({ lat: null, lng: null, accuracy: null, loc_at: null }).eq('device_id', deviceId());
    await loadDevices().catch(() => {});
  }
}
