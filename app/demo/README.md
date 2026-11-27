# SEID · Panel de trabajo (PWA)

App instalable para el Ing. Abel Galarza: registra trabajos y mantenimientos, notas con foto, firmas del técnico y del cliente, PDF y recordatorios de mantenimiento.

**En línea:** https://danielcrackvz-stack.github.io/seid/app/ (la carpeta `app/demo` se publica como `/app/`, ver `scripts/assemble-site.sh`).

## Cómo funciona

- **Sin conexión primero.** Todo se guarda en IndexedDB (`js/store.js`) y funciona sin internet. El service worker (`sw.js`) guarda la app en caché; al cambiar archivos, suba `VERSION` en `sw.js`.
- **Registros que no se editan.** Al guardar un trabajo, sus datos originales (`core`) quedan fijos. Los imprevistos se agregan como notas (texto, foto comprimida y ajuste de costo opcional). Los cambios de estado quedan en la bitácora. Una vez firmado, el registro queda cerrado.
- **Firmas** en canvas (`js/signature.js`), sin librerías externas. **PDF** con jsPDF alojado en `js/vendor/` (`js/pdf.js`). Se comparte con Web Share o se descarga.
- **Recordatorios:** el mantenimiento de aire y las instalaciones de aire o inverter programan el próximo mantenimiento a los 6 meses, con aviso 15 días antes. Si el aviso se toca, abre `#/registro/<id>`.
- **PIN de 4 dígitos** guardado con PBKDF2 (`js/auth.js`). Solo protege la pantalla: «Olvidé mi PIN» lo cambia sin borrar datos.
- **Respaldo** en JSON (exportar, compartir e importar) desde Ajustes. Los datos de ejemplo se cargan y se borran desde Ajustes y nunca se suben ni se respaldan.

## Servidor (opcional)

La sincronización sigue el contrato `docs/app-sync-contract.md` de la rama `api`: entidades `clientes`, `registros`, `eventos`, `firmas` y `fotos`; `POST /sync` y `GET /sync?since=`; inicio de sesión con token de 365 días; y Web Push.

1. En `js/config.js`, ponga la URL en `API_BASE_URL` (por ejemplo `https://seid-api.<cuenta>.workers.dev`).
2. En `index.html`, agregue ese origen a `connect-src` en la CSP.
3. Suba `VERSION` en `sw.js`.

Con `API_BASE_URL` vacío, la app trabaja solo en el teléfono y no muestra la pantalla de inicio de sesión. Con la URL puesta, pide entrar una vez. Si el servidor responde 401, vuelve a pedir el ingreso sin borrar nada, y los cambios esperan en la cola (`outbox`).

## Probar en local

Sirva la carpeta con cualquier servidor estático, por ejemplo `npx serve app/demo`. No la abra como archivo: los módulos y el service worker necesitan HTTP.
