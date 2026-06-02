const CACHE = 'zhugulidou-v2';
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

// 安装：缓存静态资源（单个文件失败不阻塞整体安装）
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => {
      return Promise.allSettled(STATIC.map(url =>
        c.add(url).catch(err => console.warn('SW 缓存失败(不影响运行):', url, err))
      ));
    }).then(() => self.skipWaiting())
  );
});

// 接收来自页面的指令（如 SKIP_WAITING）
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
