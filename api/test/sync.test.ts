import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import { call, loggedIn, testEnv, uuid } from './helpers';
import { pushChanges } from '../src/sync';
import { getBlob } from '../src/photos';

type Res = { status: string; reason?: string; doc?: Record<string, unknown>; id: string; entity: string };

async function push(token: string, changes: unknown[], deviceId?: string) {
  const r = await call('/sync', { method: 'POST', token, json: { deviceId, changes } });
  expect(r.status).toBe(200);
  return ((await r.json()) as { results: Res[] }).results;
}
async function pull(token: string, since = 0, limit?: number) {
  const r = await call(`/sync?since=${since}${limit ? `&limit=${limit}` : ''}`, { token });
  expect(r.status).toBe(200);
  return (await r.json()) as { cursor: number; hasMore: boolean; changes: { entity: string; seq: number; doc: Record<string, any> }[] };
}
const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();

function registro(over: Record<string, unknown> = {}) {
  const t = iso(-60_000);
  return {
    id: uuid(), tipo: 'mantenimiento', servicio: 'mantenimiento-aire', clienteId: uuid(), fecha: '2026-11-27',
    estado: 'terminado', equipo: { tipo: 'Split', capacidadBTU: '12000' }, core: { ot: 'OT-0001', precio: 665 },
    createdAt: t, updatedAt: t, synced: false, ...over,
  };
}

describe('POST /sync (push) y GET /sync (pull)', () => {
  it('guarda clientes, registros y eventos y los devuelve en el pull', async () => {
    const s = await loggedIn();
    const cli = { id: uuid(), nombre: 'Doña Rosa', telefono: '70000000', createdAt: iso(-1000), updatedAt: iso(-1000) };
    const reg = registro({ clienteId: cli.id });
    const ev = { id: uuid(), registroId: reg.id, tipo: 'imprevisto', texto: 'Faltó un repuesto', createdAt: iso() };
    const res = await push(s.token, [{ entity: 'clientes', doc: cli }, { entity: 'registros', doc: reg }, { entity: 'eventos', doc: ev }], s.deviceId);
    expect(res.map((r) => r.status)).toEqual(['ok', 'ok', 'ok']);

    const p = await pull(s.token, 0);
    const mine = p.changes.filter((c) => [cli.id, reg.id, ev.id].includes(c.doc.id));
    expect(mine.map((c) => c.entity).sort()).toEqual(['clientes', 'eventos', 'registros']);
    const r = mine.find((c) => c.entity === 'registros')!.doc;
    expect(r.synced).toBeUndefined(); // campo local de la app, no se guarda
    expect(r.core).toEqual({ ot: 'OT-0001', precio: 665 });
    expect(p.cursor).toBeGreaterThan(0);
    const again = await pull(s.token, p.cursor);
    expect(again.changes.length).toBe(0);
    const row = await testEnv.DB.prepare('SELECT type, next_due_on, device_id FROM records WHERE id = ?').bind(reg.id).first();
    expect(row).toEqual({ type: 'mantenimiento', next_due_on: '2027-05-27', device_id: s.deviceId });
  });

  it('es idempotente: reenviar el mismo lote no duplica ni cambia nada', async () => {
    const s = await loggedIn();
    const reg = registro();
    const ev = { id: uuid(), registroId: reg.id, tipo: 'nota', texto: 'Listo', createdAt: iso() };
    const batch = [{ entity: 'registros', doc: reg }, { entity: 'eventos', doc: ev }];
    await push(s.token, batch);
    const before = await pull(s.token, 0);
    const res2 = await push(s.token, batch);
    expect(res2.map((r) => r.status)).toEqual(['duplicate', 'duplicate']);
    const after = await pull(s.token, before.cursor);
    expect(after.changes.filter((c) => c.doc.id === reg.id || c.doc.id === ev.id)).toEqual([]);
    const n = await testEnv.DB.prepare('SELECT COUNT(*) AS n FROM record_events WHERE id = ?').bind(ev.id).first<{ n: number }>();
    expect(n?.n).toBe(1);
  });

  it('last-write-wins en campos editables; lo viejo vuelve como stale con la versión del servidor', async () => {
    const s = await loggedIn();
    const reg = registro({ estado: 'pendiente' });
    await push(s.token, [{ entity: 'registros', doc: reg }]);
    const newer = { ...reg, estado: 'terminado', updatedAt: iso() };
    expect((await push(s.token, [{ entity: 'registros', doc: newer }]))[0].status).toBe('ok');
    const older = { ...reg, estado: 'en-curso', updatedAt: iso(-3_600_000) };
    const r = (await push(s.token, [{ entity: 'registros', doc: older }]))[0];
    expect(r.status).toBe('stale');
    expect(r.doc?.estado).toBe('terminado');
  });

  it('rechaza cambios en campos inmutables (tipo, servicio, cliente, core, firmas)', async () => {
    const s = await loggedIn();
    const reg = registro({ firmaCliente: 'data:image/png;base64,AAAA' });
    await push(s.token, [{ entity: 'registros', doc: reg }]);
    const cases: Record<string, unknown>[] = [
      { servicio: 'gas' }, { tipo: 'trabajo' }, { clienteId: uuid() }, { core: { ot: 'OT-0001', precio: 1 } },
      { firmaCliente: 'data:image/png;base64,BBBB' }, { core: null }, { createdAt: iso(-999_999) },
    ];
    for (const change of cases) {
      const r = (await push(s.token, [{ entity: 'registros', doc: { ...reg, ...change, updatedAt: iso() } }]))[0];
      expect(r.status, JSON.stringify(change)).toBe('rejected');
      expect(r.reason).toMatch(/^inmutable:/);
      expect(r.doc?.servicio).toBe('mantenimiento-aire');
    }
    const row = await testEnv.DB.prepare('SELECT doc FROM records WHERE id = ?').bind(reg.id).first<{ doc: string }>();
    expect(JSON.parse(row!.doc).core).toEqual(reg.core);
  });

  it('un campo fijo vacío se puede completar una vez, y si la app no lo reenvía se conserva', async () => {
    const s = await loggedIn();
    const reg = registro({ firmaTecnico: '' });
    await push(s.token, [{ entity: 'registros', doc: reg }]);
    const signed = { ...reg, firmaTecnico: 'data:image/png;base64,CCCC', updatedAt: iso() };
    expect((await push(s.token, [{ entity: 'registros', doc: signed }]))[0].status).toBe('ok');
    const { core: _c, firmaTecnico: _f, ...partial } = { ...signed, estado: 'pagado', updatedAt: iso(1000) };
    expect((await push(s.token, [{ entity: 'registros', doc: partial }]))[0].status).toBe('ok');
    const row = await testEnv.DB.prepare('SELECT doc, status FROM records WHERE id = ?').bind(reg.id).first<{ doc: string; status: string }>();
    const doc = JSON.parse(row!.doc);
    expect(row!.status).toBe('pagado');
    expect(doc.core).toEqual(reg.core);
    expect(doc.firmaTecnico).toBe('data:image/png;base64,CCCC');
  });

  it('eventos y firmas son solo-agregar', async () => {
    const s = await loggedIn();
    const ev = { id: uuid(), registroId: uuid(), tipo: 'ajuste_costo', monto: 150, texto: 'Tubería extra', createdAt: iso() };
    const fi = { id: uuid(), registroId: ev.registroId, rol: 'cliente', nombre: 'Rosa', imagen: 'data:image/png;base64,AAAA', createdAt: iso() };
    await push(s.token, [{ entity: 'eventos', doc: ev }, { entity: 'firmas', doc: fi }]);
    const r = await push(s.token, [{ entity: 'eventos', doc: { ...ev, monto: 10 } }, { entity: 'firmas', doc: { ...fi, imagen: 'data:image/png;base64,ZZZZ' } }]);
    expect(r.map((x) => [x.status, x.reason])).toEqual([['rejected', 'solo_agregar'], ['rejected', 'solo_agregar']]);
    expect(r[0].doc?.monto).toBe(150);
    expect((await push(s.token, [{ entity: 'eventos', doc: { id: uuid(), texto: 'sin registro', createdAt: iso() } }]))[0].reason).toBe('registroId_requerido');
  });

  it('valida entradas', async () => {
    const s = await loggedIn();
    const r = await push(s.token, [
      { entity: 'usuarios', doc: { id: uuid() } },
      { entity: 'clientes', doc: { id: 'x', updatedAt: iso() } },
      { entity: 'clientes', doc: { id: uuid(), updatedAt: 'ayer' } },
      { entity: 'clientes', doc: 'texto' },
    ]);
    expect(r.map((x) => x.reason)).toEqual(['entidad_desconocida', 'id_invalido', 'updatedAt_invalido', 'documento_invalido']);
    const many = Array.from({ length: 101 }, () => ({ entity: 'clientes', doc: { id: uuid(), updatedAt: iso() } }));
    expect((await call('/sync', { method: 'POST', token: s.token, json: { changes: many } })).status).toBe(413);
    expect((await call('/sync', { method: 'POST', token: s.token, json: { nada: 1 } })).status).toBe(400);
  });

  it('un reloj adelantado no puede "ganar para siempre"', async () => {
    const s = await loggedIn();
    const cli = { id: uuid(), nombre: 'A', updatedAt: iso(365 * 86_400_000) };
    await push(s.token, [{ entity: 'clientes', doc: cli }]);
    const row = await testEnv.DB.prepare('SELECT updated_at FROM clients WHERE id = ?').bind(cli.id).first<{ updated_at: string }>();
    expect(Date.parse(row!.updated_at)).toBeLessThanOrEqual(Date.now() + 1000);
    expect((await push(s.token, [{ entity: 'clientes', doc: { ...cli, nombre: 'B', updatedAt: iso(5000) } }]))[0].status).toBe('ok');
  });

  it('borrado lógico: deletedAt viaja en el pull y cancela recordatorios', async () => {
    const s = await loggedIn();
    const reg = registro();
    await push(s.token, [{ entity: 'registros', doc: reg }]);
    const p0 = await pull(s.token, 0);
    const del = { ...reg, deletedAt: iso(), updatedAt: iso() };
    await push(s.token, [{ entity: 'registros', doc: del }]);
    const p = await pull(s.token, p0.cursor);
    expect(p.changes.find((c) => c.doc.id === reg.id)?.doc.deletedAt).toBeTruthy();
    const rem = await testEnv.DB.prepare("SELECT COUNT(*) AS n FROM reminders WHERE record_id = ? AND status = 'pendiente'").bind(reg.id).first<{ n: number }>();
    expect(rem?.n).toBe(0);
  });

  it('pagina el pull sin perder ni repetir cambios', async () => {
    const s = await loggedIn();
    const start = (await pull(s.token, 0)).cursor;
    const ids = new Set<string>();
    for (let b = 0; b < 3; b++) {
      const changes = Array.from({ length: 50 }, (_, i) => {
        const id = uuid(); ids.add(id);
        return i % 2 ? { entity: 'clientes', doc: { id, nombre: `C${i}`, updatedAt: iso() } }
          : { entity: 'registros', doc: registro({ id }) };
      });
      await push(s.token, changes);
    }
    const seen: string[] = [];
    let cursor = start; let pages = 0; let more = true;
    while (more) {
      const p = await pull(s.token, cursor, 50);
      for (const c of p.changes) if (c.entity !== 'recordatorios') seen.push(c.doc.id);
      expect(p.cursor).toBeGreaterThanOrEqual(cursor);
      cursor = p.cursor; more = p.hasMore; pages++;
      expect(pages).toBeLessThan(30);
    }
    expect(pages).toBeGreaterThan(2);
    expect(new Set(seen).size).toBe(seen.length);
    for (const id of ids) expect(seen).toContain(id);
  });
});

describe('fotos', () => {
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  it('dataUrl en el push: el archivo se separa del documento y se descarga con token', async () => {
    const s = await loggedIn();
    const foto = { id: uuid(), registroId: uuid(), dataUrl: `data:image/png;base64,${PNG}`, createdAt: iso(), updatedAt: iso() };
    const r = await push(s.token, [{ entity: 'fotos', doc: foto }]);
    expect(r[0].status).toBe('ok');
    const p = await pull(s.token, 0);
    const doc = p.changes.find((c) => c.doc.id === foto.id)!.doc;
    expect(doc.dataUrl).toBeUndefined();
    expect(doc.archivo).toBe(`/fotos/${foto.id}/archivo`);
    expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
    const img = await call(`/fotos/${foto.id}/archivo`, { token: s.token });
    expect(img.status).toBe(200);
    expect(img.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await img.arrayBuffer()).length).toBe(doc.size);
    expect((await call(`/fotos/${foto.id}/archivo`)).status).toBe(401);
    // Reenviar con otra imagen: rechazado (inmutable)
    const other = `data:image/png;base64,${PNG.replace('AAAAC0', 'AAAAC1')}`;
    const r2 = await push(s.token, [{ entity: 'fotos', doc: { ...foto, dataUrl: other, updatedAt: iso(1000) } }]);
    expect(r2[0].reason).toBe('inmutable:sha256');
    // Cambiar solo la descripción, sin reenviar el archivo: ok
    const r3 = await push(s.token, [{ entity: 'fotos', doc: { id: foto.id, registroId: foto.registroId, createdAt: foto.createdAt, descripcion: 'Antes', updatedAt: iso(2000) } }]);
    expect(r3[0].status).toBe('ok');
    expect((await call(`/fotos/${foto.id}/archivo`, { token: s.token })).status).toBe(200);
  });

  it('PUT binario /fotos/:id/archivo e idempotencia', async () => {
    const s = await loggedIn();
    const id = uuid(); const registroId = uuid();
    const bytes = Uint8Array.from(atob(PNG), (c) => c.charCodeAt(0));
    const put = () => call(`/fotos/${id}/archivo?registroId=${registroId}`, { method: 'PUT', token: s.token, body: bytes, headers: { 'Content-Type': 'image/png' } });
    const a = await put();
    expect(a.status).toBe(200);
    expect(((await a.json()) as { status: string }).status).toBe('ok');
    expect(((await (await put()).json()) as { status: string }).status).toBe('duplicate');
    const bad = await call(`/fotos/${id}/archivo`, { method: 'PUT', token: s.token, body: new Uint8Array([1, 2, 3]), headers: { 'Content-Type': 'image/png' } });
    expect(bad.status).toBe(409);
    expect((await call(`/fotos/${uuid()}/archivo?registroId=${registroId}`, { method: 'PUT', token: s.token, body: 'x', headers: { 'Content-Type': 'text/html' } })).status).toBe(415);
    const big = new Uint8Array(1_000_001);
    expect((await call(`/fotos/${uuid()}/archivo?registroId=${registroId}`, { method: 'PUT', token: s.token, body: big, headers: { 'Content-Type': 'image/jpeg' } })).status).toBe(413);
    const got = await call(`/fotos/${id}/archivo`, { token: s.token });
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(bytes);
  });
});

describe('fotos en R2 (opcional)', () => {
  it('con el binding FOTOS el archivo va a R2 y no a D1', async () => {
    const r2 = (env as unknown as { FOTOS_TEST: R2Bucket }).FOTOS_TEST;
    const e = { ...testEnv, FOTOS: r2 };
    const id = uuid();
    const user = { id: 'u', email: 'a@b.co', name: 'A', role: 'admin', deviceId: null };
    const res = await pushChanges(e, user, null, [{ entity: 'fotos', doc: { id, registroId: uuid(), dataUrl: 'data:image/jpeg;base64,/9j/AAAA', createdAt: iso(), updatedAt: iso() } }]);
    expect(res[0].status).toBe('ok');
    expect(await r2.head(`fotos/${id}`)).not.toBeNull();
    expect(await testEnv.DB.prepare('SELECT id FROM photo_blobs WHERE id = ?').bind(id).first()).toBeNull();
    const row = await testEnv.DB.prepare('SELECT storage FROM photos WHERE id = ?').bind(id).first<{ storage: string }>();
    expect(row?.storage).toBe('r2');
    expect((await getBlob(e, id, 'r2'))?.length).toBe(6);
  });
});

describe('GET /export', () => {
  it('devuelve un respaldo JSON completo (con fotos opcionales)', async () => {
    const s = await loggedIn();
    const reg = registro();
    await push(s.token, [
      { entity: 'registros', doc: reg },
      { entity: 'fotos', doc: { id: uuid(), registroId: reg.id, dataUrl: 'data:image/jpeg;base64,/9j/AAAA', createdAt: iso(), updatedAt: iso() } },
    ]);
    const r = await call('/export', { token: s.token });
    expect(r.status).toBe(200);
    expect(r.headers.get('Content-Disposition')).toMatch(/seid-respaldo-\d{4}-\d{2}-\d{2}\.json/);
    const b = (await r.json()) as Record<string, any>;
    expect(b.app).toBe('SEID');
    for (const k of ['clientes', 'registros', 'eventos', 'firmas', 'fotos', 'recordatorios', 'usuarios', 'dispositivos']) expect(Array.isArray(b[k])).toBe(true);
    expect(b.registros.some((d: any) => d.id === reg.id)).toBe(true);
    expect(JSON.stringify(b.usuarios)).not.toContain('pbkdf2');
    expect(b.fotos.every((f: any) => !f.dataUrl)).toBe(true);
    const withPhotos = (await (await call('/export?fotos=1', { token: s.token })).json()) as Record<string, any>;
    expect(withPhotos.fotos.find((f: any) => f.registroId === reg.id).dataUrl).toBe('data:image/jpeg;base64,/9j/AAAA');
  });
});
