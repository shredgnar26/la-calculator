/* An atomic, scope-specific cache. Updates activate only after user selection. */
const PREFIX = 'blockcalc-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIX + '2.0.0-review.1';
const ASSETS = ['index.html', 'styles.css', 'calculations.js', 'app.js', 'manifest.json', 'REVIEW.md'];
const URLS = ASSETS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS.map(url => new Request(url, {cache: 'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !request.url.startsWith(self.registration.scope)) return;
  const canonical = request.mode === 'navigate' && (url.pathname === new URL(self.registration.scope).pathname || url.pathname.endsWith('/index.html'))
    ? URLS[0] : url.origin + url.pathname;
  if (!URLS.includes(canonical)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(canonical)) || fetch(request)));
});
