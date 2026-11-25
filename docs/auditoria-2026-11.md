# Auditoría de la landing de SEID — 25 de noviembre de 2026

Fecha: 25 de noviembre de 2026 (America/La_Paz).  
Alcance: sitio público en `landing/` (y una revisión puntual de la demo en `app/demo/`). Medición «antes» sobre el sitio en producción [https://danielcrackvz-stack.github.io/seid/](https://danielcrackvz-stack.github.io/seid/) (commit `48580b0`). Medición «después» sobre la copia local ya endurecida, servida desde `landing/`.

**Esta auditoría y los textos legales no son asesoramiento jurídico.** Un abogado en Bolivia debería revisar los términos y la política de privacidad antes de darlos por definitivos. Ese aviso no se publica en el sitio.

## Resumen

El sitio ya era estático, sin cookies ni analítica, con tipografía autohospedada, buen SEO básico y un contraste de marca cuidado. Faltaban páginas legales, una política explícita de cookies, cabeceras de seguridad en la medida que GitHub Pages lo permite, y un arreglo de accesibilidad en el logotipo del hero. Eso quedó resuelto en este trabajo, listo para que Daniel lo suba a `main` cuando encienda su PC (Actions publica solo con un push).

## Lighthouse

| Entorno | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
| --- | ---: | ---: | ---: | ---: |
| Antes, móvil (sitio en GitHub Pages) | 96 | 96 | 100 | 100 |
| Antes, escritorio (GitHub Pages) | 97 | 96 | 100 | 100 |
| Después, móvil (servidor local) | **100** | **100** | 100 | 100 |
| Después, escritorio (servidor local) | 94 | **100** | 100 | 100 |

La subida de accesibilidad de 96 a 100 se debe a un fallo real que se corrigió: el enlace de la marca, con el hero detrás, no tenía un nombre accesible (la versión en color del logo, que sí tenía `alt`, quedaba oculta, y la versión inversa visible tenía `alt` vacío). Ahora el nombre está en un `aria-label` del enlace.

La comparación de rendimiento no es estrictamente equivalente: el «antes» se midió en GitHub Pages y el «después» en un servidor local de Python. En escritorio el «después» marca 94 (FCP/LCP alrededor de 1,2 s frente a 1,0 s en producción). En móvil el «después» llega a 100. No se interpreta como una regresión del código; conviene volver a medir en GitHub Pages cuando se publique.

Informes JSON: `audit-shots/lighthouse-before-mobile`, `lighthouse-before-desktop`, `lighthouse-after-mobile`, `lighthouse-after-desktop`.

## Hallazgos y correcciones

### Legal y privacidad

**Hallazgo.** El sitio no tenía términos, política de privacidad ni mención a cookies, algo habitual en una landing comercial aunque el único canal sea WhatsApp.

**Corrección.** Se publicaron `terminos.html` y `privacidad.html`, con fecha de última actualización (25 de noviembre de 2026), el mismo sistema de diseño y enlaces en el pie. No incluyen correo, dirección de oficina ni NIT.

- Términos: naturaleza informativa del sitio; cotizaciones por WhatsApp referenciales hasta la inspección en el lugar; precios en Bs sujetos a cambio; garantías las acordadas por escrito para cada servicio; limitación de responsabilidad; propiedad intelectual; ley boliviana y jurisdicción en Santa Cruz de la Sierra.
- Privacidad: solo se tratan los datos que el cliente envía (sobre todo por WhatsApp); el formulario de cotización no guarda nada en el sitio; no hay venta de datos; conservación limitada; derechos de acceso, corrección y eliminación por WhatsApp; referencia a los artículos 21 y 130 de la Constitución (Acción de Protección de Privacidad); terceros: WhatsApp/Meta y GitHub Pages; no se usan fuentes de Google.

### Cookies

**Hallazgo.** No había cookies propias, ni analítica, ni fuentes cargadas desde el CDN de Google (Instrument Sans ya estaba en `landing/fonts/`). No hacía falta un aviso de consentimiento.

**Corrección.** Se añadió una sección «Cookies» en la política, que declara que no se usan. No se añadió un banner. La fuente ahora también se ofrece en WOFF2 (`landing/fonts/instrument-sans.woff2`), con el WOFF como reserva, y se precarga el WOFF2. Sigue sin haber peticiones a terceros en la landing.

### Seguridad

**Hallazgo.** GitHub Pages no deja fijar cabeceras HTTP propias. No había CSP ni política de referrer. Los enlaces a WhatsApp no declaraban `noopener`. La demo del panel cargaba jsPDF desde jsDelivr (un origen tercero).

**Corrección.**

- Meta `referrer` = `strict-origin-when-cross-origin`.
- CSP por meta, restrictiva, solo recursos propios. El JSON-LD de schema.org va con un hash `sha256` para no abrir `unsafe-inline`. Se eliminaron los estilos en línea de la landing para que `style-src 'self'` no los bloquee.
- Enlaces a WhatsApp con `target="_blank"` y `rel="noopener noreferrer"`.
- jsPDF autohospedado en `app/demo/js/vendor/jspdf.umd.min.js`; la demo ya no llama a un CDN. El service worker pasó a `seid-demo-v3`.
- La demo declara `noindex, nofollow`, deja claro que es una **demostración**, no guarda la contraseña del inicio simulado (solo el nombre en el almacenamiento local del navegador) y avisa de que los datos de ejemplo no se envían a SEID.
- `robots.txt` y `sitemap.xml` actualizados (incluye las páginas legales y excluye `/app/` y `/seid/app/`).
- `404.html` alineada al diseño, sin estilos en línea, con rutas `/seid/` (y una hoja de estilo reserva en `/` para cuando exista dominio propio).
- Cabeceras reales recomendadas (HSTS, `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options`, `Permissions-Policy`, etc.) documentadas en `docs/seguridad.md`, para aplicarlas en Cloudflare con el dominio propio. Un meta no puede fijar esas cabeceras.

No se encontraron secretos, comentarios con credenciales ni source maps.

### SEO, accesibilidad y rendimiento

**Hallazgo.** Título, descripción, canonical, Open Graph, favicon, apple-touch e imagen social ya existían. El JSON-LD era un `LocalBusiness` sin dirección, con `areaServed` en Santa Cruz y teléfono +59173643342, correcto. El `lang` ya era `es-BO`. Las fotos tenían `alt`, dimensiones y `loading="lazy"` (el hero, `fetchpriority="high"` y precarga WebP). Había un fallo de accesibilidad en el logo, descrito arriba.

**Corrección.** El JSON-LD pasó a `@type: ["LocalBusiness", "Electrician"]`, con `legalName`, `currenciesAccepted: BOB` y un `contactPoint`, sin añadir dirección. Se agregó `twitter:image:alt`. Se corrigió el nombre accesible de la marca. `prefers-reduced-motion` ya estaba contemplado en el CSS. HTML validado con `html-validate` (el único error era el `<img>` vacío del visor de fotos; ahora tiene un `src` mínimo en `data:`).

### Flujo de publicación

El flujo `.github/workflows/pages.yml` ya copia todo `landing/` a la raíz de `_site` y `app/demo/` a `/app/`. Las páginas legales, `robots.txt`, `sitemap.xml`, `404.html` y las fuentes nuevas entran solas, sin cambiar el flujo.

## Capturas

Carpeta `/workspace/seid/audit-shots/` (no van en el repositorio; son evidencia local):

- `index-footer-desktop.png`, `index-footer-mobile.png`
- `terminos-top-desktop.png`, `terminos-top-mobile.png`, `terminos-desktop.png`, `terminos-mobile.png`, `terminos-footer-desktop.png`, `terminos-footer-mobile.png`
- `privacidad-top-desktop.png`, `privacidad-top-mobile.png`, `privacidad-desktop.png`, `privacidad-mobile.png`

## Decisiones que quedan a Daniel y a Abel

1. **Revisión legal.** Los textos son honestos y acotados a lo que el sitio hace de verdad, pero no reemplazan la revisión de un abogado.
2. **Dominio.** Guía paso a paso en `docs/comprar-dominio.md`. Recomendación: `seid.com.bo` en [nic.bo](https://nic.bo/), **Bs 280 al año**. El 25 de noviembre de 2026 (03:33, America/La_Paz) el WHOIS de NIC devolvió «Nombre de dominio no registrado» para `seid.com.bo`, `seid.bo` y `seid.org.bo`; hay que confirmarlo al pagar. El titular debe ser la empresa o Abel, no Daniel.
3. **Cuando el dominio esté activo:** actualizar canónicas, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt` y el enlace de inicio de `404.html` (`/seid/` → `/`), y aplicar las cabeceras de `docs/seguridad.md` en Cloudflare.
4. Las fotos de alta resolución y el audio de Abel, anunciados para el 26 de noviembre, siguen pendientes (no forman parte de esta auditoría).
