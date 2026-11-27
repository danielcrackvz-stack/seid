/* Cliente de la API de SEID (Cloudflare Workers + D1).
 * Contrato: docs/app-sync-contract.md (rama api). Mientras API_BASE_URL esté vacío,
 * la app trabaja solo en el teléfono y los cambios esperan en la cola local. */
import { API_BASE_URL } from './config.js';
import * as store from './store.js';

const BASE = String(API_BASE_URL || '').replace(/\/$/, '');
const PUSH_BATCH = 40;
const PHOTOS_PER_BATCH = 2;

export function enabled() { return !!BASE; }
export function token() { return store.meta('token', ''); }
export function loggedIn() { return !enabled() || !!token(); }

let onAuthLost = () => {};
export function setAuthLostHandler(fn) { onAuthLost = fn; }

export class ApiError extends Error {
  constructor(message, { status = 0, code = '' } = {}) { super(message); this.status = status; this.code = code; }
}

async function call(path, { method = 'GET', body, auth = true, raw = false } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && token() ? { Authorization: `Bearer ${token()}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('Sin conexión con el servidor.', { code: 'offline' });
  }
  if (res.status === 401 && auth) {
    // Sesión vencida o revocada: se pide entrar de nuevo, sin borrar datos ni la cola.
    await store.setMeta('token', '');
    onAuthLost();
    throw new ApiError('Su sesión venció. Vuelva a entrar.', { status: 401, code: 'auth' });
  }
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch { /* */ }
    const retry = res.headers.get('Retry-After');
    throw new ApiError(data.message || `El servidor respondió ${res.status}.`, { status: res.status, code: data.error || (retry ? `retry:${retry}` : '') });
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}

/* ---------- sesión ---------- */

export async function login({ email, password }) {
  const out = await call('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password, deviceId: store.deviceId(), deviceName: 'Celular de Abel' }
  });
  await store.setMeta('token', out.token);
  await store.setMeta('tokenExpiresAt', out.expiresAt || '');
  await store.setMeta('usuario', out.user || null);
  if (out.user?.name && !store.meta('tecnicoNombre')) await store.setMeta('tecnicoNombre', out.user.name);
  return out;
}

export async function logout() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sub = await reg?.pushManager?.getSubscription();
    if (sub && token()) await call('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
  } catch { /* */ }
  await store.setMeta('token', '');
}

/* ---------- sincronización ---------- */

function stripLocal(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) if (k !== 'synced' && !k.startsWith('_')) out[k] = v;
  return out;
}

/** Sube la outbox en lotes. Devuelve cuántos documentos rechazó el servidor. */
async function push() {
  let rejected = 0;
  for (;;) {
    const queue = await store.outbox();
    if (!queue.length) return rejected;
    // Última versión de cada documento; los de ejemplo nunca se suben.
    const latest = new Map();
    for (const q of queue) latest.set(`${q.entity}:${q.id}`, q);
    const batch = [];
    const skip = [];
    let photos = 0;
    for (const q of latest.values()) {
      const doc = store.data()[q.entity]?.find((x) => x.id === q.id);
      if (!doc || doc.demo) { skip.push(q); continue; }
      if (q.entity === 'fotos') { if (photos >= PHOTOS_PER_BATCH) continue; photos += 1; }
      batch.push({ q, change: { entity: q.entity, doc: stripLocal(doc) } });
      if (batch.length >= PUSH_BATCH) break;
    }
    if (skip.length) {
      const keys = new Set(skip.map((q) => `${q.entity}:${q.id}`));
      await store.markSynced(queue.filter((x) => keys.has(`${x.entity}:${x.id}`)).map((x) => x.seq), []);
    }
    if (!batch.length) continue;
    const out = await call('/sync', { method: 'POST', body: { deviceId: store.deviceId(), changes: batch.map((b) => b.change) } });
    const done = new Set();
    const refs = [];
    for (const res of out.results || []) {
      const key = `${res.entity}:${res.id}`;
      done.add(key);
      if (res.status === 'ok' || res.status === 'duplicate') refs.push({ entity: res.entity, id: res.id });
      else if ((res.status === 'stale' || res.status === 'rejected') && res.doc) {
        await store.save(res.entity, { ...res.doc, synced: true }, { fromServer: true });
      }
      if (res.status === 'rejected') rejected += 1;
    }
    // Se quitan de la cola las entradas de los documentos respondidos (incluidas versiones viejas).
    const seqs = queue.filter((x) => done.has(`${x.entity}:${x.id}`)).map((x) => x.seq);
    await store.markSynced(seqs, refs);
    if (!seqs.length) return rejected;
  }
}

/** Baja los cambios del servidor desde el último cursor. */
async function pull() {
  const pending = new Map((await store.outbox()).map((q) => [`${q.entity}:${q.id}`, q]));
  let cursor = store.meta('syncCursor', 0) || 0;
  for (;;) {
    const out = await call(`/sync?since=${encodeURIComponent(cursor)}&limit=500`);
    const byEntity = {};
    for (const ch of out.changes || []) {
      if (!store.ENTIDADES.includes(ch.entity) || !ch.doc) continue; // "recordatorios" los calcula también la app
      const cur = store.data()[ch.entity].find((x) => x.id === ch.doc.id);
      if (cur && pending.has(`${ch.entity}:${ch.doc.id}`) && String(cur.updatedAt || '') > String(ch.doc.updatedAt || '')) continue;
      const doc = { ...ch.doc, synced: true };
      if (ch.entity === 'fotos' && !doc.dataUrl && cur) doc._dataUrl = cur.dataUrl || cur._dataUrl || '';
      (byEntity[ch.entity] ||= []).push(doc);
    }
    for (const [entity, docs] of Object.entries(byEntity)) await store.save(entity, docs, { fromServer: true });
    cursor = out.cursor ?? cursor;
    await store.setMeta('syncCursor', cursor);
    if (!out.hasMore) break;
  }
  await fetchMissingPhotos();
}

/** Las fotos llegan sin archivo; se bajan con el token y se guardan para verlas sin internet. */
async function fetchMissingPhotos() {
  const missing = store.data().fotos.filter((f) => !f.deletedAt && !f.dataUrl && !f._dataUrl && f.archivo).slice(0, 10);
  for (const f of missing) {
    try {
      const res = await call(f.archivo.startsWith('/') ? f.archivo : `/fotos/${f.id}/archivo`, { raw: true });
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      await store.save('fotos', { ...f, _dataUrl: dataUrl }, { fromServer: true });
    } catch { /* se reintenta en la próxima sincronización */ }
  }
}

let running = null;

/** Ciclo completo: push y luego pull. Seguro llamarlo seguido. */
export function sync() {
  if (!enabled() || !token() || !navigator.onLine) return Promise.resolve({ skipped: true });
  if (running) return running;
  running = (async () => {
    const rejected = await push();
    await pull();
    await store.setMeta('lastSyncAt', new Date().toISOString());
    return { rejected };
  })().finally(() => { running = null; });
  return running;
}

/* ---------- notificaciones push ---------- */

function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** Suscribe este teléfono a Web Push (idempotente). Requiere permiso concedido. */
export async function ensurePush() {
  if (!enabled() || !token() || !('PushManager' in window) || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { publicKey } = await call('/push/vapid-public-key', { auth: false });
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(publicKey) });
  }
  const json = JSON.stringify(sub.toJSON());
  if (store.meta('pushSub') !== json) {
    await call('/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), deviceId: store.deviceId() } });
    await store.setMeta('pushSub', json);
  }
  return true;
}

export async function testPush() {
  return call('/push/test', { method: 'POST', body: {} });
}
