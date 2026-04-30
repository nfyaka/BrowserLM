const CACHE = 'browserlm-shell-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => {
                const scope = self.registration.scope;
                const urls = [
                    scope,
                    new URL('index.html', scope).href,
                    new URL('manifest.webmanifest', scope).href,
                    new URL('favicon.svg', scope).href,
                ];
                return Promise.all(
                    urls.map((u) =>
                        cache.add(u).catch(() => {
                            /* e.g. index only served at scope URL */
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    const isDoc = req.mode === 'navigate' || req.destination === 'document';
    const isShellAsset =
        url.pathname.endsWith('.webmanifest') ||
        url.pathname.endsWith('manifest.webmanifest') ||
        url.pathname.endsWith('.svg');

    if (!isDoc && !isShellAsset) return;

    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(req, copy));
                }
                return res;
            })
            .catch(() =>
                caches
                    .match(req)
                    .then(
                        (hit) =>
                            hit ||
                            caches.match(self.registration.scope) ||
                            caches.match(new URL('index.html', self.registration.scope).href)
                    )
            )
    );
});
