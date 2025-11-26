// public/sw.js — Offline caching + IndexedDB bootstrap
// - Caches main routes (/bucket, /notes, /login, /calendar) and static assets
// - Uses Cache API strategies (network-first, cache-first, stale-while-revalidate)
// - Prepares IndexedDB stores for offline data (notes, bucket items, events, prefs)

const SW_VERSION = 'v3';
const STATIC_CACHE = `nous2-static-${SW_VERSION}`;
const PAGE_CACHE = `nous2-pages-${SW_VERSION}`;
const RUNTIME_CACHE = `nous2-runtime-${SW_VERSION}`;

const ROUTES_TO_PRECACHE = ['/', '/home', '/bucket', '/notes', '/login', '/calendar'];
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-icon-180.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        const pageCache = await caches.open(PAGE_CACHE);

        // Precache static assets (best-effort)
        await Promise.allSettled(
          STATIC_ASSETS.map((url) => staticCache.add(url))
        );

        // Precache main pages so first load can work offline later
        await Promise.allSettled(
          ROUTES_TO_PRECACHE.map((url) => pageCache.add(url))
        );

        await initDataDB();
      } catch {
        // Never block install on cache/db errors
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Cleanup old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGE_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await clients.claim();
      await initDataDB();
    })()
  );
});

// Fetch strategies
async function networkFirst(event, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(event.request);
    // Only cache successful GETs
    if (event.request.method === 'GET' && resp && resp.status === 200) {
      cache.put(event.request, resp.clone());
    }
    return resp;
  } catch (err) {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedPromise = cache.match(event.request);
  const networkPromise = fetch(event.request)
    .then((resp) => {
      if (event.request.method === 'GET' && resp && resp.status === 200) {
        cache.put(event.request, resp.clone());
      }
      return resp;
    })
    .catch(() => undefined);
  const cached = await cachedPromise;
  return cached || networkPromise;
}

async function cacheFirst(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  const resp = await fetch(event.request);
  if (event.request.method === 'GET' && resp && resp.status === 200) {
    cache.put(event.request, resp.clone());
  }
  return resp;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Next.js static assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(event, STATIC_CACHE));
    return;
  }

  // Static file extensions
  if (/\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|eot)$/.test(url.pathname)) {
    if (/\.(?:css|js)$/.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(event, STATIC_CACHE));
    } else {
      event.respondWith(cacheFirst(event, STATIC_CACHE));
    }
    return;
  }

  // HTML navigations to main routes
  if (request.mode === 'navigate') {
    const handle = ROUTES_TO_PRECACHE.includes(url.pathname) || url.pathname === '/';
    if (handle) {
      event.respondWith(networkFirst(event, PAGE_CACHE));
      return;
    }
  }

  // Default runtime: network, fallback to cache
  event.respondWith(
    (async () => {
      try {
        const resp = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        if (resp && resp.status === 200) {
          cache.put(request, resp.clone());
        }
        return resp;
      } catch (err) {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        throw err;
      }
    })()
  );
});

// Background Sync: trigger client outbox flush
self.addEventListener('sync', (event) => {
  if (event.tag === 'outbox-sync') {
    event.waitUntil(
      (async () => {
        const all = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        all.forEach((c) => c.postMessage('FLUSH_OUTBOX'));
      })()
    );
  }
  if (event.tag === 'pages-sync') {
    event.waitUntil(
      (async () => {
        try {
          await refreshRoutesAndAssets();
        } finally {
          const all = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
          all.forEach((c) => c.postMessage('REFRESH_DONE'));
        }
      })()
    );
  }
});

// Messages from clients
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data && data.type === 'OFFLINE_PUT') {
    const { store, value } = data;
    event.waitUntil(
      (async () => {
        try {
          await initDataDB();
          await idbPut(store, value);
        } catch {}
      })()
    );
  }

  if (data && data.type === 'OFFLINE_GET_ALL') {
    const { store } = data;
    event.waitUntil(
      (async () => {
        try {
          await initDataDB();
          const items = await idbGetAll(store);
          if (event.source) {
            event.source.postMessage({ type: 'OFFLINE_RESULT', store, items });
          } else {
            const all = await clients.matchAll({ type: 'window' });
            all.forEach((c) => c.postMessage({ type: 'OFFLINE_RESULT', store, items }));
          }
        } catch {}
      })()
    );
  }
  if (data === 'REFRESH_ROUTES') {
    event.waitUntil(
      (async () => {
        try {
          await refreshRoutesAndAssets();
        } finally {
          const all = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
          all.forEach((c) => c.postMessage('REFRESH_DONE'));
        }
      })()
    );
  }
});

self.addEventListener('push', (event) => {
  event.waitUntil(handlePushEvent(event));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(focusOrOpenClient(targetUrl));
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(handlePushSubscriptionChange(event));
});

const PUSH_FALLBACK_ICON = '/icons/icon-192.png';

async function handlePushEvent(event) {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      let rawText = '';
      try { rawText = await event.data.text(); } catch { rawText = ''; }
      if (rawText) {
        try { payload = JSON.parse(rawText); }
        catch { payload = { body: rawText }; }
      }
    }
  }

  const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title : 'Nous';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const url = typeof payload.url === 'string' && payload.url ? payload.url : '/';

  const baseData = typeof payload.data === 'object' && payload.data !== null ? payload.data : {};
  const options = {
    body,
    data: { ...baseData, url },
    icon: typeof payload.icon === 'string' ? payload.icon : PUSH_FALLBACK_ICON,
    badge: typeof payload.badge === 'string' ? payload.badge : PUSH_FALLBACK_ICON,
  };

  if (typeof payload.tag === 'string') options.tag = payload.tag;
  if (payload.renotify === true) options.renotify = true;
  if (payload.silent === true) options.silent = true;
  const timestamp = Number(payload.timestamp);
  if (Number.isFinite(timestamp) && timestamp > 0) options.timestamp = timestamp;
  if (Array.isArray(payload.actions)) {
    options.actions = payload.actions;
  }
  if (payload.requireInteraction === true) options.requireInteraction = true;

  return self.registration.showNotification(title, options);
}

async function focusOrOpenClient(url) {
  const target = new URL(url, self.location.origin).href;
  const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windowClients) {
    try {
      const clientUrl = client.url ? new URL(client.url, self.location.origin).href : '';
      if (clientUrl === target || clientUrl.replace(/\/$/, '') === target.replace(/\/$/, '')) {
        if ('focus' in client) {
          await client.focus();
        }
        return;
      }
      if ('navigate' in client) {
        await client.navigate(target);
        await client.focus();
        return;
      }
    } catch {
      // ignore navigation errors
    }
  }
  if (clients.openWindow) {
    await clients.openWindow(target);
  }
}

async function handlePushSubscriptionChange(event) {
  let renewed = null;
  try {
    const options = event.oldSubscription && event.oldSubscription.options;
    const appServerKey = options && options.applicationServerKey;
    if (appServerKey) {
      renewed = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
      await syncSubscriptionFromWorker(renewed);
    }
  } catch {
    renewed = null;
  }

  const windowClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
  const message = renewed
    ? { type: 'PUSH_SUBSCRIPTION_RENEWED' }
    : { type: 'PUSH_SUBSCRIPTION_CHANGED' };
  windowClients.forEach((client) => client.postMessage(message));
}

async function syncSubscriptionFromWorker(subscription) {
  if (!subscription) return false;
  const payload = subscriptionToPayload(subscription);
  if (!payload) return false;
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function subscriptionToPayload(subscription) {
  const keyP256 = subscription.getKey('p256dh');
  const keyAuth = subscription.getKey('auth');
  if (!keyP256 || !keyAuth) return null;
  return {
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64(keyP256),
    auth: arrayBufferToBase64(keyAuth),
    ua: 'service-worker',
  };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// IndexedDB bootstrap for offline data
const DATA_DB = 'nous2';
const DATA_DB_VERSION = 1;

function openDataDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATA_DB, DATA_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('notes')) {
        const s = db.createObjectStore('notes', { keyPath: 'id' });
        try { s.createIndex('updatedAt', 'updatedAt'); } catch {}
      }
      if (!db.objectStoreNames.contains('bucket_items')) {
        db.createObjectStore('bucket_items', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('user_prefs')) {
        db.createObjectStore('user_prefs', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function initDataDB() {
  try {
    const db = await openDataDB();
    db.close();
  } catch {}
}

async function idbPut(store, value) {
  const db = await openDataDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

async function idbGetAll(store) {
  const db = await openDataDB();
  const items = await new Promise((resolve, reject) => {
    const out = [];
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { out.push(cur.value); cur.continue(); }
      else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items;
}

// Refresh helper: update caches for main routes and some static assets
async function refreshRoutesAndAssets() {
  try {
    const pageCache = await caches.open(PAGE_CACHE);
    await Promise.allSettled(
      ROUTES_TO_PRECACHE.map(async (url) => {
        const resp = await fetch(url, { cache: 'reload' });
        if (resp && resp.ok) await pageCache.put(url, resp.clone());
      })
    );
  } catch {}
  try {
    const staticCache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(
      ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'].map(async (url) => {
        const resp = await fetch(url, { cache: 'reload' });
        if (resp && resp.ok) await staticCache.put(url, resp.clone());
      })
    );
  } catch {}
}
