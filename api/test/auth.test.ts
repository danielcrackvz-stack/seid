import { describe, expect, it } from 'vitest';
import { call, createUser, login, loggedIn, ORIGIN, testEnv } from './helpers';
import { hashPassword, verifyPassword } from '../src/password';
import { signJwt, verifyJwt } from '../src/jwt';

describe('contraseñas (PBKDF2)', () => {
  it('genera y verifica el hash', async () => {
    const h = await hashPassword('clave-segura-123', 10_000);
    expect(h).toMatch(/^pbkdf2_sha256\$10000\$/);
    expect(await verifyPassword('clave-segura-123', h)).toBe(true);
    expect(await verifyPassword('clave-segura-124', h)).toBe(false);
    expect(await verifyPassword('x', 'basura')).toBe(false);
  });
  it('usa 40000 iteraciones por defecto (cabe en el CPU del plan gratis)', async () => {
    expect(await hashPassword('otra-clave-larga')).toMatch(/^pbkdf2_sha256\$40000\$/);
  });
});

describe('JWT HS256', () => {
  it('firma, verifica y rechaza manipulaciones o vencidos', async () => {
    const now = Math.floor(Date.now() / 1000);
    const t = await signJwt({ sub: 'u1', tv: 1, iat: now, exp: now + 60 }, 's3cr3t');
    expect((await verifyJwt(t, 's3cr3t'))?.sub).toBe('u1');
    expect(await verifyJwt(t, 'otro')).toBeNull();
    const [h, , s] = t.split('.');
    const fake = btoa(JSON.stringify({ sub: 'admin', tv: 1, iat: now, exp: now + 60 })).replace(/=+$/, '');
    expect(await verifyJwt(`${h}.${fake}.${s}`, 's3cr3t')).toBeNull();
    expect(await verifyJwt(t, 's3cr3t', now + 61)).toBeNull();
  });
});

describe('login', () => {
  it('entrega un token de larga duración y /auth/me lo acepta', async () => {
    const u = await createUser();
    const res = await login(u.email.toUpperCase(), u.password, { deviceId: crypto.randomUUID(), deviceName: 'Celular de Abel' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; expiresAt: string; user: { email: string } };
    expect(body.user.email).toBe(u.email);
    const days = (Date.parse(body.expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(360);
    const me = await call('/auth/me', { token: body.token });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { user: { id: string } }).user.id).toBe(u.id);
    const dev = await testEnv.DB.prepare('SELECT name FROM devices WHERE user_id = ?').bind(u.id).first<{ name: string }>();
    expect(dev?.name).toBe('Celular de Abel');
  });

  it('rechaza contraseña incorrecta y usuarios inexistentes con el mismo mensaje', async () => {
    const u = await createUser();
    const a = await login(u.email, 'mala-clave-xx', {}, '192.0.2.1');
    const b = await login('nadie@seid.test', 'mala-clave-xx', {}, '192.0.2.1');
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(await a.json()).toEqual(await b.json());
  });

  it('bloquea tras 5 intentos fallidos por correo (429), aunque luego la clave sea correcta', async () => {
    const u = await createUser();
    for (let i = 0; i < 5; i++) expect((await login(u.email, 'mala-clave-xx', {}, `192.0.2.${10 + i}`)).status).toBe(401);
    const blocked = await login(u.email, u.password, {}, '192.0.2.99');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('bloquea una IP que prueba muchos correos', async () => {
    for (let i = 0; i < 20; i++) await login(`x${i}@seid.test`, 'mala-clave-xx', {}, '192.0.2.200');
    const u = await createUser();
    expect((await login(u.email, u.password, {}, '192.0.2.200')).status).toBe(429);
    expect((await login(u.email, u.password, {}, '192.0.2.201')).status).toBe(200);
  });

  it('no existe registro público', async () => {
    expect((await call('/auth/register', { method: 'POST', json: { email: 'a@b.co', password: '1234567890' } })).status).toBe(404);
    expect((await call('/users', { method: 'POST', json: {} })).status).toBe(404);
  });

  it('exige token en rutas protegidas y rechaza tokens manipulados', async () => {
    expect((await call('/sync')).status).toBe(401);
    expect((await call('/export')).status).toBe(401);
    const { token } = await loggedIn();
    expect((await call('/sync', { token: token.slice(0, -2) + 'xx' })).status).toBe(401);
  });

  it('cambiar la contraseña invalida los tokens anteriores', async () => {
    const s = await loggedIn();
    const res = await call('/auth/password', { method: 'POST', token: s.token, json: { currentPassword: s.password, newPassword: 'nueva-clave-larga-1' } });
    expect(res.status).toBe(200);
    const { token: nuevo } = (await res.json()) as { token: string };
    expect((await call('/auth/me', { token: s.token })).status).toBe(401);
    expect((await call('/auth/me', { token: nuevo })).status).toBe(200);
    expect((await login(s.email, 'nueva-clave-larga-1', {}, '192.0.2.150')).status).toBe(200);
  });

  it('usuario deshabilitado no puede usar su token', async () => {
    const s = await loggedIn();
    await testEnv.DB.prepare('UPDATE users SET disabled = 1 WHERE id = ?').bind(s.id).run();
    expect((await call('/auth/me', { token: s.token })).status).toBe(401);
  });
});

describe('CORS y cabeceras', () => {
  it('permite solo los orígenes configurados', async () => {
    const ok = await call('/sync', { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    const bad = await call('/sync', { method: 'OPTIONS', headers: { Origin: 'https://malo.example', 'Access-Control-Request-Method': 'POST' } });
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const dom = await call('/health', { headers: { Origin: 'https://seid.com.bo' } });
    expect(dom.headers.get('Access-Control-Allow-Origin')).toBe('https://seid.com.bo');
  });
  it('health responde y no se cachea', async () => {
    const r = await call('/health');
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
