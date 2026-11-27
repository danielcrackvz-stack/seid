import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScheduledController, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { addDays, addMonths, localDate, toLocalDate } from '../src/dates';
import { buildReminderPayload, computeNextDue, plannedReminders, reminderAction, reminderConfig } from '../src/reminders';
import { runDailyReminders } from '../src/notify';
import worker from '../src/index';
import { call, decryptPush, loggedIn, makeTestSubscription, testEnv, uuid } from './helpers';
import type { Env } from '../src/env';

const cfg = reminderConfig({});

describe('cálculo de fechas', () => {
  it('suma meses respetando fin de mes y años', () => {
    expect(addMonths('2026-11-27', 6)).toBe('2027-05-27');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonths('2027-08-31', 6)).toBe('2028-02-29');
    expect(addMonths('2026-12-15', 12)).toBe('2027-12-15');
    expect(addDays('2027-05-27', -15)).toBe('2027-05-12');
    expect(addDays('2027-03-10', -15)).toBe('2027-02-23');
  });
  it('convierte instantes a fecha de Bolivia (UTC-4)', () => {
    expect(localDate(Date.parse('2026-11-28T03:30:00Z'))).toBe('2026-11-27');
    expect(localDate(Date.parse('2026-11-28T04:30:00Z'))).toBe('2026-11-28');
    expect(toLocalDate('2026-11-28T02:00:00.000Z')).toBe('2026-11-27');
    expect(toLocalDate('2026-11-28T02:00')).toBe('2026-11-28');
    expect(toLocalDate('2026-02-30')).toBeNull();
  });
});

describe('próximo mantenimiento', () => {
  it('mantenimiento: fecha + 6 meses', () => {
    expect(computeNextDue({ fecha: '2026-11-27' }, 'mantenimiento', cfg)).toBe('2027-05-27');
  });
  it('instalación de aire (trabajo) también genera recordatorio', () => {
    expect(computeNextDue({ servicio: 'instalacion-aire', fecha: '2026-01-31' }, 'trabajo', cfg)).toBe('2026-07-31');
    expect(computeNextDue({ servicio: 'instalacion-inverter', fecha: '2026-01-10' }, 'trabajo', cfg)).toBe('2026-07-10');
  });
  it('otros trabajos no generan recordatorio', () => {
    expect(computeNextDue({ servicio: 'camaras', fecha: '2026-01-10' }, 'trabajo', cfg)).toBeNull();
  });
  it('la app puede fijar la fecha o desactivar el recordatorio', () => {
    expect(computeNextDue({ fecha: '2026-11-27', proximoMantenimiento: '2027-01-15' }, 'mantenimiento', cfg)).toBe('2027-01-15');
    expect(computeNextDue({ fecha: '2026-11-27', proximoMantenimiento: null }, 'mantenimiento', cfg)).toBeNull();
    expect(computeNextDue({ fecha: '2026-11-27', recordatorio: false }, 'mantenimiento', cfg)).toBeNull();
    expect(computeNextDue({ servicio: 'camaras', proximoMantenimiento: '2027-01-15' }, 'trabajo', cfg)).toBe('2027-01-15');
  });
  it('sin fecha usa createdAt (en hora de Bolivia)', () => {
    expect(computeNextDue({ createdAt: '2026-12-01T02:00:00Z' }, 'mantenimiento', cfg)).toBe('2027-05-30');
  });
  it('meses configurables (p. ej. 12 para instalaciones)', () => {
    expect(computeNextDue({ fecha: '2026-11-27' }, 'mantenimiento', reminderConfig({ REMINDER_MONTHS: '12' }))).toBe('2027-11-27');
  });
  it('planifica aviso 15 días antes y aviso del día', () => {
    expect(plannedReminders('r1', '2027-05-27', cfg)).toEqual([
      { id: 'r1:aviso:2027-05-27', kind: 'aviso', due_on: '2027-05-27', notify_on: '2027-05-12' },
      { id: 'r1:dia:2027-05-27', kind: 'dia', due_on: '2027-05-27', notify_on: '2027-05-27' },
    ]);
    expect(plannedReminders('r1', '2027-05-27', reminderConfig({ REMIND_DAY_OF: 'false' }))).toHaveLength(1);
    expect(plannedReminders('r1', null, cfg)).toEqual([]);
  });
  it('decide enviar o vencer', () => {
    expect(reminderAction('aviso', '2027-05-27', '2027-05-12')).toBe('enviar');
    expect(reminderAction('aviso', '2027-05-27', '2027-05-28')).toBe('vencido');
    expect(reminderAction('dia', '2027-05-27', '2027-06-03')).toBe('enviar');
    expect(reminderAction('dia', '2027-05-27', '2027-06-04')).toBe('vencido');
  });
  it('arma el contenido de la notificación', () => {
    const p = buildReminderPayload({ reminderId: 'x', recordId: 'abc-123', kind: 'aviso', dueOn: '2027-05-27', today: '2027-05-12',
      service: 'mantenimiento-aire', doc: { equipo: { capacidadBTU: '12000' } }, clientName: 'Doña Rosa', appBaseUrl: '/seid/app/' });
    expect(p).toMatchObject({ title: 'Mantenimiento en 15 días', body: 'Doña Rosa · Mantenimiento de aire · 12000 BTU — fecha: 27/05/2027', url: '/seid/app/#/registro/abc-123' });
  });
});

describe('cron diario + Web Push (de punta a punta)', () => {
  afterEach(() => vi.restoreAllMocks());

  async function setup() {
    const s = await loggedIn();
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey) as ArrayBuffer);
    const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey) as JsonWebKey;
    const { b64urlEncode } = await import('../src/b64');
    const env: Env = { ...testEnv, VAPID_PUBLIC_KEY: b64urlEncode(pub), VAPID_PRIVATE_KEY: jwk.d!, VAPID_SUBJECT: 'https://seid.com.bo' };
    // Las suscripciones de otras pruebas no deben recibir nada.
    await testEnv.DB.prepare('DELETE FROM push_subscriptions').run();
    await testEnv.DB.prepare("UPDATE reminders SET status = 'cancelado' WHERE status = 'pendiente'").run();
    const sub = await makeTestSubscription(`https://push.example.test/send/${uuid()}`);
    const r = await call('/push/subscribe', { method: 'POST', token: s.token, json: { subscription: { endpoint: sub.endpoint, keys: sub.keys } } });
    expect(r.status).toBe(200);
    return { s, env, sub, vapidPub: kp.publicKey };
  }

  it('envía el aviso 15 días antes una sola vez, con contenido cifrado y VAPID válidos', async () => {
    const { s, env, sub, vapidPub } = await setup();
    const cliente = { id: uuid(), nombre: 'Doña Rosa', updatedAt: new Date().toISOString() };
    const reg = { id: uuid(), tipo: 'mantenimiento', servicio: 'mantenimiento-aire', clienteId: cliente.id, fecha: '2026-11-27',
      equipo: { capacidadBTU: '12000' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await call('/sync', { method: 'POST', token: s.token, json: { changes: [{ entity: 'clientes', doc: cliente }, { entity: 'registros', doc: reg }] } });

    const sent: Request[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      sent.push(new Request(input as RequestInfo, init));
      return new Response(null, { status: 201 });
    });

    // Un día antes del aviso: nada.
    expect((await runDailyReminders(env, new Date('2027-05-11T12:00:00Z'))).sent).toBe(0);
    expect(sent).toHaveLength(0);

    // 12-may-2027 08:00 Bolivia: aviso de 15 días.
    const rep = await runDailyReminders(env, new Date('2027-05-12T12:00:00Z'));
    expect(rep.sent).toBe(1);
    expect(sent).toHaveLength(1);
    const req = sent[0];
    expect(req.url).toBe(sub.endpoint);
    expect(req.headers.get('Content-Encoding')).toBe('aes128gcm');
    expect(req.headers.get('TTL')).toBe(String(3 * 86_400));
    const auth = req.headers.get('Authorization')!;
    const m = /^vapid t=([^,]+), k=(.+)$/.exec(auth)!;
    expect(m[2]).toBe(env.VAPID_PUBLIC_KEY);
    const [h, p, sig] = m[1].split('.');
    const { b64urlDecode } = await import('../src/b64');
    const okSig = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, vapidPub, b64urlDecode(sig), new TextEncoder().encode(`${h}.${p}`));
    expect(okSig).toBe(true);
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
    expect(claims.aud).toBe('https://push.example.test');
    expect(claims.sub).toBe('https://seid.com.bo');

    const dec = await decryptPush(new Uint8Array(await req.arrayBuffer()), sub);
    expect(dec.rs).toBe(4096);
    expect(dec.idlen).toBe(65);
    const payload = JSON.parse(dec.text);
    expect(payload).toMatchObject({
      title: 'Mantenimiento en 15 días',
      body: 'Doña Rosa · Mantenimiento de aire · 12000 BTU — fecha: 27/05/2027',
      url: `/seid/app/#/registro/${reg.id}`,
    });

    // Al día siguiente no se repite.
    expect((await runDailyReminders(env, new Date('2027-05-13T12:00:00Z'))).sent).toBe(0);
    expect(sent).toHaveLength(1);

    // El día del mantenimiento: aviso del día.
    await runDailyReminders(env, new Date('2027-05-27T12:00:00Z'));
    expect(sent).toHaveLength(2);
    expect(JSON.parse((await decryptPush(new Uint8Array(await sent[1].arrayBuffer()), sub)).text).title).toBe('Mantenimiento para hoy');

    // El estado viaja a la app en el pull.
    const pull = (await (await call('/sync?since=0&limit=1000', { token: s.token })).json()) as { changes: { entity: string; doc: any }[] };
    const recs = pull.changes.filter((c) => c.entity === 'recordatorios' && c.doc.registroId === reg.id);
    expect(recs.map((c) => c.doc.estado).sort()).toEqual(['enviado', 'enviado']);
  });

  it('si no hay teléfono suscrito, reintenta al día siguiente; si la suscripción murió (410) la borra', async () => {
    const { s, env } = await setup();
    const reg = { id: uuid(), tipo: 'mantenimiento', fecha: '2026-11-27', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await call('/sync', { method: 'POST', token: s.token, json: { changes: [{ entity: 'registros', doc: reg }] } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 410 }));
    const r1 = await runDailyReminders(env, new Date('2027-05-12T12:00:00Z'));
    expect(r1.sent).toBe(0);
    expect(r1.pending).toBe(1);
    const n = await testEnv.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').first<{ n: number }>();
    expect(n?.n).toBe(0);
    const st = await testEnv.DB.prepare('SELECT status FROM reminders WHERE id = ?').bind(`${reg.id}:aviso:2027-05-27`).first<{ status: string }>();
    expect(st?.status).toBe('pendiente');
  });

  it('cambiar la fecha del próximo mantenimiento reprograma los avisos', async () => {
    const { s } = await setup();
    const t0 = new Date(Date.now() - 5000).toISOString();
    const reg = { id: uuid(), tipo: 'mantenimiento', fecha: '2026-11-27', createdAt: t0, updatedAt: t0 };
    await call('/sync', { method: 'POST', token: s.token, json: { changes: [{ entity: 'registros', doc: reg }] } });
    await call('/sync', { method: 'POST', token: s.token, json: { changes: [{ entity: 'registros', doc: { ...reg, proximoMantenimiento: '2027-03-01', updatedAt: new Date().toISOString() } }] } });
    const rows = (await testEnv.DB.prepare('SELECT kind, due_on, notify_on, status FROM reminders WHERE record_id = ? ORDER BY due_on, kind').bind(reg.id).all()).results;
    expect(rows).toEqual([
      { kind: 'aviso', due_on: '2027-03-01', notify_on: '2027-02-14', status: 'pendiente' },
      { kind: 'dia', due_on: '2027-03-01', notify_on: '2027-03-01', status: 'pendiente' },
      { kind: 'aviso', due_on: '2027-05-27', notify_on: '2027-05-12', status: 'cancelado' },
      { kind: 'dia', due_on: '2027-05-27', notify_on: '2027-05-27', status: 'cancelado' },
    ]);
  });

  it('el handler scheduled del Worker corre la tarea', async () => {
    const ctrl = createScheduledController({ scheduledTime: new Date('2030-01-01T12:00:00Z'), cron: '0 12 * * *' });
    const ctx = createExecutionContext();
    await worker.scheduled(ctrl, testEnv, ctx);
    await waitOnExecutionContext(ctx);
  });

  it('expone la clave pública VAPID y valida suscripciones', async () => {
    const { s } = await setup();
    const k = await call('/push/vapid-public-key');
    if (testEnv.VAPID_PUBLIC_KEY) expect(((await k.json()) as { publicKey: string }).publicKey).toBe(testEnv.VAPID_PUBLIC_KEY);
    else expect(k.status).toBe(503); // sin secretos cargados
    expect((await call('/push/subscribe', { method: 'POST', token: s.token, json: { endpoint: 'http://inseguro', keys: { p256dh: 'a', auth: 'b' } } })).status).toBe(400);
    expect((await call('/push/subscribe', { method: 'POST', json: {} })).status).toBe(401);
  });
});
