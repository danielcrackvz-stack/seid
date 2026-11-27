import type { Env } from './env';
import { localDate } from './dates';
import { buildReminderPayload, reminderAction, reminderConfig } from './reminders';
import { sendPush, type VapidKeys } from './push/webpush';

export function vapidKeys(env: Env): VapidKeys | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT || 'https://danielcrackvz-stack.github.io/seid/',
  };
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string; user_id: string };

export async function loadSubscriptions(env: Env, userId?: string): Promise<SubRow[]> {
  const q = userId
    ? env.DB.prepare('SELECT s.* FROM push_subscriptions s JOIN users u ON u.id = s.user_id WHERE u.disabled = 0 AND s.user_id = ?').bind(userId)
    : env.DB.prepare('SELECT s.* FROM push_subscriptions s JOIN users u ON u.id = s.user_id WHERE u.disabled = 0');
  return (await q.all<SubRow>()).results;
}

/**
 * Envía un aviso a las suscripciones dadas. No escribe en D1: agrega las sentencias a `updates`
 * (así el cron hace una sola escritura y no supera el límite de subpeticiones del plan gratis).
 * Las suscripciones que el servicio da por muertas (404/410) se borran.
 */
export async function sendToSubs(env: Env, subs: SubRow[], payload: unknown, updates: D1PreparedStatement[]) {
  const vapid = vapidKeys(env);
  if (!vapid) return { sent: 0, failed: 0, removed: 0, total: subs.length, error: 'vapid_no_configurado' };
  const now = new Date().toISOString();
  let sent = 0, failed = 0, removed = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      const r = await sendPush(s, payload, vapid, { ttl: 3 * 86_400, urgency: 'normal' });
      if (r.ok) {
        sent++;
        updates.push(env.DB.prepare('UPDATE push_subscriptions SET last_success_at = ?, failures = 0 WHERE id = ?').bind(now, s.id));
      } else if (r.gone) {
        removed++;
        (s as SubRow & { dead?: boolean }).dead = true;
        updates.push(env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(s.id));
      } else {
        failed++;
        updates.push(env.DB.prepare('UPDATE push_subscriptions SET failures = failures + 1 WHERE id = ?').bind(s.id));
      }
    } catch {
      failed++;
      updates.push(env.DB.prepare('UPDATE push_subscriptions SET failures = failures + 1 WHERE id = ?').bind(s.id));
    }
  }));
  return { sent, failed, removed, total: subs.length };
}

export async function broadcast(env: Env, payload: unknown, userId?: string) {
  const subs = await loadSubscriptions(env, userId);
  const updates: D1PreparedStatement[] = [];
  const r = await sendToSubs(env, subs, payload, updates);
  if (updates.length) await env.DB.batch(updates);
  return r;
}

/** Máximo de recordatorios por corrida (límite de 50 subpeticiones del plan gratis). Los demás, mañana. */
export const MAX_REMINDERS_PER_RUN = 10;

type DueRow = {
  id: string; record_id: string; kind: string; due_on: string; notify_on: string;
  service: string | null; doc: string; client_name: string | null;
};

/** Tarea diaria (Cron Trigger): envía los recordatorios que tocan hoy. Cada uno se envía una sola vez. */
export async function runDailyReminders(env: Env, now = new Date()) {
  const cfg = reminderConfig(env);
  const today = localDate(now, cfg.timeZone);
  const nowIso = now.toISOString();
  const due = (await env.DB.prepare(
    `SELECT r.id, r.record_id, r.kind, r.due_on, r.notify_on, rec.service, rec.doc, c.name AS client_name
       FROM reminders r
       JOIN records rec ON rec.id = r.record_id
       LEFT JOIN clients c ON c.id = rec.client_id
      WHERE r.status = 'pendiente' AND r.notify_on <= ? AND rec.deleted_at IS NULL
      ORDER BY r.notify_on LIMIT ?`,
  ).bind(today, MAX_REMINDERS_PER_RUN * 2).all<DueRow>()).results;

  const report = { today, considered: due.length, sent: 0, expired: 0, pending: 0 };
  // Si hay "aviso" y "dia" del mismo registro el mismo día, basta con uno.
  const seenRecord = new Set<string>();
  const updates: D1PreparedStatement[] = [];
  const mark = (id: string, status: string) => {
    updates.push(env.DB.prepare("UPDATE counters SET value = value + 1 WHERE name = 'seq'"));
    updates.push(env.DB.prepare(
      `UPDATE reminders SET status = ?, sent_at = CASE WHEN ? = 'enviado' THEN ? ELSE sent_at END, updated_at = ?,
              server_seq = (SELECT value FROM counters WHERE name = 'seq') WHERE id = ? AND status = 'pendiente'`,
    ).bind(status, status, nowIso, nowIso, id));
  };

  let subs = due.length ? await loadSubscriptions(env) : [];
  for (const r of due) {
    if (report.sent >= MAX_REMINDERS_PER_RUN) { report.pending++; continue; }
    if (reminderAction(r.kind, r.due_on, today) === 'vencido') { mark(r.id, 'vencido'); report.expired++; continue; }
    if (seenRecord.has(r.record_id)) { mark(r.id, 'enviado'); continue; }
    let doc: Record<string, unknown> = {};
    try { doc = JSON.parse(r.doc); } catch { /* */ }
    const payload = buildReminderPayload({
      reminderId: r.id, recordId: r.record_id, kind: r.kind, dueOn: r.due_on, today,
      service: r.service, doc, clientName: r.client_name, appBaseUrl: env.APP_BASE_URL || '/seid/app/',
    });
    const res = await sendToSubs(env, subs, payload, updates);
    subs = subs.filter((s) => !(s as { dead?: boolean }).dead);
    if (res.sent > 0) { mark(r.id, 'enviado'); report.sent++; seenRecord.add(r.record_id); }
    else report.pending++; // sin teléfonos suscritos o falló: se reintenta mañana
  }
  // Limpieza de intentos de login viejos.
  updates.push(env.DB.prepare('DELETE FROM login_attempts WHERE first_at < ? AND locked_until < ?').bind(now.getTime() - 86_400_000, now.getTime()));
  await env.DB.batch(updates);
  return report;
}
