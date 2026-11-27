# Publicar la API de SEID en Cloudflare (Windows)

Guía para dejar en línea el servidor de la app de Abel: base de datos, respaldo en la nube y
notificaciones. Todo queda en el **plan gratuito** de Cloudflare. No hace falta tarjeta.

El código está en la carpeta `api/` del repositorio. En las pruebas automáticas se verifican el inicio de
sesión, la sincronización, los recordatorios y el cifrado de las notificaciones.

## Qué se necesita

1. **Una cuenta de Cloudflare** (gratis): <https://dash.cloudflare.com/sign-up>. Conviene un Gmail de la
   empresa o del ingeniero, porque la misma cuenta servirá para el dominio `seid.com.bo`.
2. **Node.js 20 o superior** en la PC. Para comprobarlo: `node -v`. Si no está instalado:
   `winget install OpenJS.NodeJS.LTS` y abrir una terminal nueva.
3. El repositorio en `C:\Users\Hp\Proyectos\SEID`, actualizado (`git pull`).
4. **Subdominio workers.dev** (una sola vez): entrar a <https://dash.cloudflare.com> → **Workers y Pages**
   (Compute). Si pide elegir un subdominio, poner por ejemplo `seid`. La dirección de la API quedará como
   `https://seid-api.seid.workers.dev`.

> Si PowerShell dice que "la ejecución de scripts está deshabilitada" al usar `npx`, use `npx.cmd` en lugar
> de `npx` (como en los comandos de abajo).

## Opción rápida: un solo script

```powershell
cd C:\Users\Hp\Proyectos\SEID\api
npm ci
npx.cmd wrangler login
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 -AdminEmail CORREO_DE_ABEL
```

- `npx.cmd wrangler login` abre el navegador: inicie sesión en Cloudflare y pulse **Allow**.
- El script se puede volver a correr sin problema: solo hace lo que falta.
  1. Instala dependencias y corre las pruebas.
  2. Crea la base `seid-db` (si no existe) y anota su id en `wrangler.toml`.
  3. Aplica las tablas, publica el Worker y carga los secretos (`JWT_SECRET`, claves VAPID) solo si faltan.
  4. Crea el usuario de Abel solo si no existe.
  5. Prueba `/health` e imprime la dirección (`WORKER_URL=https://...workers.dev`).
- La **contraseña de Abel se muestra una sola vez** al crearla. Guárdela en un lugar seguro y pásela por un
  medio privado.
- Opciones: `-AdminName "Ing. Abel Galarza"`, `-SkipTests`, `-EnableR2` (ver Fotos), `-Location enam`.
- Después conviene hacer commit del cambio en `api/wrangler.toml` (el id de la base no es secreto).

## Paso a paso manual (lo mismo que hace el script)

Desde `C:\Users\Hp\Proyectos\SEID\api`:

1. Instalar y entrar a Cloudflare:
   ```powershell
   npm ci
   npx.cmd wrangler login
   npx.cmd wrangler whoami
   ```
2. Crear la base de datos D1 (`enam` es la región más cercana a Bolivia):
   ```powershell
   npx.cmd wrangler d1 create seid-db --location enam
   ```
   Copie el `database_id` que aparece y péguelo en `wrangler.toml`, en lugar de `REEMPLAZAR_CON_ID_DE_D1`.
3. Crear las tablas en la nube:
   ```powershell
   npx.cmd wrangler d1 migrations apply seid-db --remote
   ```
4. Publicar:
   ```powershell
   npx.cmd wrangler deploy
   ```
   Al final muestra la dirección, por ejemplo `https://seid-api.seid.workers.dev`.
5. Secretos (cada comando pide pegar el valor):
   ```powershell
   node scripts/gen-secret.mjs          # copie el resultado
   npx.cmd wrangler secret put JWT_SECRET
   npm run gen-vapid                    # muestra VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY
   npx.cmd wrangler secret put VAPID_PUBLIC_KEY
   npx.cmd wrangler secret put VAPID_PRIVATE_KEY
   ```
   No cambie las claves VAPID después: si cambian, los teléfonos tienen que volver a activar las notificaciones.
   Si cambia `JWT_SECRET`, se cierran todas las sesiones.
6. Crear el usuario de Abel (no hay registro público; esta es la única forma):
   ```powershell
   npm run create-user -- --email CORREO_DE_ABEL --name "Ing. Abel Galarza" --generate
   ```
   `--generate` crea una contraseña segura y la muestra una vez. Para cambiarla más adelante, use el mismo
   comando con `--reset`.
7. Probar: abrir `https://seid-api.<subdominio>.workers.dev/health`. Debe responder `{"ok":true,...}`.

## Conectar la app

En `app/demo/js/config.js` ponga `API_BASE_URL = 'https://seid-api.<subdominio>.workers.dev'`. En la
etiqueta CSP de `app/demo/index.html`, agregue esa misma dirección a `connect-src`. Detalles en
`docs/app-sync-contract.md`.

Cuando se use el dominio propio:
- Agregue el origen en `ALLOWED_ORIGINS` (ya incluye `https://seid.com.bo` y `https://www.seid.com.bo`).
- Ajuste `APP_BASE_URL` (por ejemplo `/app/`), que es la ruta que abren las notificaciones.
- Vuelva a correr `npx.cmd wrangler deploy`.

Si se quiere, la API también puede quedar en `api.seid.com.bo`. Se agrega como *Custom Domain* del Worker
una vez que el dominio esté en Cloudflare.

## Notificaciones

Todos los días a las **08:00 de Bolivia** el servidor revisa los mantenimientos. Avisa **15 días antes** y
**el mismo día** de cumplirse los 6 meses de cada mantenimiento o instalación de aire. Cada aviso se manda
una sola vez, y al tocarlo se abre ese registro en la app.

En el celular, la app debe estar **instalada** (agregada a la pantalla de inicio) y con las notificaciones
permitidas. En iPhone se requiere iOS 16.4 o superior.

Para cambiar los plazos, edite en `wrangler.toml` y vuelva a publicar:
- `REMINDER_MONTHS` (6)
- `REMINDER_DAYS_BEFORE` (15)
- `REMIND_DAY_OF` (true)
- `REMIND_SERVICES`, los servicios que generan recordatorio

Para probar el cron sin esperar al día siguiente:

```powershell
npx.cmd wrangler dev
# en otra terminal:
curl.exe "http://localhost:8787/cdn-cgi/local/scheduled?cron=0+12+*+*+*"
```

## Fotos: D1 (por defecto) o R2 (opcional)

- **Por defecto las fotos se guardan en D1**, la misma base de datos, hasta 1 MB por foto ya comprimida.
  El plan gratis da 500 MB por base, lo que alcanza para miles de fotos comprimidas.
- **R2** es el almacenamiento de archivos de Cloudflare: 10 GB gratis al mes y sin costo de descarga. Pero
  Cloudflare **exige registrar una tarjeta o PayPal para activarlo**, aunque no se pase del plan gratis, y no
  tiene tope de gasto. Por eso quedó opcional. Para activarlo:
  1. En el panel, vaya a R2 y active el plan agregando un medio de pago.
  2. Corra `deploy.ps1 -EnableR2`. Crea el bucket `seid-fotos` y activa el bloque `[[r2_buckets]]` de
     `wrangler.toml`.
  3. Las fotos nuevas irán a R2 y las anteriores siguen en D1.

## Respaldo

- La app puede descargar un respaldo completo desde `GET /export` (con `?fotos=1` incluye las fotos).
- Además, D1 guarda automáticamente un historial de 7 días en el plan gratis (*Time Travel*). Se puede
  volver a un momento anterior con:
  ```powershell
  npx.cmd wrangler d1 time-travel restore seid-db --timestamp=...
  ```
- Copia manual de la base completa:
  ```powershell
  npx.cmd wrangler d1 export seid-db --remote --output respaldo.sql
  ```

## Seguridad

- No hay registro público. Los usuarios solo se crean con `npm run create-user`.
- Contraseñas guardadas con PBKDF2-SHA256, con sal y 40.000 iteraciones:
  - Es lo que cabe en los ~10 ms de CPU por petición del plan gratis.
  - La contraseña generada tiene 16 caracteres aleatorios.
  - Tras 5 intentos fallidos por correo, o 20 por conexión, el acceso se bloquea 15 minutos.
- Las sesiones son tokens firmados (JWT HS256) que duran 1 año en el teléfono. Para cerrarlas todas, cambie
  la contraseña con `create-user --reset`.
- Solo los orígenes de `ALLOWED_ORIGINS` pueden llamar a la API desde el navegador.
- Los secretos viven en Cloudflare (`wrangler secret`), nunca en el repositorio.

## Límites del plan gratuito (holgados para SEID)

- **Workers:** 100.000 peticiones por día y ~10 ms de CPU por petición. El Cron diario está incluido.
- **D1:** 500 MB por base, 5 GB por cuenta y 50 consultas por petición. La API agrupa sus consultas para
  no pasar ese límite.
- **Notificaciones:** hasta 10 recordatorios por corrida diaria. Si hubiera más, salen al día siguiente.

## Problemas comunes

| Mensaje | Solución |
| --- | --- |
| `No hay sesión de Cloudflare` | `npx.cmd wrangler login` |
| `workers.dev subdomain` | Elegir el subdominio en el panel (Workers y Pages) y repetir |
| `npx.ps1 cannot be loaded` | Usar `npx.cmd`, o `powershell -ExecutionPolicy Bypass -File ...` |
| La app dice "sesión vencida" | Volver a iniciar sesión; si se olvidó la clave, `create-user --reset --generate` |
| No llegan notificaciones | App instalada, permiso concedido, botón "Probar notificaciones" (`POST /push/test`) |
