import type { MiddlewareHandler } from 'hono';
import type { AppEnv, Env } from './env';
import { num } from './env';
import { signJwt, verifyJwt } from './jwt';

export const LOGIN_LIMITS = {
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
  maxPerEmail: 5,
  maxPerIp: 20,
};

type Attempt = { key: string; failures: number; first_at: number; locked_until: number };

export async function loginLocked(env: Env, keys: string[], now = Date.now()): Promise<number> {
  const rows = (await env.DB.prepare(`SELECT * FROM login_attempts WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all<Attempt>()).results;
  const until = Math.max(0, ...rows.map((r) => r.locked_until));
  return until > now ? until : 0;
}

export async function recordLoginFailure(env: Env, emailKey: string, ipKey: string, now = Date.now()) {
  const rows = (await env.DB.prepare('SELECT * FROM login_attempts WHERE key IN (?, ?)').bind(emailKey, ipKey).all<Attempt>()).results;
  const stmts = [[emailKey, LOGIN_LIMITS.maxPerEmail], [ipKey, LOGIN_LIMITS.maxPerIp]].map(([key, max]) => {
    const r = rows.find((x) => x.key === key);
    const fresh = !r || r.first_at < now - LOGIN_LIMITS.windowMs;
    const failures = fresh ? 1 : r!.failures + 1;
    const first = fresh ? now : r!.first_at;
    const locked = failures >= (max as number) ? now + LOGIN_LIMITS.lockMs : (r?.locked_until ?? 0);
    return env.DB.prepare(
      'INSERT INTO login_attempts (key, failures, first_at, locked_until) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, first_at = excluded.first_at, locked_until = excluded.locked_until',
    ).bind(key, failures, first, locked);
  });
  await env.DB.batch(stmts);
}

export async function issueToken(env: Env, user: { id: string; token_version: number }, deviceId: string | null) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + num(env.TOKEN_TTL_DAYS, 365) * 86_400;
  const token = await signJwt({ sub: user.id, did: deviceId, tv: user.token_version, iat, exp }, env.JWT_SECRET);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

type UserRow = { id: string; email: string; name: string; role: string; token_version: number; disabled: number };

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const h = c.req.header('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return c.json({ error: 'no_autenticado', message: 'Inicie sesión.' }, 401);
  if (!c.env.JWT_SECRET) return c.json({ error: 'servidor_sin_configurar', message: 'Falta JWT_SECRET.' }, 500);
  const claims = await verifyJwt(m[1].trim(), c.env.JWT_SECRET);
  if (!claims) return c.json({ error: 'token_invalido', message: 'La sesión venció. Inicie sesión de nuevo.' }, 401);
  const u = await c.env.DB.prepare('SELECT id, email, name, role, token_version, disabled FROM users WHERE id = ?').bind(claims.sub).first<UserRow>();
  if (!u || u.disabled || u.token_version !== claims.tv) {
    return c.json({ error: 'token_invalido', message: 'La sesión ya no es válida. Inicie sesión de nuevo.' }, 401);
  }
  c.set('user', { id: u.id, email: u.email, name: u.name, role: u.role, deviceId: claims.did ?? null });
  await next();
};
