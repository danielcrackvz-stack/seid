# SEID — cabeceras de seguridad y endurecimiento

Última actualización: 25 de noviembre de 2026 (America/La_Paz).

Este documento describe lo que ya aplica el sitio estático y lo que **no se puede fijar desde HTML** en GitHub Pages. Esas cabeceras conviene aplicarlas cuando el dominio propio esté delante de **Cloudflare** (proxy naranja o Cloudflare Pages).

## Lo que ya está en el sitio

En todas las páginas públicas de la landing (`index.html`, `terminos.html`, `privacidad.html`, `404.html`):

- `referrer-policy` por meta: `strict-origin-when-cross-origin`.
- Política de seguridad de contenido (CSP) por meta `http-equiv`, restrictiva: solo recursos propios, tipografía autohospedada, sin `unsafe-inline` en scripts ni en estilos, `object-src` y `frame-src` en `none`, `form-action` limitado a este origen y a WhatsApp (`wa.me`, `api.whatsapp.com`).
- Enlaces que abren WhatsApp usan `target="_blank"` con `rel="noopener noreferrer"`.
- No hay cookies, analítica, píxeles ni fuentes o bibliotecas cargadas desde un CDN ajeno.
- El formulario de cotización no envía datos a un servidor de SEID: arma un mensaje y abre WhatsApp.

La demostración del panel (`app/demo/`) declara además `noindex, nofollow`, carga jsPDF desde un archivo propio (`js/vendor/jspdf.umd.min.js`) y no guarda la contraseña del inicio de sesión simulado. En esa demo sí se permite `style-src 'unsafe-inline'` porque la interfaz se arma en el navegador con estilos en línea. No es el sitio público de la empresa.

## Lo que un meta no puede hacer

La CSP en un elemento `<meta>` **ignora** (no aplica) `frame-ancestors`, `sandbox` y `report-uri` / `report-to`. Tampoco existe un meta equivalente fiable para:

- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options`
- `X-Frame-Options` (mejor sustituirlo por `Content-Security-Policy: frame-ancestors`)
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`

GitHub Pages envía algunas cabeceras propias, pero no deja configurar las anteriores para un sitio de proyecto. Por eso se documentan aquí, para aplicarlas en Cloudflare el día que `seid.com.bo` (o el dominio que se elija) apunte al sitio.

## Cabeceras recomendadas en Cloudflare

Cuando el dominio esté en Cloudflare (zona con proxy, o un proyecto en Cloudflare Pages), usar valores del estilo:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self' https://wa.me https://api.whatsapp.com; upgrade-insecure-requests
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

Notas:

- Si la CSP pasa a una cabecera HTTP real, se puede quitar el `<meta http-equiv="Content-Security-Policy">` para no mantener dos copias. En esa cabecera sí cabe `frame-ancestors 'none'`. El `script-src` de la cabecera puede quedar en `'self'` (el JSON-LD deja de necesitar un hash si se sirve como dato y no como script, o se mantiene el hash si el JSON-LD sigue en un `<script>`).
- HSTS con `preload` solo debe activarse cuando el dominio propio ya responde siempre por HTTPS y los subdominios también. Después se puede pedir la inclusión en [hstspreload.org](https://hstspreload.org/).
- En **Cloudflare Pages**, estas cabeceras se declaran en un archivo `_headers` en la raíz del sitio publicado, por ejemplo:

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
```

  La CSP larga puede ir en la misma regla. En **Cloudflare** delante de GitHub Pages, equivalentes: Transform Rules → Modify Response Header, o un Worker pequeño.

- Cuando el dominio deje de ser `danielcrackvz-stack.github.io/seid/`, hay que actualizar las URL canónicas, Open Graph, `sitemap.xml`, `robots.txt` y el JSON-LD, y en `404.html` cambiar el enlace de inicio de `/seid/` a `/`. El `robots.txt` actual bloquea tanto `/app/` como `/seid/app/` para cubrir ambos casos.

## Verificación rápida

Después de aplicar las cabeceras en Cloudflare:

1. Abrir `https://seid.com.bo` (o el dominio elegido) y confirmar el certificado.
2. Revisar las respuestas con las herramientas de desarrollo del navegador o con `curl -sI`.
3. Confirmar que el formulario de cotización y los botones de WhatsApp siguen abriendo `wa.me`.
