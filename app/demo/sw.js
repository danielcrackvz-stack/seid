/* Service worker de SEID: funciona sin internet, avisos de mantenimiento
 * y apertura del registro al tocar una notificación. */
const VERSION = 'seid-app-v2.0.2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './fonts/instrument-sans.woff2',
  './js/app.js',
  './js/api.js',
  './js/auth.js',
  './js/catalog.js',
  './js/config.js',
  './js/format.js',
  './js/pdf.js',
  './js/records.js',
  './js/sample.js',
  './js/signature.js',
  './js/store.js',
  './js/ui.js',
  './js/vendor/jspdf.umd.min.js',
  './img/logo.png',
  './img/logo-header.png',
  './favicon.png',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API u otros orígenes: directo a la red
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match('./index.html');
      return hit || fetch(req);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      return new Response('', { status: 504, statusText: 'Sin conexión' });
    }
  })());
});

/* ---------- notificaciones ---------- */

const APP_URL = new URL('./index.html', self.registration.scope).href;

/** Acepta "#/registro/<id>" o la URL del servidor ("/seid/app/#/registro/<id>"); usa solo el hash. */
function hashDe(url, recordId) {
  const i = String(url || '').indexOf('#/');
  if (i >= 0) return url.slice(i);
  return recordId ? `#/registro/${recordId}` : '#/inicio';
}

async function openRecord(hash) {
  const target = APP_URL + hash;
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of all) {
    if (c.url.startsWith(self.registration.scope)) {
      await c.focus();
      c.postMessage({ type: 'open', url: target });
      return;
    }
  }
  await self.clients.openWindow(target);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(openRecord(hashDe(data.url, data.recordId)));
});

/* Web Push: el servidor envía { title, body, url, tag, recordId } (docs/app-sync-contract.md). */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'SEID', {
    body: data.body || '',
    tag: data.tag || 'seid',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: hashDe(data.url, data.recordId), recordId: data.recordId || null }
  }));
});

/* Revisión periódica (Chrome Android con la app instalada). Lee IndexedDB. */
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('seid');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onupgradeneeded = () => { r.transaction.abort(); reject(new Error('sin datos')); };
  });
}
function all(db, store) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(store, 'readonly').objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

async function revisarAvisos() {
  const db = await idb();
  const [regs, evs, metas] = await Promise.all([all(db, 'registros'), all(db, 'eventos'), all(db, 'meta')]);
  const meta = Object.fromEntries(metas.map((m) => [m.key, m.value]));
  if (meta.pushSub) return; // con Web Push activo avisa el servidor
  const avisados = new Set(meta.avisados || []);
  const atendidos = new Set(regs.map((r) => r.core && r.core.seguimientoDe).filter(Boolean));
  const descartados = new Set(evs.filter((e) => e.tipo === 'recordatorio-descartado').map((e) => e.registroId));
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let changed = false;
  for (const r of regs) {
    if (!r.proximoMantenimiento || r.demo || r.deletedAt || r.recordatorio === false || atendidos.has(r.id) || descartados.has(r.id)) continue;
    const [y, m, d] = r.proximoMantenimiento.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const dias = Math.round((fecha - hoy) / 86400000);
    const key = `${r.id}:${r.proximoMantenimiento}`;
    if (dias > 15 || avisados.has(key)) continue;
    await self.registration.showNotification(dias < 0 ? 'Mantenimiento vencido' : `Mantenimiento en ${dias} días`, {
      body: `${(r.core && r.core.cliente && r.core.cliente.nombre) || 'Cliente'} · ${iso(fecha).split('-').reverse().join('/')}. Toque para ver el registro.`,
      tag: `mant-${r.id}`,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { url: `#/registro/${r.id}` }
    });
    avisados.add(key);
    changed = true;
  }
  if (changed) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key: 'avisados', value: [...avisados] });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'seid-avisos') event.waitUntil(revisarAvisos().catch(() => {}));
});
