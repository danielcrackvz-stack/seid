// Ejecuta wrangler con el mismo Node, sin pasar por la shell (funciona igual en Windows).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(path.join(root, 'package.json'));

export function wranglerBin() {
  if (process.env.SEID_WRANGLER_JS) return process.env.SEID_WRANGLER_JS; // solo para pruebas
  const pkg = require.resolve('wrangler/package.json');
  return path.join(path.dirname(pkg), 'bin', 'wrangler.js');
}

export function wrangler(args, { input, capture = true } = {}) {
  const r = spawnSync(process.execPath, [wranglerBin(), ...args], {
    cwd: root,
    input,
    encoding: 'utf8',
    stdio: capture ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'inherit', 'inherit'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    maxBuffer: 64 * 1024 * 1024,
  });
  let status = r.status ?? 1;
  // Node 24 en Windows a veces aborta al salir (libuv UV_HANDLE_CLOSING, 0xC0000409) después de terminar bien.
  if (status === 3221226505 && /UV_HANDLE_CLOSING/.test(r.stderr ?? '')) status = 0;
  return { status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** Ejecuta SQL en D1 y devuelve las filas del último resultado (usa --json). */
export function d1Query(sql, { remote = true, db = 'seid-db' } = {}) {
  const r = wrangler(['d1', 'execute', db, remote ? '--remote' : '--local', '--json', '--yes', '--command', sql]);
  if (r.status !== 0) throw new Error(`wrangler d1 execute falló:\n${r.stderr || r.stdout}`);
  const start = r.stdout.indexOf('[');
  const parsed = JSON.parse(r.stdout.slice(start));
  const last = parsed[parsed.length - 1];
  return last?.results ?? [];
}

export const sqlString = (s) => `'${String(s).replace(/'/g, "''")}'`;
