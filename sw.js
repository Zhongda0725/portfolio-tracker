const CACHE = 'portfolio-v4';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting(); // 立刻啟用新版 SW，不等舊分頁關閉
});

self.addEventListener('activate', e => {
  // 刪除所有舊版快取
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // 立刻接管所有分頁
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // 外部 API：永遠從網路抓，失敗才用快取
  if (url.includes('firebase') ||
      url.includes('allorigins') ||
      url.includes('corsproxy') ||
      url.includes('coingecko') ||
      url.includes('twse') ||
      url.includes('rate.bot') ||
      url.includes('googleapis') ||
      url.includes('gstatic') ||
      url.includes('fonts.g')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // index.html 和 manifest：Network First（優先抓最新版，失敗才用快取）
  if (url.includes('index.html') || url.includes('manifest.json') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 其他靜態資源（icon 等）：Cache First
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
