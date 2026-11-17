// PokéAyuda: guarda la app para usarla sin conexión
const V = 'pokeayuda-v1';
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'data.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'img/s0.webp', 'img/s1.webp', 'img/s2.webp', 'img/s3.webp', 'img/s4.webp', 'img/s5.webp', 'img/s6.webp', 'img/s7.webp'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== 'pokeayuda-art').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Ilustraciones oficiales de PokeAPI y fuentes: se guardan la primera vez que se ven
  if (url.hostname === 'raw.githubusercontent.com' || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open('pokeayuda-art').then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin === location.origin) {
    // Primero la red (para recibir actualizaciones), si no hay conexión, la copia guardada
    e.respondWith(fetch(req).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put(req, cp)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
  }
});
