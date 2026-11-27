import type { Env } from './env';
import { bool, list, num } from './env';
import { addDays, addMonths, daysBetween, humanDate, isDate, toLocalDate } from './dates';

export type ReminderConfig = {
  months: number;
  daysBefore: number;
  dayOf: boolean;
  services: string[];
  timeZone: string;
};

export const DEFAULT_REMIND_SERVICES = ['mantenimiento-aire', 'instalacion-aire', 'instalacion-inverter'];

export function reminderConfig(env: Partial<Env>): ReminderConfig {
  return {
    months: num(env.REMINDER_MONTHS, 6),
    daysBefore: num(env.REMINDER_DAYS_BEFORE, 15),
    dayOf: bool(env.REMIND_DAY_OF, true),
    services: list(env.REMIND_SERVICES, DEFAULT_REMIND_SERVICES),
    timeZone: env.TIMEZONE || 'America/La_Paz',
  };
}

/**
 * Próxima fecha de mantenimiento de un registro (YYYY-MM-DD) o null si no lleva recordatorio.
 * Prioridad:
 *  1. doc.recordatorio === false            -> sin recordatorio
 *  2. doc.proximoMantenimiento presente     -> esa fecha (null o '' = sin recordatorio)
 *  3. tipo 'mantenimiento' o servicio en REMIND_SERVICES -> fecha (o createdAt) + N meses
 */
export function computeNextDue(doc: Record<string, unknown>, type: string, cfg: ReminderConfig): string | null {
  if (doc.recordatorio === false) return null;
  if ('proximoMantenimiento' in doc) {
    const v = doc.proximoMantenimiento;
    if (v === null || v === '' || v === undefined) return null;
    return toLocalDate(v, cfg.timeZone);
  }
  const service = typeof doc.servicio === 'string' ? doc.servicio : '';
  if (type !== 'mantenimiento' && !cfg.services.includes(service)) return null;
  const base = toLocalDate(doc.fecha, cfg.timeZone) ?? toLocalDate(doc.createdAt, cfg.timeZone);
  if (!base) return null;
  return addMonths(base, cfg.months);
}

export type PlannedReminder = { id: string; kind: 'aviso' | 'dia'; due_on: string; notify_on: string };

export function plannedReminders(recordId: string, dueOn: string | null, cfg: ReminderConfig): PlannedReminder[] {
  if (!dueOn || !isDate(dueOn)) return [];
  const out: PlannedReminder[] = [];
  if (cfg.daysBefore > 0) {
    out.push({ id: `${recordId}:aviso:${dueOn}`, kind: 'aviso', due_on: dueOn, notify_on: addDays(dueOn, -cfg.daysBefore) });
  }
  if (cfg.dayOf) out.push({ id: `${recordId}:dia:${dueOn}`, kind: 'dia', due_on: dueOn, notify_on: dueOn });
  return out;
}

/** Días de gracia para el aviso "del día" si el cron no corrió. */
export const DAY_OF_GRACE = 7;

/** Qué hacer hoy con un recordatorio pendiente cuya notify_on ya llegó. */
export function reminderAction(kind: string, dueOn: string, today: string): 'enviar' | 'vencido' {
  if (kind === 'aviso') return today <= dueOn ? 'enviar' : 'vencido';
  return daysBetween(dueOn, today) <= DAY_OF_GRACE ? 'enviar' : 'vencido';
}

const SERVICE_LABELS: Record<string, string> = {
  'instalacion-aire': 'Instalación de aire acondicionado',
  'mantenimiento-aire': 'Mantenimiento de aire',
  'instalacion-inverter': 'Instalación inverter',
  'electricidad-industrial': 'Electricidad industrial',
  'electricidad-domiciliaria': 'Electricidad domiciliaria',
  'panel-trifasico': 'Panel trifásico',
  transformadores: 'Transformadores',
  'proyectos-electricos': 'Proyectos eléctricos',
  plomeria: 'Plomería',
  gas: 'Gas',
  camaras: 'Cámaras de seguridad',
  'cerco-electrico': 'Cerco eléctrico',
  otro: 'Otro trabajo',
};

export function serviceLabel(key: string | null | undefined, doc?: Record<string, unknown>): string {
  if (doc && typeof doc.servicioLabel === 'string' && doc.servicioLabel) return doc.servicioLabel;
  if (!key) return 'Registro';
  return SERVICE_LABELS[key] ?? key.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export type ReminderPayload = { title: string; body: string; url: string; tag: string; recordId: string; reminderId: string };

export function buildReminderPayload(input: {
  reminderId: string;
  recordId: string;
  kind: string;
  dueOn: string;
  today: string;
  service: string | null;
  doc: Record<string, unknown>;
  clientName: string | null;
  appBaseUrl: string;
}): ReminderPayload {
  const days = daysBetween(input.today, input.dueOn);
  const title =
    input.kind === 'dia' || days <= 0
      ? 'Mantenimiento para hoy'
      : days === 1
        ? 'Mantenimiento mañana'
        : `Mantenimiento en ${days} días`;
  const equipo = (input.doc.equipo ?? {}) as Record<string, unknown>;
  const btu = equipo.capacidadBTU ? `${equipo.capacidadBTU} BTU` : '';
  const parts = [input.clientName || 'Cliente', serviceLabel(input.service, input.doc), btu].filter(Boolean);
  const body = `${parts.join(' · ')} — fecha: ${humanDate(input.dueOn)}`;
  const base = input.appBaseUrl || '/seid/app/';
  return {
    title,
    body,
    url: `${base}#/registro/${encodeURIComponent(input.recordId)}`,
    tag: `recordatorio-${input.recordId}`,
    recordId: input.recordId,
    reminderId: input.reminderId,
  };
}
