# SEID — Servicios de climatización, electricidad, plomería y gas

Proyecto para la empresa **SEID** del Ing. Abel Galarza (Santa Cruz, Bolivia).

## Estructura

- `landing/` — Landing page pública (demo en GitHub Pages; producción prevista en Cloudflare Pages).
- `app/` — Panel administrativo (PWA instalable) con Cloudflare Workers + D1.
- `docs/` — Análisis de viabilidad, costos y documentación.

## Fases

1. Landing page + contacto por WhatsApp.
2. App admin: registro de trabajos, formularios de mantenimiento de aires con PDF, recordatorios a los 6 meses.
3. Agente de WhatsApp con cotizaciones.
4. Calendario.

## Demo de la landing (fase 1)

- URL: [https://danielcrackvz-stack.github.io/seid/](https://danielcrackvz-stack.github.io/seid/)
- El sitio es estático (HTML, CSS y JS, sin paso de compilación).
- Para verlo en local, abra `landing/index.html` en el navegador o sirva la carpeta `landing/`.

### Número de WhatsApp

Antes de mostrarle la demo al Ing. Galarza, reemplace el marcador en una sola línea:

`landing/js/config.js`

```js
const WHATSAPP_NUMBER = '591XXXXXXXX';
```

Use el formato internacional, solo dígitos, sin `+` ni espacios. Ejemplo Bolivia: `5917XXXXXXX`.

También faltan, si se desea publicarlos: logo oficial, correo, dirección y NIT.
