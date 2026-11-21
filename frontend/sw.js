// Service worker: ilova qobig'ini keshlaydi (oflayn ochilishi uchun). Supabase so'rovlari va rasmlar KESHLANMAYDI.
const VERSION = 'accsavdo-v4';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(['./', 'index.html']))
      .then(() => self.skipWaiting()),
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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // tashqi (Supabase) -> to'g'ridan-to'g'ri tarmoq
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('index.html'))),
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
