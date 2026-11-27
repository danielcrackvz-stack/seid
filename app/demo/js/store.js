/* Almacén local offline-first (IndexedDB) con cola de sincronización.
 * Toda la app lee de una copia en memoria (rápida y síncrona) y cada cambio se
 * escribe en IndexedDB y se anota en la cola "outbox" para enviarlo al servidor
 * cuando exista (ver docs/app-sync-contract.md). */

const DB_NAME = 'seid';
const DB_VERSION = 2;
export const ENTIDADES = ['clientes', 'registros', 'eventos', 'firmas', 'fotos'];

let db = null;
const mem = { clientes: [], registros: [], eventos: [], firmas: [], fotos: [], meta: {} };
const listeners = new Set();

export function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción cancelada'));
  });
}

export async function open() {
  if (db) return mem;
  db = await new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const name of ENTIDADES) {
        if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña.'));
  });
  const tx = db.transaction([...ENTIDADES, 'meta'], 'readonly');
  for (const name of ENTIDADES) mem[name] = await req(tx.objectStore(name).getAll());
  const metas = await req(tx.objectStore('meta').getAll());
  mem.meta = Object.fromEntries(metas.map((m) => [m.key, m.value]));
  if (!mem.meta.deviceId) await setMeta('deviceId', uuid());
  return mem;
}

export function data() { return mem; }
export function deviceId() { return mem.meta.deviceId; }
export function meta(key, fallback = null) { return key in mem.meta ? mem.meta[key] : fallback; }

export async function setMeta(key, value) {
  mem.meta[key] = value;
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put({ key, value });
  await txDone(tx);
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) { try { fn(); } catch { /* */ } } }

/** Inserta o reemplaza documentos y los encola para sincronizar. */
export async function save(entity, docs, { fromServer = false } = {}) {
  const list = Array.isArray(docs) ? docs : [docs];
  const now = new Date().toISOString();
  const tx = db.transaction([entity, 'outbox'], 'readwrite');
  const st = tx.objectStore(entity);
  const ob = tx.objectStore('outbox');
  for (const doc of list) {
    if (!fromServer) {
      doc.createdAt = doc.createdAt || now;
      doc.updatedAt = now;
      doc.deviceId = doc.deviceId || mem.meta.deviceId;
      doc.synced = false;
    }
    st.put(doc);
    if (!fromServer) ob.add({ entity, id: doc.id, op: 'upsert', at: now });
    const arr = mem[entity];
    const i = arr.findIndex((x) => x.id === doc.id);
    if (i >= 0) arr[i] = doc; else arr.push(doc);
  }
  await txDone(tx);
  emit();
  return list;
}

/** Borra documentos locales (solo para datos de ejemplo, que nunca se sincronizan). */
export async function removeLocal(entity, ids) {
  const set = new Set(ids);
  const tx = db.transaction([entity, 'outbox'], 'readwrite');
  for (const id of set) tx.objectStore(entity).delete(id);
  const ob = tx.objectStore('outbox');
  const all = await req(ob.getAll());
  for (const item of all) if (item.entity === entity && set.has(item.id)) ob.delete(item.seq);
  await txDone(tx);
  mem[entity] = mem[entity].filter((x) => !set.has(x.id));
  emit();
}

export async function outbox() {
  const tx = db.transaction('outbox', 'readonly');
  return req(tx.objectStore('outbox').getAll());
}

export async function pendingCount() {
  const tx = db.transaction('outbox', 'readonly');
  return req(tx.objectStore('outbox').count());
}

/** Marca como sincronizados los documentos confirmados por el servidor. */
export async function markSynced(seqs, refs) {
  const tx = db.transaction([...ENTIDADES, 'outbox'], 'readwrite');
  for (const s of seqs) tx.objectStore('outbox').delete(s);
  for (const { entity, id } of refs) {
    const doc = mem[entity].find((x) => x.id === id);
    if (doc) { doc.synced = true; tx.objectStore(entity).put(doc); }
  }
  await txDone(tx);
  emit();
}

/** Copia completa para respaldo. */
export function snapshot() {
  return {
    app: 'SEID',
    formato: 2,
    exportadoEl: new Date().toISOString(),
    deviceId: mem.meta.deviceId,
    clientes: mem.clientes,
    registros: mem.registros,
    eventos: mem.eventos,
    firmas: mem.firmas,
    fotos: mem.fotos.map(({ _dataUrl, ...f }) => (f.dataUrl || !_dataUrl ? f : { ...f, dataUrl: _dataUrl })),
    ajustes: { tecnicoNombre: mem.meta.tecnicoNombre || '', secuencia: mem.meta.secuencia || 0 }
  };
}

/** Borra todos los datos de trabajo (no el PIN ni el identificador del equipo). */
export async function clearData() {
  const tx = db.transaction([...ENTIDADES, 'outbox'], 'readwrite');
  for (const name of [...ENTIDADES, 'outbox']) tx.objectStore(name).clear();
  await txDone(tx);
  for (const name of ENTIDADES) mem[name] = [];
  await setMeta('secuencia', 0);
  await setMeta('syncCursor', 0);
  emit();
}

/** Restaura un respaldo. mode 'replace' borra lo actual; 'merge' conserva lo más reciente. */
export async function restore(backup, mode = 'replace') {
  if (!backup || backup.app !== 'SEID' || !Array.isArray(backup.registros)) {
    throw new Error('El archivo no es un respaldo de SEID.');
  }
  if (mode === 'replace') await clearData();
  for (const name of ENTIDADES) {
    const incoming = Array.isArray(backup[name]) ? backup[name] : [];
    const keep = incoming.filter((doc) => {
      if (!doc || !doc.id) return false;
      const cur = mem[name].find((x) => x.id === doc.id);
      return !cur || String(doc.updatedAt || '') > String(cur.updatedAt || '');
    });
    if (keep.length) {
      for (const d of keep) d.synced = false;
      const tx = db.transaction([name, 'outbox'], 'readwrite');
      for (const d of keep) {
        tx.objectStore(name).put(d);
        tx.objectStore('outbox').add({ entity: name, id: d.id, op: 'upsert', at: new Date().toISOString() });
        const i = mem[name].findIndex((x) => x.id === d.id);
        if (i >= 0) mem[name][i] = d; else mem[name].push(d);
      }
      await txDone(tx);
    }
  }
  const seq = Number(backup.ajustes?.secuencia || 0);
  if (seq > (mem.meta.secuencia || 0)) await setMeta('secuencia', seq);
  if (backup.ajustes?.tecnicoNombre && !mem.meta.tecnicoNombre) await setMeta('tecnicoNombre', backup.ajustes.tecnicoNombre);
  emit();
}

export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      return already || await navigator.storage.persist();
    }
  } catch { /* */ }
  return false;
}
