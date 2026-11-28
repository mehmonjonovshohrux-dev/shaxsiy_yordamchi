// Service worker: ilova qobig'i keshlanadi (oflayn ochilishi uchun). Supabase so'rovlari va rasmlar KESHLANMAYDI.
// Yangi versiya o'zi o'rnatilmaydi: u "kutish"da turadi va foydalanuvchi «Yangilash» ni bosganda faollashadi.
const VERSION = 'accsavdo-v10';

self.addEventListener('install', (e) => {
  // skipWaiting yo'q: eski versiya foydalanuvchi tasdiqlamaguncha ishlashda davom etadi
  e.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      let list = ['./', 'index.html'];
      try {
        const r = await fetch('precache.json', { cache: 'no-store' });
        if (r.ok) list = [...new Set([...list, ...(await r.json())])];
      } catch {}
      // bitta fayl topilmasa ham o'rnatish to'xtamasin
      await Promise.allSettled(list.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))) // eski versiyalar o'chadi
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // tashqi (Supabase) -> to'g'ridan-to'g'ri tarmoq
  if (/\/(version|precache)\.json$/.test(url.pathname)) return; // har doim yangi
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match('index.html')) || Response.error();
      }
    }),
  );
});

// ---- Push bildirishnoma (server yuborganda, ilova yopiq bo'lsa ham) ----
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'AccSavdo', {
      body: d.body || '',
      tag: d.tag || 'accsavdo',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      lang: 'uz',
      data: { url: d.url || './' },
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
