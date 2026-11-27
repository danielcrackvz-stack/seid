export interface Env {
  DB: D1Database;
  /** Opcional: bucket R2 para fotos. Si no existe, las fotos se guardan en D1. */
  FOTOS?: R2Bucket;

  // Secretos (wrangler secret put)
  JWT_SECRET: string;
  VAPID_PUBLIC_KEY?: string; // base64url, punto P-256 sin comprimir (65 bytes)
  VAPID_PRIVATE_KEY?: string; // base64url, escalar "d" (32 bytes)

  // Variables ([vars] en wrangler.toml)
  ALLOWED_ORIGINS?: string; // lista separada por comas
  APP_BASE_URL?: string; // p. ej. "/seid/app/" -> url de la notificación "/seid/app/#/registro/<id>"
  VAPID_SUBJECT?: string; // "mailto:..." o "https://..."
  TIMEZONE?: string; // "America/La_Paz"
  REMINDER_MONTHS?: string; // "6"
  REMINDER_DAYS_BEFORE?: string; // "15"
  REMIND_DAY_OF?: string; // "true" | "false"
  REMIND_SERVICES?: string; // servicios que generan recordatorio aunque el tipo sea "trabajo"
  TOKEN_TTL_DAYS?: string; // "365"
  PBKDF2_ITERATIONS?: string; // para hashes nuevos
  PHOTO_MAX_BYTES?: string; // tamaño máximo de una foto ya comprimida
  DOC_MAX_BYTES?: string; // tamaño máximo de un documento JSON
}

export function num(v: string | undefined, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== '' ? n : def;
}

export function list(v: string | undefined, def: string[] = []): string[] {
  if (v === undefined) return def;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export function bool(v: string | undefined, def: boolean): boolean {
  if (v === undefined || v === '') return def;
  return /^(1|true|si|sí|yes)$/i.test(v.trim());
}

export type AuthUser = { id: string; email: string; name: string; role: string; deviceId: string | null };
export type AppEnv = { Bindings: Env; Variables: { user: AuthUser } };
