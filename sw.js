// Phylactère — fonctionnement hors ligne (page et polices en cache) et réception des images partagées.
const CACHE = 'phylactere-v12';
const PARTAGE = 'phylactere-partage';
const COQUILLE = ['./', './index.html', './manifest.webmanifest', './icons/icone-192.png', './icons/icone-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== PARTAGE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // « Partager vers Phylactère » (Android, site installé) : on garde l'image, puis on ouvre la page sur #partage
  if (e.request.method === 'POST' && u.origin === location.origin && u.pathname.endsWith('/partage')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData(), c = await caches.open(PARTAGE);
        const f = fd.getAll('image').find(x => x && x.type && x.type.startsWith('image/'));
        if (f) await c.put('./partage-image', new Response(f, { headers: { 'Content-Type': f.type } }));
        const t = [fd.get('url'), fd.get('text')].map(x => (x || '').toString()).find(x => /https?:\/\//.test(x));
        if (!f && t) await c.put('./partage-texte', new Response((/https?:\/\/\S+/.exec(t) || [''])[0]));
      } catch (err) {}
      return Response.redirect('./#partage', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  // La page : d'abord le réseau (pour recevoir les mises à jour), sinon le cache.
  if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Polices Google : cache d'abord.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return res; })));
  }
  // Le reste (BnF, Google Books, Open Library, couvertures, lecture de texte) passe directement par le réseau.
});
