const CACHE = 'binder-v8';
const ASSETS = [
  '/binder-app/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  /* CDN 요청(폰트, FA)은 네트워크 우선 → 실패시 캐시 */
  if (e.request.url.includes('cdn.') || e.request.url.includes('cdnjs.')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  /* GET 요청만 캐시 (POST 등은 캐시 불가) */
  if (e.request.method !== 'GET') return;
  /* index.html은 항상 네트워크에서 최신 버전 가져오기 */
  if (e.request.url.includes('/binder-app/') && !e.request.url.includes('.')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
        }
        return res;
      });
      return cached || fresh;
    })
  );
});

/* 푸시 알림 */
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: '바인더', body: '알림이 있습니다' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/binder-app/icons/icon-192.png',
      badge: '/binder-app/icons/icon-72.png',
      vibrate: [100, 50, 100]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/binder-app/'));
});

/* 앱에서 postMessage로 알림 요청 */
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'NOTIFY'){
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      tag: e.data.tag || 'binder',
      icon: '/binder-app/icons/icon-192.png',
      badge: '/binder-app/icons/icon-72.png',
      vibrate: [100, 50, 100]
    });
  }
});
