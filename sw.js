const CACHE = 'binder-v1';
const ASSETS = [
  '/binder-app/',
  '/binder-app/index.html',
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
  /* 앱 파일은 캐시 우선 → 백그라운드 갱신 */
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
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
