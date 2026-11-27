-- SEID API: esquema inicial (D1 / SQLite).
-- Convenciones:
--   * id TEXT = UUID generado en el teléfono (offline-first).
--   * doc TEXT = documento JSON completo tal como lo envía la app.
--   * server_seq = número creciente asignado por el servidor en cada cambio;
--     GET /sync?since=N devuelve todo lo que tenga server_seq > N.
--   * Fechas en ISO 8601 (UTC) salvo las de calendario (YYYY-MM-DD, hora de Bolivia).

CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO counters (name, value) VALUES ('seq', 0);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'tecnico')),
  password_hash TEXT NOT NULL,          -- pbkdf2_sha256$<iter>$<salt b64>$<hash b64>
  token_version INTEGER NOT NULL DEFAULT 1, -- subir este número invalida todas las sesiones
  disabled      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id           TEXT PRIMARY KEY,         -- deviceId generado por la app
  user_id      TEXT NOT NULL REFERENCES users(id),
  name         TEXT,
  user_agent   TEXT,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  phone       TEXT,
  doc         TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,             -- updatedAt del documento (last-write-wins)
  deleted_at  TEXT,
  updated_by  TEXT,
  device_id   TEXT,
  server_seq  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clients_seq ON clients(server_seq);

CREATE TABLE IF NOT EXISTS records (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('mantenimiento', 'trabajo')),
  service      TEXT,
  client_id    TEXT,
  status       TEXT,
  performed_on TEXT,                     -- YYYY-MM-DD (campo "fecha")
  next_due_on  TEXT,                     -- YYYY-MM-DD próximo mantenimiento (NULL = sin recordatorio)
  core         TEXT NOT NULL DEFAULT '{}', -- campos inmutables ya fijados (JSON)
  doc          TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT,
  updated_by   TEXT,
  device_id    TEXT,
  server_seq   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_records_seq ON records(server_seq);
CREATE INDEX IF NOT EXISTS idx_records_client ON records(client_id);

-- Solo se agregan filas: notas, imprevistos, cambios de estado, ajustes de costo.
CREATE TABLE IF NOT EXISTS record_events (
  id          TEXT PRIMARY KEY,
  record_id   TEXT NOT NULL,
  kind        TEXT NOT NULL,
  doc         TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  device_id   TEXT,
  server_seq  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_seq ON record_events(server_seq);
CREATE INDEX IF NOT EXISTS idx_events_record ON record_events(record_id);

-- Firmas (imagen PNG en data URL). Una vez guardada no cambia.
CREATE TABLE IF NOT EXISTS signatures (
  id          TEXT PRIMARY KEY,
  record_id   TEXT NOT NULL,
  role        TEXT,
  doc         TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  device_id   TEXT,
  server_seq  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signatures_seq ON signatures(server_seq);
CREATE INDEX IF NOT EXISTS idx_signatures_record ON signatures(record_id);

-- Metadatos de fotos. El archivo va en R2 (si existe el binding FOTOS) o en photo_blobs.
CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  record_id   TEXT NOT NULL,
  mime        TEXT,
  size        INTEGER,
  storage     TEXT,                      -- NULL (sin archivo), 'inline', 'd1' o 'r2'
  doc         TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  updated_by  TEXT,
  device_id   TEXT,
  server_seq  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_seq ON photos(server_seq);
CREATE INDEX IF NOT EXISTS idx_photos_record ON photos(record_id);

CREATE TABLE IF NOT EXISTS photo_blobs (
  id    TEXT PRIMARY KEY,                 -- = photos.id
  data  BLOB NOT NULL
);

-- Recordatorios generados por el servidor a partir de records.next_due_on.
CREATE TABLE IF NOT EXISTS reminders (
  id          TEXT PRIMARY KEY,          -- <recordId>:<kind>:<due_on>
  record_id   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('aviso', 'dia')),
  due_on      TEXT NOT NULL,             -- fecha del mantenimiento (YYYY-MM-DD)
  notify_on   TEXT NOT NULL,             -- fecha en que se avisa (YYYY-MM-DD)
  status      TEXT NOT NULL DEFAULT 'pendiente'
              CHECK (status IN ('pendiente', 'enviado', 'cancelado', 'vencido', 'sin_destino')),
  sent_at     TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  server_seq  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(status, notify_on);
CREATE INDEX IF NOT EXISTS idx_reminders_record ON reminders(record_id);
CREATE INDEX IF NOT EXISTS idx_reminders_seq ON reminders(server_seq);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  device_id       TEXT,
  endpoint        TEXT NOT NULL UNIQUE,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  created_at      TEXT NOT NULL,
  last_success_at TEXT,
  failures        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- Límite de intentos de inicio de sesión (por IP y por correo).
CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL,
  first_at     INTEGER NOT NULL,         -- epoch ms
  locked_until INTEGER NOT NULL DEFAULT 0
);
