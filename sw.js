/* The Grey Henry Society — service worker
   Strategy:
   - HTML navigations: network-first (always get the latest app when online, fall back to cache offline)
   - Same-origin static assets (icons, logos, manifest): cache-first
   - Cross-origin (Supabase API, CDNs, fonts): bypass entirely — never cached, so data/auth stay fresh
*/
const VERSION = 'gh-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo/crest_green.png',
  './logo/crest_ivory.png',
  './logo/mono_gold.png',
  './logo/mono_ivory.png',
  './logo/icon-192.png',
  './logo/icon-512.png',
  './logo/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle our own origin; let Supabase, fonts and CDNs go straight to network.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      const cp = r.clone();
      caches.open(VERSION).then(c => c.put(req, cp));
      return r;
    }))
  );
});

self.addEventListener('push', e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch(_) {} e.waitUntil(self.registration.showNotification(d.title || "Henry's Table", { body: d.body || '', icon: 'logo/icon-192.png', badge: 'logo/icon-192.png', tag: d.tag || 'henry', data: { url: d.url || '/' } })); });
self.addEventListener('notificationclick', e => { e.notification.close(); const url = (e.notification.data && e.notification.data.url) || '/'; e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => { for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus(); } return clients.openWindow ? clients.openWindow(url) : null; })); });
