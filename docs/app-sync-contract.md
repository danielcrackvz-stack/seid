# Contrato de sincronización app ↔ API (SEID)

Este documento es la referencia común entre la PWA (`app/demo`) y la API (`api/`, Cloudflare Workers + D1).
Si la app necesita otra cosa, se cambia aquí primero. La API está en `api/src` y sus pruebas en `api/test`.

- **URL base:** la que imprime `api/scripts/deploy.ps1`, por ejemplo `https://seid-api.<subdominio>.workers.dev`
  (más adelante puede ser `https://api.seid.com.bo`). En la app va en `API_BASE_URL` (`js/config.js`) y hay
  que agregar ese origen a `connect-src` en la CSP de `index.html`.
- **CORS:** solo `https://danielcrackvz-stack.github.io`, `https://seid.com.bo` y `https://www.seid.com.bo`
  (variable `ALLOWED_ORIGINS` en `api/wrangler.toml`).
- **Formato:** JSON UTF-8. Fechas-hora en ISO 8601 UTC (`new Date().toISOString()`); fechas de calendario
  como `YYYY-MM-DD` (hora de Bolivia).
- **IDs:** los genera la app con `crypto.randomUUID()` (8 a 64 caracteres `[A-Za-z0-9_-]`, empezando con letra o número).
- **Errores:** `{ "error": "codigo", "message": "texto en español" }` con el código HTTP correspondiente.

## 1. Sesión

No hay registro público. El usuario de Abel se crea con `npm run create-user` (lo hace `deploy.ps1`).

### `POST /auth/login`
```json
{ "email": "abel@...", "password": "....", "deviceId": "<uuid del teléfono>", "deviceName": "Celular de Abel" }
```
Respuesta `200`:
```json
{ "token": "<JWT>", "expiresAt": "2027-11-27T15:00:00.000Z", "user": { "id": "...", "email": "...", "name": "Ing. Abel Galarza", "role": "admin" } }
```
- `401 credenciales_invalidas`, `429 demasiados_intentos` (cabecera `Retry-After` en segundos;
  5 fallos por correo o 20 por IP en 15 min bloquean 15 min).
- El token dura **365 días**. Guárdelo en IndexedDB (`meta.token`) y envíelo en cada llamada:
  `Authorization: Bearer <token>`.
- Cualquier `401` en otra ruta = sesión vencida o revocada: pedir login de nuevo **sin borrar** los datos
  locales ni la cola pendiente.

### Otras
- `GET /auth/me` → `{ user: { id, email, name, role, deviceId } }`
- `POST /auth/password` `{ currentPassword, newPassword }` (mín. 10 caracteres) → `{ token, expiresAt }`.
  Cierra las sesiones de los demás teléfonos.

## 2. Entidades

| Entidad (`entity`) | Regla | Campos que la API lee (el resto se guarda tal cual) |
| --- | --- | --- |
| `clientes` | last-write-wins | `id`, `updatedAt` (obligatorio), `createdAt`, `nombre`, `telefono`, `deletedAt` |
| `registros` | last-write-wins + campos fijos | `id`, `updatedAt` (obligatorio), `createdAt`, `tipo`, `servicio`, `clienteId`, `estado`, `fecha`, `proximoMantenimiento`, `recordatorio`, `core`, `firmaCliente`, `firmaTecnico`, `deletedAt` |
| `eventos` | solo agregar | `id`, `registroId` (obligatorio), `createdAt` (obligatorio), `tipo` |
| `firmas` | solo agregar | `id`, `registroId` (obligatorio), `createdAt` (obligatorio), `rol` |
| `fotos` | last-write-wins + campos fijos | `id`, `registroId` (obligatorio), `updatedAt` (obligatorio), `createdAt`, `dataUrl` (opcional), `deletedAt` |
| `recordatorios` | **solo lectura** (los crea el servidor) | ver §5 |

Valores recomendados:
- `registros.tipo`: `"mantenimiento"` o `"trabajo"`. Si viene otro valor, la API lo deduce del servicio
  (`mantenimiento-*` → mantenimiento) pero guarda el documento sin tocarlo. El tipo de mantenimiento
  (preventivo/correctivo) conviene guardarlo en otro campo, p. ej. `modalidad`.
- `registros.servicio`: las claves de `js/catalog.js` (`mantenimiento-aire`, `instalacion-aire`, `camaras`, …).
- `registros.estado`: `pendiente`, `en-curso`, `terminado` (libre; la API solo lo indexa).
- `eventos.tipo`: `nota`, `imprevisto`, `estado`, `ajuste_costo` (libre). Ejemplo:
  `{ "id": "...", "registroId": "...", "tipo": "imprevisto", "texto": "Faltó un repuesto", "createdAt": "..." }`
  o `{ "tipo": "ajuste_costo", "monto": 150, "texto": "Tubería extra (2 m)" }`.
- `firmas.rol`: `tecnico` o `cliente`; `imagen` = data URL PNG; `nombre` = quien firma.

### Reglas
- **last-write-wins:** el servidor guarda el documento si su `updatedAt` es más nuevo que el que tiene.
  La app siempre manda el **documento completo**. Un `updatedAt` más de 10 min en el futuro se recorta a la
  hora del servidor (para que un reloj adelantado no gane para siempre).
- **Campos fijos (`setOnce`)**: una vez que tienen un valor no vacío, ya no cambian.
  - `registros`: `tipo`, `servicio`, `clienteId`, `createdAt`, `core`, `firmaCliente`, `firmaTecnico`.
  - `fotos`: `registroId`, `createdAt`, `mime`, `size`, `sha256`.
  - Si un campo fijo estaba vacío (`""`, `null`, ausente o `{}`), se puede completar **una vez**
    (p. ej. firmar después).
  - Si la app no lo envía (clave ausente), se conserva el valor del servidor.
  - Cambiarlo o vaciarlo rechaza **todo** el documento (`rejected`, `reason: "inmutable:<campo>"`) y la
    respuesta trae la versión del servidor.
  - Sugerencia: poner en `core` lo que Abel registra al crear el trabajo y no debe editarse (precio
    acordado, tiempo estimado, descripción, equipo, lista de verificación…). Las correcciones e imprevistos
    van como `eventos`.
- **Solo agregar (`eventos`, `firmas`):** reenviar el mismo documento da `duplicate`; mandarlo cambiado da
  `rejected` / `solo_agregar`.
- **Borrar:** no hay borrado físico. Ponga `deletedAt` (ISO) y un `updatedAt` nuevo; el pull lo devuelve
  con `deletedAt` para que los otros teléfonos lo oculten.
- La API quita del documento la clave `synced` y las que empiezan con `_` (son locales de la app).
- Tamaño máximo de un documento: **1,5 MB** (`DOC_MAX_BYTES`). Evite meter fotos dentro de `registros`.

## 3. Subir cambios: `POST /sync`

```json
{
  "deviceId": "<uuid del teléfono>",
  "changes": [
    { "entity": "clientes",  "doc": { "id": "...", "nombre": "Doña Rosa", "telefono": "7...", "createdAt": "...", "updatedAt": "..." } },
    { "entity": "registros", "doc": { "id": "...", "tipo": "mantenimiento", "servicio": "mantenimiento-aire", "clienteId": "...", "fecha": "2026-11-27", "core": { "...": "..." }, "createdAt": "...", "updatedAt": "..." } },
    { "entity": "eventos",   "doc": { "id": "...", "registroId": "...", "tipo": "nota", "texto": "...", "createdAt": "..." } }
  ]
}
```
- Máximo **100** cambios por llamada (`413 demasiados_cambios` si hay más). Recomendado: lotes de 25 a 50,
  y las fotos de a una o dos por llamada.
- Arme el lote leyendo la `outbox`. Si el mismo id aparece varias veces, mande solo la última versión.

Respuesta `200` (un resultado por cambio, en el mismo orden):
```json
{ "serverTime": "...", "results": [
  { "entity": "clientes", "id": "...", "status": "ok" },
  { "entity": "registros", "id": "...", "status": "stale", "doc": { "...versión del servidor..." } },
  { "entity": "eventos", "id": "...", "status": "rejected", "reason": "solo_agregar", "doc": { "..." } }
] }
```

| `status` | Qué significa | Qué hace la app |
| --- | --- | --- |
| `ok` | Guardado | Quitar de la outbox y marcar `synced` |
| `duplicate` | Ya estaba igual (reintento) | Igual que `ok` |
| `stale` | El servidor tiene una versión más nueva | Quitar de la outbox y reemplazar el local por `doc` |
| `rejected` | Inválido o intenta cambiar algo fijo (`reason`) | Quitar de la outbox; si viene `doc`, reemplazar el local; avisar con un toast. **No reintentar.** |

`reason` posibles: `entidad_desconocida`, `documento_invalido`, `id_invalido`, `updatedAt_invalido`,
`createdAt_invalido`, `registroId_requerido`, `documento_muy_grande`, `foto_invalida`, `foto_muy_grande`,
`solo_agregar`, `inmutable:<campo>`.

Si la llamada entera falla (sin red, `5xx`, `429`), se deja la outbox como está y se reintenta después.
Todo es idempotente: reenviar el mismo lote no duplica nada.

## 4. Bajar cambios: `GET /sync?since=<cursor>&limit=500`

```json
{ "serverTime": "...", "cursor": 1234, "hasMore": false, "changes": [
  { "entity": "registros", "seq": 1201, "doc": { "..." } },
  { "entity": "recordatorios", "seq": 1202, "doc": { "..." } }
] }
```
- La primera vez `since=0`. Guarde `cursor` en `meta.syncCursor` **después** de aplicar los cambios.
  Si `hasMore` es `true`, vuelva a llamar con el nuevo cursor hasta que sea `false`.
- `limit` entre 50 y 1000 (por defecto 500).
- Aplicar cada `doc` con `save(entity, doc, { fromServer: true })`, sin encolarlo. Si el mismo id tiene un
  cambio local pendiente en la outbox con `updatedAt` más nuevo, conserve el local (se subirá en el próximo push).
- Llegan también los propios cambios del teléfono (es normal e inofensivo).

**Ciclo recomendado:** al abrir la app, al volver la conexión (`online`), al volver a primer plano
(`visibilitychange`) y cada ~5 min con la app abierta: **push** (en lotes) y luego **pull**.

## 5. Recordatorios (los calcula el servidor)

Al guardar un `registro`, la API calcula la próxima fecha de mantenimiento:
1. `recordatorio: false` → sin recordatorio.
2. Si el documento trae `proximoMantenimiento` (`YYYY-MM-DD`) se usa esa fecha; `null` o `""` → sin recordatorio.
3. Si no, para `tipo: "mantenimiento"` o servicios `mantenimiento-aire`, `instalacion-aire` e
   `instalacion-inverter` (`REMIND_SERVICES`): `fecha` (o `createdAt`) **+ 6 meses** (`REMINDER_MONTHS`).
   Si el día no existe se usa el último del mes (31-ago → 28-feb).

Con esa fecha crea dos avisos: **15 días antes** (`aviso`) y **el mismo día** (`dia`). El Cron corre todos los
días a las **08:00 de Bolivia** (12:00 UTC). Cada aviso se envía **una sola vez**. Si ese día no hay ningún
teléfono suscrito, o todos fallan, se reintenta al día siguiente (el aviso de 15 días, hasta la fecha del
mantenimiento; el del día, hasta 7 días después). Cambiar `proximoMantenimiento` o borrar el registro
reprograma o cancela los pendientes.

En el pull llegan como entidad `recordatorios` (solo lectura):
```json
{ "id": "<registroId>:aviso:2027-05-27", "registroId": "...", "tipo": "aviso", "fecha": "2027-05-27",
  "avisarEl": "2027-05-12", "estado": "pendiente|enviado|cancelado|vencido", "enviadoEl": null, "updatedAt": "..." }
```
También: `GET /recordatorios` → `{ recordatorios: [...] }` (solo los pendientes).

## 6. Notificaciones push

1. `GET /push/vapid-public-key` → `{ publicKey }` (base64url; no requiere sesión).
2. Con la app instalada y tras un toque del usuario (en iPhone, solo como app agregada a inicio, iOS 16.4+):
   ```js
   const reg = await navigator.serviceWorker.ready;
   const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64urlToUint8Array(publicKey) });
   await api('/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON(), deviceId }) });
   ```
   Repetirlo al abrir la app si `pushManager.getSubscription()` es `null` o cambió. Es idempotente
   (mismo endpoint = se actualiza).
3. `POST /push/unsubscribe` `{ endpoint }` al cerrar sesión. `POST /push/test` envía un aviso de prueba
   a los teléfonos del usuario (para un botón "Probar notificaciones").

Contenido que recibe el service worker (JSON):
```json
{ "title": "Mantenimiento en 15 días", "body": "Doña Rosa · Mantenimiento de aire · 12000 BTU — fecha: 27/05/2027",
  "url": "/seid/app/#/registro/<id>", "tag": "recordatorio-<id>", "recordId": "<id>", "reminderId": "..." }
```
En `sw.js`:
```js
self.addEventListener('push', (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title || 'SEID', {
    body: d.body, tag: d.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.location.origin).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus(); }
    return clients.openWindow(url);
  }));
});
```
La ruta `#/registro/<id>` debe abrir el detalle de ese registro (mantenimiento o trabajo).
La base `/seid/app/` se cambia con `APP_BASE_URL` en `wrangler.toml` cuando la app pase al dominio propio.

## 7. Fotos

Recomendado: cada foto es un documento `fotos` aparte (no dentro de `registros`):
```json
{ "entity": "fotos", "doc": { "id": "...", "registroId": "...", "descripcion": "Antes", "createdAt": "...", "updatedAt": "...",
  "dataUrl": "data:image/jpeg;base64,..." } }
```
- JPEG, PNG o WebP de **1 MB como máximo** ya comprimida (`PHOTO_MAX_BYTES`). Sugerido: lado mayor 1600 px,
  JPEG calidad 0,7.
- La API separa el archivo del documento y guarda `mime`, `size` y `sha256`. En el pull la foto llega
  **sin** `dataUrl` y con `archivo: "/fotos/<id>/archivo"`.
- Descargarla con `fetch(API + archivo, { headers: { Authorization } })` → `blob` → `URL.createObjectURL`
  (las etiquetas `<img>` no pueden mandar el token). Conviene guardarla en IndexedDB para verla sin internet.
- Alternativa más liviana: `PUT /fotos/<id>/archivo?registroId=<id>` con el binario y `Content-Type: image/jpeg`
  → `{ status: "ok"|"duplicate", sha256, size }`.
- El archivo de una foto no se puede cambiar (`409` / `inmutable:sha256`). Para reemplazarla: borrar
  (`deletedAt`) y crear otra.
- Almacenamiento: D1 por defecto. R2 es opcional porque Cloudflare exige un medio de pago para activarlo.

## 8. Respaldo: `GET /export`

Descarga un JSON completo: `{ app: "SEID", formato: "api-1", exportadoEl, clientes, registros, eventos,
firmas, fotos, recordatorios, usuarios, dispositivos, cursor }`. Las fotos van sin archivo, salvo con
`/export?fotos=1` (incluye `dataUrl`; puede pesar mucho). Cabecera `Content-Disposition` con el nombre
`seid-respaldo-AAAA-MM-DD.json`.

## 9. Resumen de rutas

| Método | Ruta | Sesión |
| --- | --- | --- |
| GET | `/health` | no |
| POST | `/auth/login` | no |
| GET | `/auth/me` | sí |
| POST | `/auth/password` | sí |
| GET / POST | `/sync` | sí |
| GET | `/export` | sí |
| PUT / GET | `/fotos/:id/archivo` | sí |
| GET | `/push/vapid-public-key` | no |
| POST | `/push/subscribe`, `/push/unsubscribe`, `/push/test` | sí |
| GET | `/recordatorios` | sí |
