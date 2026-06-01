const CACHE = 'zhugulidou-v1';
const STATIC = [
  '/mini-habits/',
  '/mini-habits/index.html',
  '/mini-habits/lucide.js',
  '/mini-habits/manifest.json',
  '/mini-habits/sprites/favicon.svg',
  '/mini-habits/sprites/pwa-icon.svg',
  '/mini-habits/sprites/houzi01.png',
  '/mini-habits/sprites/houzi02.png',
  '/mini-habits/sprites/houzi03.png',
  '/mini-habits/sprites/houzi04.png',
  '/mini-habits/sprites/houzi05.png',
  '/mini-habits/sprites/monkey-excited.svg',
  '/mini-habits/sprites/monkey-happy.svg',
  '/mini-habits/sprites/monkey-idle.svg',
];

// 安装：缓存静态资源
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存 + 接管页面
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求：缓存优先，网络更新
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
