#!/usr/bin/env node
/**
 * Crea (o actualiza) un usuario de la app. No hay registro público: este script es la única forma.
 *
 *   npm run create-user -- --email abel@ejemplo.com --name "Ing. Abel Galarza" --generate
 *   npm run create-user -- --email abel@ejemplo.com --name "Abel" --password "..."   (o variable SEID_PASSWORD)
 *   npm run create-user -- --email abel@ejemplo.com --reset --generate              (nueva contraseña; cierra sesiones)
 *
 * Opciones: --local (base local de wrangler dev; por defecto --remote), --role admin|tecnico,
 *           --if-missing (no hace nada si ya existe), --print-sql (no ejecuta, solo muestra el SQL).
 */
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { generatePassword, hashPassword } from './lib/password.mjs';
import { d1Query, sqlString } from './lib/wrangler.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[k] = next; i++; } else out[k] = true;
  }
  return out;
}

async function askHidden(question) {
  if (!process.stdin.isTTY) throw new Error('Sin terminal interactiva: use --password, SEID_PASSWORD o --generate.');
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s); };
  const answer = await new Promise((res) => rl.question(question, res));
  rl.close();
  process.stdout.write('\n');
  return answer;
}

const args = parseArgs(process.argv.slice(2));
const email = String(args.email || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Falta --email válido. Ejemplo: npm run create-user -- --email abel@ejemplo.com --name "Abel" --generate');
  process.exit(2);
}
const remote = !args.local;
const role = args.role === 'tecnico' ? 'tecnico' : 'admin';
const name = String(args.name || email.split('@')[0]);

try {
  let existing = [];
  if (!args['print-sql']) existing = d1Query(`SELECT id FROM users WHERE email = ${sqlString(email)}`, { remote });
  if (existing.length && args['if-missing']) {
    console.log(`El usuario ${email} ya existe; no se cambió nada.`);
    process.exit(0);
  }
  if (existing.length && !args.reset) {
    console.error(`El usuario ${email} ya existe. Use --reset para ponerle una contraseña nueva.`);
    process.exit(3);
  }

  let password = typeof args.password === 'string' ? args.password : process.env.SEID_PASSWORD || '';
  let generated = false;
  if (!password && args.generate) { password = generatePassword(); generated = true; }
  if (!password) {
    password = await askHidden('Contraseña (mínimo 10 caracteres): ');
    const again = await askHidden('Repita la contraseña: ');
    if (again !== password) throw new Error('Las contraseñas no coinciden.');
  }
  if (password.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres.');

  const iterations = Number(args.iterations) || 40_000;
  const hash = await hashPassword(password, iterations);
  const now = new Date().toISOString();
  const sql = existing.length
    ? `UPDATE users SET password_hash = ${sqlString(hash)}, token_version = token_version + 1, disabled = 0, updated_at = ${sqlString(now)}${args.name ? `, name = ${sqlString(name)}` : ''} WHERE email = ${sqlString(email)}`
    : `INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES (${sqlString(randomUUID())}, ${sqlString(email)}, ${sqlString(name)}, ${sqlString(role)}, ${sqlString(hash)}, ${sqlString(now)}, ${sqlString(now)})`;

  if (args['print-sql']) { console.log(sql); process.exit(0); }
  d1Query(sql, { remote });
  console.log(existing.length ? `Contraseña actualizada para ${email} (se cerraron sus sesiones).` : `Usuario creado: ${email} (${name}, ${role}).`);
  if (generated) {
    console.log('');
    console.log(`  Correo:     ${email}`);
    console.log(`  Contraseña: ${password}`);
    console.log('');
    console.log('Guárdela ahora en un lugar seguro: no se vuelve a mostrar.');
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
