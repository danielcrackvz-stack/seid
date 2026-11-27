import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import type { AppEnv, Env } from './env';
import { list } from './env';
import { issueToken, loginLocked, recordLoginFailure, requireAuth } from './auth';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password';
import { ENTITIES, ENTITY_NAMES, MAX_CHANGES_PER_PUSH, pullChanges, pushChanges, reminderDoc, type Change } from './sync';
import { PHOTO_MIMES, getBlob, photoMaxBytes, putBlob, sha256Hex, storageKind, toDataUrl } from './photos';
import { broadcast, runDailyReminders, vapidKeys } from './notify';
import { localDate } from './dates';

const API_VERSION = '1.0.0';
const DEFAULT_ORIGINS = ['https://danielcrackvz-stack.github.io', 'https://seid.com.bo', 'https://www.seid.com.bo'];
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'no-store');
});

app.use('*', (c, next) => {
  const allowed = list(c.env.ALLOWED_ORIGINS, DEFAULT_ORIGINS);
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    exposeHeaders: ['Content-Disposition'],
    maxAge: 86_400,
  })(c, next);
});

app.onError((err, c) => {
  console.error('error', err);
  return c.json({ error: 'error_interno', message: 'Ocurrió un error en el servidor.' }, 500);
});
app.notFound((c) => c.json({ error: 'no_encontrado', message: 'Ruta no encontrada.' }, 404));

const health = (c: { json: (o: unknown) => Response }) => c.json({ ok: true, service: 'seid-api', version: API_VERSION, time: new Date().toISOString() });
app.get('/', (c) => health(c));
app.get('/health', (c) => health(c));

// ---------- Autenticación ----------

app.post('/auth/login', bodyLimit({ maxSize: 16 * 1024 }), async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!EMAIL_RE.test(email) || !password || password.length > 256) {
    return c.json({ error: 'datos_invalidos', message: 'Escriba su correo y contraseña.' }, 400);
  }
  const ip = c.req.header('CF-Connecting-IP') || 'local';
  const emailKey = `email:${email}`;
  const ipKey = `ip:${ip}`;
  const locked = await loginLocked(c.env, [emailKey, ipKey]);
  if (locked) {
    const secs = Math.ceil((locked - Date.now()) / 1000);
    c.header('Retry-After', String(secs));
    return c.json({ error: 'demasiados_intentos', message: `Demasiados intentos. Pruebe de nuevo en ${Math.ceil(secs / 60)} minutos.`, retryAfter: secs }, 429);
  }
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<{
    id: string; email: string; name: string; role: string; password_hash: string; token_version: number; disabled: number;
  }>();
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok || user.disabled) {
    await recordLoginFailure(c.env, emailKey, ipKey);
    return c.json({ error: 'credenciales_invalidas', message: 'Correo o contraseña incorrectos.' }, 401);
  }
  const deviceId = typeof body?.deviceId === 'string' && ID_RE.test(body.deviceId) ? body.deviceId : null;
  const now = new Date().toISOString();
  const stmts = [c.env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(emailKey)];
  if (deviceId) {
    const name = typeof body?.deviceName === 'string' ? body.deviceName.slice(0, 80) : null;
    stmts.push(c.env.DB.prepare(
      `INSERT INTO devices (id, user_id, name, user_agent, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, name = COALESCE(excluded.name, devices.name),
         user_agent = excluded.user_agent, last_seen_at = excluded.last_seen_at`,
    ).bind(deviceId, user.id, name, (c.req.header('User-Agent') || '').slice(0, 300), now, now));
  }
  await c.env.DB.batch(stmts);
  const { token, expiresAt } = await issueToken(c.env, user, deviceId);
  return c.json({ token, expiresAt, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/auth/me', requireAuth, (c) => c.json({ user: c.get('user') }));

app.post('/auth/password', requireAuth, bodyLimit({ maxSize: 16 * 1024 }), async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  const current = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body?.newPassword === 'string' ? body.newPassword : '';
  if (next.length < 10 || next.length > 256) {
    return c.json({ error: 'contrasena_debil', message: 'La nueva contraseña debe tener al menos 10 caracteres.' }, 400);
  }
  const u = c.get('user');
  const row = await c.env.DB.prepare('SELECT password_hash, token_version FROM users WHERE id = ?').bind(u.id).first<{ password_hash: string; token_version: number }>();
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return c.json({ error: 'credenciales_invalidas', message: 'La contraseña actual no es correcta.' }, 401);
  }
  const hash = await hashPassword(next, Number(c.env.PBKDF2_ITERATIONS) || undefined);
  const tv = row.token_version + 1; // cierra las demás sesiones
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, token_version = ?, updated_at = ? WHERE id = ?').bind(hash, tv, new Date().toISOString(), u.id).run();
  const { token, expiresAt } = await issueToken(c.env, { id: u.id, token_version: tv }, u.deviceId);
  return c.json({ token, expiresAt });
});

// ---------- Sincronización ----------

app.get('/sync', requireAuth, async (c) => {
  const since = Math.max(0, Math.floor(Number(c.req.query('since') ?? 0)) || 0);
  const limit = Math.min(Math.max(Math.floor(Number(c.req.query('limit') ?? 500)) || 500, 50), 1000);
  const r = await pullChanges(c.env, since, limit);
  return c.json({ serverTime: new Date().toISOString(), ...r });
});

app.post('/sync', requireAuth, bodyLimit({ maxSize: 10 * 1024 * 1024 }), async (c) => {
  const body = await c.req.json<{ deviceId?: string; changes?: Change[] }>().catch(() => null);
  if (!body || !Array.isArray(body.changes)) {
    return c.json({ error: 'datos_invalidos', message: 'Se esperaba { changes: [...] }.' }, 400);
  }
  if (body.changes.length > MAX_CHANGES_PER_PUSH) {
    return c.json({ error: 'demasiados_cambios', message: `Envíe como máximo ${MAX_CHANGES_PER_PUSH} cambios por vez.`, max: MAX_CHANGES_PER_PUSH }, 413);
  }
  const user = c.get('user');
  const deviceId = typeof body.deviceId === 'string' && ID_RE.test(body.deviceId) ? body.deviceId : user.deviceId;
  const results = await pushChanges(c.env, user, deviceId, body.changes);
  return c.json({ serverTime: new Date().toISOString(), results });
});

// ---------- Respaldo ----------

app.get('/export', requireAuth, async (c) => {
  const withPhotos = /^(1|true|si)$/i.test(c.req.query('fotos') ?? '');
  const db = c.env.DB;
  const stmts = [
    ...ENTITY_NAMES.map((e) => db.prepare(`SELECT id, doc${e === 'fotos' ? ', storage, mime' : ''} FROM ${ENTITIES[e].table} ORDER BY server_seq`)),
    db.prepare('SELECT * FROM reminders ORDER BY server_seq'),
    db.prepare('SELECT id, email, name, role, disabled, created_at FROM users'),
    db.prepare('SELECT id, user_id, name, created_at, last_seen_at FROM devices'),
    db.prepare("SELECT value FROM counters WHERE name = 'seq'"),
  ];
  const rs = await db.batch<Record<string, unknown>>(stmts);
  const out: Record<string, unknown> = { app: 'SEID', formato: 'api-1', exportadoEl: new Date().toISOString(), conFotos: withPhotos };
  ENTITY_NAMES.forEach((e, i) => { out[e] = rs[i].results.map((r) => JSON.parse(String(r.doc))); });
  const n = ENTITY_NAMES.length;
  out.recordatorios = rs[n].results.map(reminderDoc);
  out.usuarios = rs[n + 1].results;
  out.dispositivos = rs[n + 2].results;
  out.cursor = Number((rs[n + 3].results[0] as { value: number }).value);
  if (withPhotos) {
    const fotos = out.fotos as Record<string, unknown>[];
    const meta = rs[ENTITY_NAMES.indexOf('fotos')].results;
    const blobs = new Map<string, Uint8Array>();
    if (meta.some((m) => m.storage === 'd1')) {
      const rows = (await db.prepare('SELECT id, data FROM photo_blobs').all<{ id: string; data: ArrayBuffer }>()).results;
      for (const r of rows) blobs.set(r.id, new Uint8Array(r.data));
    }
    for (let i = 0; i < meta.length; i++) {
      const m = meta[i];
      const bytes = m.storage === 'r2' ? await getBlob(c.env, String(m.id), 'r2') : blobs.get(String(m.id));
      if (bytes) fotos[i].dataUrl = toDataUrl(String(m.mime || 'image/jpeg'), bytes);
    }
  }
  c.header('Content-Disposition', `attachment; filename="seid-respaldo-${localDate(new Date())}.json"`);
  return c.json(out);
});

// ---------- Fotos (archivo binario) ----------

app.put('/fotos/:id/archivo', requireAuth, async (c) => {
  const id = c.req.param('id');
  if (!ID_RE.test(id)) return c.json({ error: 'id_invalido' }, 400);
  const mime = (c.req.header('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (!PHOTO_MIMES.includes(mime)) return c.json({ error: 'foto_invalida', message: 'Use JPEG, PNG o WebP.' }, 415);
  const max = photoMaxBytes(c.env);
  const len = Number(c.req.header('Content-Length') || 0);
  if (len > max) return c.json({ error: 'foto_muy_grande', max }, 413);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (!bytes.length) return c.json({ error: 'foto_vacia' }, 400);
  if (bytes.length > max) return c.json({ error: 'foto_muy_grande', max }, 413);
  const sha = await sha256Hex(bytes);
  const db = c.env.DB;
  const prev = await db.prepare('SELECT doc, storage FROM photos WHERE id = ?').bind(id).first<{ doc: string; storage: string | null }>();
  const now = new Date().toISOString();
  const user = c.get('user');
  let doc: Record<string, unknown>;
  if (prev) {
    doc = JSON.parse(prev.doc);
    if (doc.sha256 && doc.sha256 !== sha) return c.json({ error: 'inmutable', message: 'Esta foto ya tiene otro archivo.' }, 409);
    if (doc.sha256 && prev.storage) return c.json({ status: 'duplicate', id, sha256: sha });
  } else {
    const registroId = c.req.query('registroId') || '';
    if (!ID_RE.test(registroId)) return c.json({ error: 'registroId_requerido' }, 400);
    doc = { id, registroId, createdAt: now, updatedAt: now };
  }
  doc = { ...doc, mime, size: bytes.length, sha256: sha };
  const stmts: D1PreparedStatement[] = [];
  const blobStmt = await putBlob(c.env, id, mime, bytes);
  if (blobStmt) stmts.push(blobStmt);
  stmts.push(db.prepare("UPDATE counters SET value = value + 1 WHERE name = 'seq'"));
  stmts.push(db.prepare(
    `INSERT INTO photos (id, record_id, mime, size, storage, doc, created_at, updated_at, updated_by, device_id, server_seq)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT value FROM counters WHERE name = 'seq'))
     ON CONFLICT(id) DO UPDATE SET mime = excluded.mime, size = excluded.size, storage = excluded.storage,
       doc = excluded.doc, server_seq = excluded.server_seq`,
  ).bind(id, doc.registroId, mime, bytes.length, storageKind(c.env), JSON.stringify(doc), String(doc.createdAt ?? now),
    String(doc.updatedAt ?? now), user.id, user.deviceId));
  await db.batch(stmts);
  return c.json({ status: 'ok', id, sha256: sha, size: bytes.length, storage: storageKind(c.env) });
});

app.get('/fotos/:id/archivo', requireAuth, async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT mime, storage FROM photos WHERE id = ?').bind(id).first<{ mime: string; storage: string | null }>();
  if (!row || !row.storage) return c.json({ error: 'no_encontrado' }, 404);
  const bytes = await getBlob(c.env, id, row.storage);
  if (!bytes) return c.json({ error: 'no_encontrado' }, 404);
  return new Response(bytes, {
    headers: { 'Content-Type': row.mime || 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' },
  });
});

// ---------- Notificaciones push ----------

app.get('/push/vapid-public-key', (c) => {
  const v = vapidKeys(c.env);
  if (!v) return c.json({ error: 'vapid_no_configurado' }, 503);
  return c.json({ publicKey: v.publicKey });
});

app.post('/push/subscribe', requireAuth, bodyLimit({ maxSize: 16 * 1024 }), async (c) => {
  const body = await c.req.json<Record<string, any>>().catch(() => null);
  const sub = body?.subscription ?? body;
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : '';
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  let okUrl = false;
  try { okUrl = new URL(endpoint).protocol === 'https:'; } catch { /* */ }
  if (!okUrl || endpoint.length > 2048 || typeof p256dh !== 'string' || typeof auth !== 'string' || p256dh.length > 200 || auth.length > 100) {
    return c.json({ error: 'suscripcion_invalida' }, 400);
  }
  const user = c.get('user');
  const deviceId = typeof body?.deviceId === 'string' && ID_RE.test(body.deviceId) ? body.deviceId : user.deviceId;
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (id, user_id, device_id, endpoint, p256dh, auth, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, device_id = excluded.device_id,
       p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, failures = 0`,
  ).bind(crypto.randomUUID(), user.id, deviceId, endpoint, p256dh, auth, (c.req.header('User-Agent') || '').slice(0, 300), new Date().toISOString()).run();
  return c.json({ ok: true });
});

app.post('/push/unsubscribe', requireAuth, async (c) => {
  const body = await c.req.json<Record<string, any>>().catch(() => null);
  const endpoint = body?.endpoint ?? body?.subscription?.endpoint;
  if (typeof endpoint !== 'string') return c.json({ error: 'datos_invalidos' }, 400);
  await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint, c.get('user').id).run();
  return c.json({ ok: true });
});

app.post('/push/test', requireAuth, async (c) => {
  const base = c.env.APP_BASE_URL || '/seid/app/';
  const r = await broadcast(c.env, { title: 'SEID', body: 'Las notificaciones funcionan en este teléfono.', url: base, tag: 'seid-prueba' }, c.get('user').id);
  return c.json(r, r.error ? 503 : 200);
});

app.get('/recordatorios', requireAuth, async (c) => {
  const rows = (await c.env.DB.prepare("SELECT * FROM reminders WHERE status = 'pendiente' ORDER BY notify_on LIMIT 500").all<Record<string, unknown>>()).results;
  return c.json({ recordatorios: rows.map(reminderDoc) });
});

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDailyReminders(env, new Date(controller.scheduledTime)).then((r) => console.log('recordatorios', JSON.stringify(r))));
  },
} satisfies ExportedHandler<Env>;
