import type { AuthUser, Env } from './env';
import { num } from './env';
import { canonical, isEmpty } from './canonical';
import { toLocalDate } from './dates';
import { computeNextDue, plannedReminders, reminderConfig } from './reminders';
import { PHOTO_MIMES, parseDataUrl, photoMaxBytes, putBlob, sha256Hex, storageKind } from './photos';

/**
 * Entidades sincronizadas. Los nombres son los de la app (docs/app-sync-contract.md).
 *  - lww:    se reemplaza el documento completo si updatedAt es más nuevo (last-write-wins).
 *            Los campos "setOnce" no pueden cambiar una vez que tienen valor.
 *  - append: solo se insertan; reenviar el mismo documento es idempotente y cambiarlo se rechaza.
 */
export const ENTITIES = {
  clientes: { table: 'clients', mode: 'lww', setOnce: [] as string[] },
  registros: {
    table: 'records',
    mode: 'lww',
    setOnce: ['tipo', 'servicio', 'clienteId', 'createdAt', 'core', 'firmaCliente', 'firmaTecnico'],
  },
  eventos: { table: 'record_events', mode: 'append', setOnce: [] as string[] },
  firmas: { table: 'signatures', mode: 'append', setOnce: [] as string[] },
  fotos: { table: 'photos', mode: 'lww', setOnce: ['registroId', 'createdAt', 'mime', 'size', 'sha256'] },
} as const;

export type EntityName = keyof typeof ENTITIES;
export const ENTITY_NAMES = Object.keys(ENTITIES) as EntityName[];
/** Entidad de solo lectura que el servidor agrega en el pull. */
export const READONLY_ENTITIES = ['recordatorios'] as const;

export const MAX_CHANGES_PER_PUSH = 100;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const STRIP_KEYS = new Set(['synced']);
/** Margen para relojes de teléfono adelantados. */
const FUTURE_SKEW_MS = 10 * 60 * 1000;

export type Change = { entity: string; doc: unknown };
export type ChangeStatus = 'ok' | 'duplicate' | 'stale' | 'rejected';
export type ChangeResult = {
  entity: string;
  id: string | null;
  status: ChangeStatus;
  reason?: string;
  /** Versión vigente en el servidor (en stale/rejected, para que la app la adopte). */
  doc?: Record<string, unknown>;
};

type Row = {
  id: string;
  doc: string;
  updated_at?: string;
  created_at?: string;
  storage?: string | null;
};

const SEQ_INC = "UPDATE counters SET value = value + 1 WHERE name = 'seq'";
const SEQ_VAL = "(SELECT value FROM counters WHERE name = 'seq')";

function normIso(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const t = typeof v === 'number' ? v : Date.parse(v);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function cleanDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (STRIP_KEYS.has(k) || k.startsWith('_')) continue;
    out[k] = v;
  }
  return out;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

function recordType(doc: Record<string, unknown>): 'mantenimiento' | 'trabajo' {
  if (doc.tipo === 'mantenimiento' || doc.tipo === 'trabajo') return doc.tipo;
  const s = typeof doc.servicio === 'string' ? doc.servicio : '';
  return s.startsWith('mantenimiento') ? 'mantenimiento' : 'trabajo';
}

function deletedAt(doc: Record<string, unknown>, updatedAt: string): string | null {
  const d = normIso(doc.deletedAt);
  if (d) return d;
  return doc.eliminado === true || doc.deleted === true ? updatedAt : null;
}

export async function pushChanges(env: Env, user: AuthUser, deviceId: string | null, changes: Change[]) {
  const db = env.DB;
  const cfg = reminderConfig(env);
  const docMax = num(env.DOC_MAX_BYTES, 1_500_000);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // 1. Leer lo que ya existe (una sola consulta batch).
  const idsByEntity = new Map<EntityName, Set<string>>();
  for (const c of changes) {
    const d = c?.doc as Record<string, unknown> | undefined;
    if (c && ENTITY_NAMES.includes(c.entity as EntityName) && d && typeof d.id === 'string' && ID_RE.test(d.id)) {
      const set = idsByEntity.get(c.entity as EntityName) ?? new Set();
      set.add(d.id);
      idsByEntity.set(c.entity as EntityName, set);
    }
  }
  const reads: D1PreparedStatement[] = [];
  const readMeta: EntityName[] = [];
  for (const [entity, ids] of idsByEntity) {
    const all = [...ids];
    const t = ENTITIES[entity].table;
    const cols = ENTITIES[entity].mode === 'lww' ? 'id, doc, updated_at, created_at' : 'id, doc, created_at';
    for (let i = 0; i < all.length; i += 90) {
      const chunk = all.slice(i, i + 90);
      reads.push(db.prepare(`SELECT ${cols}${entity === 'fotos' ? ', storage' : ''} FROM ${t} WHERE id IN (${chunk.map(() => '?').join(',')})`).bind(...chunk));
      readMeta.push(entity);
    }
  }
  const existing = new Map<string, Row>(); // key `${entity}:${id}`
  if (reads.length) {
    const rs = await db.batch<Row>(reads);
    rs.forEach((r, i) => { for (const row of r.results) existing.set(`${readMeta[i]}:${row.id}`, row); });
  }

  // 2. Decidir cada cambio y preparar las escrituras.
  const writes: D1PreparedStatement[] = [];
  const results: ChangeResult[] = [];

  for (const c of changes) {
    const entity = c?.entity as EntityName;
    const raw = c?.doc as Record<string, unknown> | undefined;
    const rid = raw && typeof raw.id === 'string' ? raw.id : null;
    const reject = (reason: string, doc?: Record<string, unknown>) => results.push({ entity: String(c?.entity ?? ''), id: rid, status: 'rejected', reason, ...(doc ? { doc } : {}) });

    if (!ENTITY_NAMES.includes(entity)) { reject('entidad_desconocida'); continue; }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { reject('documento_invalido'); continue; }
    if (!rid || !ID_RE.test(rid)) { reject('id_invalido'); continue; }
    const conf = ENTITIES[entity];
    let doc = cleanDoc(raw);
    const key = `${entity}:${rid}`;
    const prev = existing.get(key);
    const prevDoc = prev ? (JSON.parse(prev.doc) as Record<string, unknown>) : null;

    // Fotos: el archivo puede venir como dataUrl; se separa del documento.
    let blob: { mime: string; bytes: Uint8Array } | null = null;
    if (entity === 'fotos' && typeof doc.dataUrl === 'string') {
      const parsed = parseDataUrl(doc.dataUrl);
      if (!parsed || !PHOTO_MIMES.includes(parsed.mime)) { reject('foto_invalida'); continue; }
      if (parsed.bytes.length > photoMaxBytes(env)) { reject('foto_muy_grande'); continue; }
      blob = parsed;
      const { dataUrl: _omit, ...rest } = doc;
      doc = { ...rest, mime: parsed.mime, size: parsed.bytes.length, sha256: await sha256Hex(parsed.bytes) };
    }

    if (conf.mode === 'append') {
      const createdAt = normIso(doc.createdAt);
      if (!createdAt) { reject('createdAt_invalido'); continue; }
      if (!str(doc.registroId)) { reject('registroId_requerido'); continue; }
      const json = JSON.stringify(doc);
      if (json.length > docMax) { reject('documento_muy_grande'); continue; }
      if (prevDoc) {
        if (canonical(prevDoc) === canonical(doc)) results.push({ entity, id: rid, status: 'duplicate' });
        else reject('solo_agregar', prevDoc);
        continue;
      }
      writes.push(db.prepare(SEQ_INC));
      if (entity === 'eventos') {
        writes.push(db.prepare(
          `INSERT INTO record_events (id, record_id, kind, doc, created_at, created_by, device_id, server_seq)
           VALUES (?, ?, ?, ?, ?, ?, ?, ${SEQ_VAL}) ON CONFLICT(id) DO NOTHING`,
        ).bind(rid, doc.registroId, str(doc.tipo) ?? 'nota', json, createdAt, user.id, deviceId));
      } else {
        writes.push(db.prepare(
          `INSERT INTO signatures (id, record_id, role, doc, created_at, created_by, device_id, server_seq)
           VALUES (?, ?, ?, ?, ?, ?, ?, ${SEQ_VAL}) ON CONFLICT(id) DO NOTHING`,
        ).bind(rid, doc.registroId, str(doc.rol), json, createdAt, user.id, deviceId));
      }
      existing.set(key, { id: rid, doc: json, created_at: createdAt });
      results.push({ entity, id: rid, status: 'ok' });
      continue;
    }

    // last-write-wins
    let updatedAt = normIso(doc.updatedAt);
    if (!updatedAt) { reject('updatedAt_invalido'); continue; }
    if (Date.parse(updatedAt) > nowMs + FUTURE_SKEW_MS) { updatedAt = nowIso; doc.updatedAt = nowIso; }

    if (prevDoc && prev) {
      // Campos fijos que la app no reenvió: se conservan.
      for (const f of conf.setOnce) if (doc[f] === undefined && prevDoc[f] !== undefined) doc[f] = prevDoc[f];
      const prevUpdated = prev.updated_at!;
      if (updatedAt < prevUpdated) { results.push({ entity, id: rid, status: 'stale', doc: prevDoc }); continue; }
      if (updatedAt === prevUpdated) {
        if (canonical(prevDoc) === canonical(doc)) results.push({ entity, id: rid, status: 'duplicate' });
        else results.push({ entity, id: rid, status: 'stale', doc: prevDoc });
        continue;
      }
      const changed = conf.setOnce.find((f) => !isEmpty(prevDoc[f]) && canonical(prevDoc[f]) !== canonical(doc[f]));
      if (changed) { reject(`inmutable:${changed}`, prevDoc); continue; }
      if (entity === 'fotos' && blob && prev.storage) blob = null; // el archivo ya está guardado (mismo sha256)
    }

    const createdAt = normIso(doc.createdAt) ?? prev?.created_at ?? updatedAt;
    const del = deletedAt(doc, updatedAt);
    const json = JSON.stringify(doc);
    if (json.length > docMax) { reject('documento_muy_grande'); continue; }

    if (entity === 'clientes') {
      writes.push(db.prepare(SEQ_INC));
      writes.push(db.prepare(
        `INSERT INTO clients (id, name, phone, doc, created_at, updated_at, deleted_at, updated_by, device_id, server_seq)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${SEQ_VAL})
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone, doc = excluded.doc,
           updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, updated_by = excluded.updated_by,
           device_id = excluded.device_id, server_seq = excluded.server_seq
         WHERE excluded.updated_at > clients.updated_at`,
      ).bind(rid, str(doc.nombre), str(doc.telefono), json, createdAt, updatedAt, del, user.id, deviceId));
    } else if (entity === 'registros') {
      const type = recordType(doc);
      const core: Record<string, unknown> = {};
      for (const f of conf.setOnce) if (!f.startsWith('firma') && !isEmpty(doc[f])) core[f] = doc[f];
      const nextDue = del ? null : computeNextDue(doc, type, cfg);
      writes.push(db.prepare(SEQ_INC));
      writes.push(db.prepare(
        `INSERT INTO records (id, type, service, client_id, status, performed_on, next_due_on, core, doc,
                              created_at, updated_at, deleted_at, updated_by, device_id, server_seq)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${SEQ_VAL})
         ON CONFLICT(id) DO UPDATE SET
           type = records.type, service = COALESCE(records.service, excluded.service),
           client_id = COALESCE(records.client_id, excluded.client_id), status = excluded.status,
           performed_on = excluded.performed_on, next_due_on = excluded.next_due_on, core = excluded.core,
           doc = excluded.doc, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
           updated_by = excluded.updated_by, device_id = excluded.device_id, server_seq = excluded.server_seq
         WHERE excluded.updated_at > records.updated_at`,
      ).bind(rid, type, str(doc.servicio), str(doc.clienteId), str(doc.estado), toLocalDate(doc.fecha, cfg.timeZone),
        nextDue, JSON.stringify(core), json, createdAt, updatedAt, del, user.id, deviceId));
      writes.push(...reminderStatements(db, rid, nextDue, nowIso, cfg));
    } else {
      // fotos
      if (!str(doc.registroId)) { reject('registroId_requerido'); continue; }
      let storage: string | null = prev?.storage ?? null;
      if (blob) {
        const stmt = await putBlob(env, rid, blob.mime, blob.bytes);
        if (stmt) writes.push(stmt);
        storage = storageKind(env);
      }
      writes.push(db.prepare(SEQ_INC));
      writes.push(db.prepare(
        `INSERT INTO photos (id, record_id, mime, size, storage, doc, created_at, updated_at, deleted_at, updated_by, device_id, server_seq)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${SEQ_VAL})
         ON CONFLICT(id) DO UPDATE SET mime = COALESCE(photos.mime, excluded.mime), size = COALESCE(photos.size, excluded.size),
           storage = COALESCE(excluded.storage, photos.storage), doc = excluded.doc, updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at, updated_by = excluded.updated_by, device_id = excluded.device_id,
           server_seq = excluded.server_seq
         WHERE excluded.updated_at > photos.updated_at`,
      ).bind(rid, doc.registroId, str(doc.mime), typeof doc.size === 'number' ? doc.size : null, storage, json,
        createdAt, updatedAt, del, user.id, deviceId));
      existing.set(key, { id: rid, doc: json, updated_at: updatedAt, created_at: createdAt, storage });
      results.push({ entity, id: rid, status: 'ok' });
      continue;
    }
    existing.set(key, { id: rid, doc: json, updated_at: updatedAt, created_at: createdAt });
    results.push({ entity, id: rid, status: 'ok' });
  }

  if (deviceId) {
    writes.push(db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ? AND user_id = ?').bind(nowIso, deviceId, user.id));
  }
  if (writes.length) await db.batch(writes);
  return results;
}

/** Sentencias que dejan los recordatorios de un registro alineados con su próxima fecha. */
export function reminderStatements(
  db: D1Database,
  recordId: string,
  nextDue: string | null,
  nowIso: string,
  cfg: ReturnType<typeof reminderConfig>,
): D1PreparedStatement[] {
  const planned = plannedReminders(recordId, nextDue, cfg);
  const out: D1PreparedStatement[] = [];
  for (const p of planned) {
    out.push(db.prepare(SEQ_INC));
    out.push(db.prepare(
      `INSERT INTO reminders (id, record_id, kind, due_on, notify_on, status, created_at, updated_at, server_seq)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ${SEQ_VAL})
       ON CONFLICT(id) DO UPDATE SET status = 'pendiente', updated_at = excluded.updated_at, server_seq = excluded.server_seq
       WHERE reminders.status = 'cancelado'`,
    ).bind(p.id, recordId, p.kind, p.due_on, p.notify_on, nowIso, nowIso));
  }
  const keep = planned.map((p) => p.id);
  out.push(db.prepare(SEQ_INC));
  out.push(db.prepare(
    `UPDATE reminders SET status = 'cancelado', updated_at = ?, server_seq = ${SEQ_VAL}
     WHERE record_id = ? AND status = 'pendiente'${keep.length ? ` AND id NOT IN (${keep.map(() => '?').join(',')})` : ''}`,
  ).bind(nowIso, recordId, ...keep));
  return out;
}

export function reminderDoc(r: Record<string, unknown>) {
  return {
    id: r.id,
    registroId: r.record_id,
    tipo: r.kind,
    fecha: r.due_on,
    avisarEl: r.notify_on,
    estado: r.status,
    enviadoEl: r.sent_at ?? null,
    updatedAt: r.updated_at,
  };
}

const PULL_TABLES: { entity: string; table: string }[] = [
  ...ENTITY_NAMES.map((e) => ({ entity: e, table: ENTITIES[e].table })),
  { entity: 'recordatorios', table: 'reminders' },
];

export type PulledChange = { entity: string; seq: number; doc: Record<string, unknown> };

/** Cambios con server_seq > since, en orden. Devuelve el cursor para la próxima llamada. */
export async function pullChanges(env: Env, since: number, limit: number) {
  const db = env.DB;
  const stmts: D1PreparedStatement[] = [db.prepare("SELECT value FROM counters WHERE name = 'seq'")];
  for (const t of PULL_TABLES) {
    const cols = t.table === 'reminders' ? '*' : 'id, doc, server_seq';
    stmts.push(db.prepare(`SELECT ${cols} FROM ${t.table} WHERE server_seq > ? ORDER BY server_seq LIMIT ?`).bind(since, limit + 1));
  }
  const rs = await db.batch<Record<string, unknown>>(stmts);
  const head = Number((rs[0].results[0] as { value: number }).value);
  const all: PulledChange[] = [];
  let truncated = false;
  PULL_TABLES.forEach((t, i) => {
    const rows = rs[i + 1].results;
    if (rows.length > limit) truncated = true;
    for (const row of rows) {
      const seq = Number(row.server_seq);
      if (seq > head) continue; // escrito después de leer el contador (no ocurre dentro de un batch)
      const doc = t.table === 'reminders' ? reminderDoc(row) : (JSON.parse(String(row.doc)) as Record<string, unknown>);
      if (t.entity === 'fotos' && doc && typeof doc === 'object') (doc as Record<string, unknown>).archivo = `/fotos/${row.id}/archivo`;
      all.push({ entity: t.entity, seq, doc });
    }
  });
  all.sort((a, b) => a.seq - b.seq);

  let page = all;
  let hasMore = false;
  if (truncated || all.length > limit) {
    hasMore = true;
    // Al cortar, el cursor debe quedar en un seq que esté completo en todas las tablas:
    // el menor "último seq leído" entre las tablas truncadas.
    let safe = Infinity;
    PULL_TABLES.forEach((_, i) => {
      const rows = rs[i + 1].results;
      if (rows.length > limit) {
        const a = Number(rows[limit - 1].server_seq);
        const b = Number(rows[limit].server_seq);
        safe = Math.min(safe, a === b ? a - 1 : a);
      }
    });
    page = all.filter((c) => c.seq <= safe).slice(0, limit);
    if (page.length) {
      const last = page[page.length - 1].seq;
      // No partir un mismo seq entre dos páginas.
      const nextSameSeq = all.find((c, idx) => idx >= page.length && c.seq === last);
      if (nextSameSeq) {
        const trimmed = page.filter((c) => c.seq < last);
        page = trimmed.length ? trimmed : all.filter((c) => c.seq <= last);
      }
    }
  }
  const cursor = hasMore ? (page.length ? page[page.length - 1].seq : since) : Math.max(head, since);
  return { cursor, hasMore, changes: page };
}
