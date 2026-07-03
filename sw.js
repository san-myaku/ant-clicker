// アントコロニー Service Worker
// 方針: ネットワーク優先（オンライン時は常に最新を配信、古いバージョン固着を防ぐ）＋
//       成功レスポンスをキャッシュしてオフライン時のフォールバックに使う。
const CACHE_NAME = 'ant-colony-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && (fresh.type === 'basic' || fresh.type === 'default')) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      // オフライン: キャッシュへフォールバック（?dev=1 等のクエリ差は無視）
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const index = await caches.match('./index.html', { ignoreSearch: true })
          || await caches.match('index.html', { ignoreSearch: true })
          || await caches.match('./', { ignoreSearch: true });
        if (index) return index;
      }
      throw err;
    }
  })());
});
