// Qurilma nomi (User-Agent'dan), xarita havolasi va "yangi qurilma" qoidasi. DOM'dan mustaqil.
export function deviceName(ua = '') {
  const u = String(ua);
  let os = 'Qurilma';
  if (/iPhone/.test(u)) os = 'iPhone';
  else if (/iPad/.test(u)) os = 'iPad';
  else if (/Android/.test(u)) os = 'Android';
  else if (/Windows/.test(u)) os = 'Windows';
  else if (/Mac OS X|Macintosh/.test(u)) os = 'Mac';
  else if (/CrOS/.test(u)) os = 'Chromebook';
  else if (/Linux/.test(u)) os = 'Linux';
  let br = '';
  if (/EdgA?\//.test(u)) br = 'Edge';
  else if (/OPR\/|Opera/.test(u)) br = 'Opera';
  else if (/SamsungBrowser/.test(u)) br = 'Samsung Internet';
  else if (/CriOS|Chrome\//.test(u)) br = 'Chrome';
  else if (/FxiOS|Firefox\//.test(u)) br = 'Firefox';
  else if (/Safari\//.test(u)) br = 'Safari';
  return br ? `${os} · ${br}` : os;
}

export const mapUrl = (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lng.toFixed(5)}#map=16/${lat.toFixed(5)}/${lng.toFixed(5)}`;

export const hasLoc = (d) => typeof d.lat === 'number' && typeof d.lng === 'number';

// Yangi (so'nggi 24 soatda birinchi marta ko'ringan), boshqa va chiqarilmagan qurilmalar
export function newDevices(list, currentId, now = Date.now()) {
  return (list || []).filter((d) => d.device_id !== currentId && !d.revoked && now - new Date(d.first_seen).getTime() < 864e5);
}

export function lastSeenUz(iso, now = Date.now()) {
  const m = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (m < 2) return 'hozir faol';
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} kun oldin`;
  return `${Math.floor(d / 30)} oy oldin`;
}
