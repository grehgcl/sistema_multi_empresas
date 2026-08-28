// ============================================
// SERVICE WORKER - SEE&AGENDE PWA
// ============================================

const CACHE_NAME = 'seeagende-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/ui.js',
  '/js/pages/dashboard.js',
  '/js/pages/clientes.js',
  '/js/pages/agendamentos.js',
  '/js/pages/financeiro.js',
  '/js/pages/empresas.js',
  '/js/pages/configuracoes.js',
  '/js/pages/servicos.js',
  '/js/pages/planos.js',
  '/js/pages/whatsapp-config.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(request);
      })
      .catch(() => {
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});

console.log('✅ Service Worker carregado!');
