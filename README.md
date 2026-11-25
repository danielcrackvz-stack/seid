# SEID — Servicios de climatización, electricidad, plomería y gas

Proyecto para la empresa **SEID** (Electricidad Industrial Domiciliaria SEID SRL) del Ing. Abel Galarza, en Santa Cruz de la Sierra, Bolivia.

## Estructura

- `landing/` — Sitio público (demo en GitHub Pages; producción prevista en Cloudflare Pages, con dominio propio).
- `app/demo/` — Demostración del panel de trabajo (PWA instalable). Datos de ejemplo solo en el navegador. El inicio de sesión está simulado y **no guarda la contraseña**.
- `docs/` — Análisis de viabilidad y costos, sistema de diseño, auditoría, seguridad y guía para comprar el dominio.

## Fases

1. Landing page + contacto por WhatsApp.
2. App admin: registro de trabajos, formularios de mantenimiento de aires con PDF, recordatorios a los 6 meses.
3. Agente de WhatsApp con cotizaciones.
4. Calendario.

## Demos

- Landing: [https://danielcrackvz-stack.github.io/seid/](https://danielcrackvz-stack.github.io/seid/)
- Panel de trabajo (demo): [https://danielcrackvz-stack.github.io/seid/app/](https://danielcrackvz-stack.github.io/seid/app/)

El sitio se publica con GitHub Actions (`.github/workflows/pages.yml`): el contenido de `landing/` queda en la raíz y `app/demo/` en `/app/`.

## Contacto publicado

El único canal de contacto en el sitio es el WhatsApp Business **+591 736 43342**. El número se configura en `landing/js/config.js`. En el sitio no se publica correo, dirección de oficina ni NIT.

## Páginas legales y seguridad

- [Términos y condiciones](https://danielcrackvz-stack.github.io/seid/terminos.html)
- [Política de privacidad](https://danielcrackvz-stack.github.io/seid/privacidad.html)

La tipografía va autohospedada (no se usan cookies ni analítica). Detalles de cabeceras recomendadas para cuando exista dominio propio: `docs/seguridad.md`. Guía para comprar el dominio: `docs/comprar-dominio.md`. Auditoría del 25 de noviembre de 2026: `docs/auditoria-2026-11.md`.

## Cómo verlo en local

Sirva la carpeta `landing/` (o arme el mismo `_site` que el flujo de Actions) y abra `index.html`.
