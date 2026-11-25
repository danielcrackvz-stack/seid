# SEID — sistema de diseño

Documento de tokens y reglas para la landing pública y la aplicación de administración. Última actualización: 25 de noviembre de 2026 (America/La_Paz).

Fuentes de criterio: brief del Ing. Abel Galarza y de Daniel; logo oficial de SEID; principios de Impeccable (mode Persuade, craft floor, typeset, layout, animate), Emil Kowalski (animación con propósito, ease-out, duraciones cortas) y Taste Skill (una paleta, tipografía con jerarquía, sin tropes genéricos de IA).

## Marca

- **Nombre:** SEID
- **Significado (tagline del logo):** Servicios de Electricidad Industrial y Domiciliaria
- **Titular:** Ing. Abel Galarza
- **Lugar:** Santa Cruz de la Sierra, Bolivia
- **Logo oficial:** `landing/brand/logo.svg` (versión vectorial, fondo transparente). Recorte PNG de respaldo: `landing/brand/logo.png`.
- **Uso del logo:** en cabecera, favicon, imagen Open Graph y pie. No recolorizar las letras ni el rayo. Sobre fondos claros, usar la versión en color. Sobre fondos oscuros (azul de marca o tinta), usar `landing/brand/logo-inverse.svg` (letras en papel; el rayo naranja se mantiene).
- **WhatsApp Business:** `59173643342` (formato internacional, solo dígitos). En código: `WHATSAPP_NUMBER` en `landing/js/config.js`.
- **Catálogo de WhatsApp:** https://wa.me/c/59173643342 — enlace de interfaz: «Ver catálogo».

En la landing no se publican correo, dirección de oficina ni NIT. El contacto público es únicamente WhatsApp (`59173643342`) y el catálogo (https://wa.me/c/59173643342).

## Color

Una sola color de marca: el azul del logo. El naranja del rayo es un acento mínimo, no un segundo color de interfaz.

Muestreo del arte oficial (mediana de los píxeles del logo, 24 nov 2026). Entre paréntesis, la aproximación descrita al entregar el archivo.

| Token | Hex | Uso |
| --- | --- | --- |
| `--blue` / `--color-brand` | `#014397` (~`#0B4A9E`) | Color de marca. Botón primario, enlaces, foco, palabra de marca, una sección invertida si hace falta. |
| `--blue-ink` | `#013171` | Azul más oscuro para hover del botón y texto sobre papel cuando `--blue` no alcanza contraste de cuerpo. |
| `--bolt` / `--color-accent` | `#ED8502` (~`#F08A00`) | Solo el rayo y la regla del logo. No usar en botones, fondos de sección, iconos de servicio ni hovers masivos. |
| `--paper` | `#F4F5F7` | Fondo de página. Neutro frío, para convivir con el azul (no crema cálido ni blanco puro). |
| `--surface` | `#FFFFFF` | Superficie elevada: formulario, campos. |
| `--ink` | `#14171C` | Texto de cuerpo y títulos. Tinta casi negra, no gris. El cuerpo no se aclara para «suavizar». |
| `--ink-soft` | `#3A4048` | Metadatos, pies de foto, texto de apoyo. Sigue por encima de 4.5:1 sobre `--paper`. |
| `--line` | `#D8DCE2` | Separadores de 1 px. No usar bordes de color ni barras laterales decorativas. |
| `--focus` | `#014397` | Anillo de foco visible (`3px solid`, offset 3px). |
| `--danger` | `#8B1E2D` | Solo errores de formulario. |

WhatsApp no tiñe la interfaz. El CTA dice «WhatsApp», pero el botón es azul de marca (o tinta sobre la sección invertida). No usar el verde `#25D366` en botones, fondos ni el botón flotante.

No hay degradados decorativos de marca, blobs, glassmorphism ni paletas arcoíris. La única excepción es un velo (scrim) de `--blue` o tinta sobre una fotografía, para que el texto siga siendo legible; no es un degradado de adorno. Los neutros pueden tener un matiz frío mínimo; no introducir un segundo acento (teal, ámbar, etc.).

Contraste mínimo: cuerpo 4.5:1, texto grande 3:1, controles y foco 3:1 (WCAG AA).

## Tipografía

El logo es la única lettering característica. La interfaz no imita las letras del logo.

- **Familia de interfaz:** Instrument Sans (variable, autohospedada en `landing/fonts/instrument-sans.woff`), con reserva `system-ui, "Segoe UI", sans-serif`.
- **Una sola familia** en landing y app, con jerarquía por tamaño, peso y espacio. No usar Inter, Geist, Outfit, Roboto ni Open Sans.
- **Cuerpo:** 1.0625rem (17px) / interlineado 1.55, peso 400, color `--ink`, medida 45–75ch (ideal ~65ch).
- **Título de página (hero):** `clamp(2.25rem, 6vw, 4.25rem)`, peso 550–600, interlineado 1.08, tracking no menor a `-0.03em`, `text-wrap: balance`. Máximo dos líneas en cualquier ancho.
- **Títulos de sección:** `clamp(1.75rem, 3vw, 2.35rem)`, peso 550–600, más espacio encima que debajo.
- **Etiquetas y navegación:** 0.95–1rem, peso 500. No usar eyebrows (rótulos en versalitas sobre el título). Si un título necesita contexto, ese contexto va en el propio título o en el párrafo que lo sigue.
- **Versalitas** solo en rótulos muy cortos (por ejemplo, un estado), con tracking abierto (~0.08em). Nunca un párrafo en mayúsculas.
- Números tabulares (`font-variant-numeric: tabular-nums`) en la app cuando hay montos, fechas u OT.

## Espaciado

Escala de 4 px: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.

- Agrupar lo que va junto; separar bloques distintos con un salto claramente mayor (ritmo, no un único gap repetido).
- Más espacio encima de un título que debajo.
- Sección: `clamp(4.5rem, 10vw, 8rem)` de padding vertical.
- Contenedor: `min(100% - 2.5rem, 72rem)` en landing; en la app puede ser más estrecho en formularios (~40rem) y más ancho en listados.
- Márgenes laterales iguales. Nada de texto pegado al borde de la pantalla.
- Objetivos táctiles: mínimo 44×44 px (preferible 48 px de alto en botones y campos).

## Radio y elevación

- Radio estándar: `6px` (botones, campos, logo en favicon).
- Radio pequeño: `3px` (chips, si los hubiera).
- No usar pastillas (`border-radius: 999px`) en botones principales ni en tarjetas.
- Página plana: la profundidad sale del tipo y de una sección invertida (fondo `--blue` o `--ink`, texto `--paper`), no de sombras ni de cristal. Si hace falta una sombra (menú móvil), que sea suave, con offset y blur, opacidad ≤ 0.12. Prohibido el halo sin offset.

## Movimiento

Una tesis breve: el movimiento confirma la acción (botón, menú, error de formulario). No hay revelados al hacer scroll en cada sección.

| Uso | Duración | Curva |
| --- | --- | --- |
| Feedback de botón (`:active`) | 100–150 ms | `cubic-bezier(0.23, 1, 0.32, 1)` (`--ease-out`) |
| Hover de color / borde | 120–180 ms | `--ease-out` |
| Menú móvil, estados de formulario | 180–250 ms | `--ease-out` |
| Entrada autora (hero, una sola vez) | ≤ 500 ms | `--ease-out`; no usar bounce ni elástico |

Reglas:

- Transicionar solo las propiedades necesarias (`color`, `background-color`, `transform`, `opacity`), nunca `transition: all`.
- En `:active`, `transform: scale(0.97)`. No partir de `scale(0)`.
- Nunca `ease-in` en la interfaz.
- Hover con movimiento solo en `@media (hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion: reduce`: se conservan cambios de color y estado; se elimina el desplazamiento y el escalado.
- Un único momento autorado en la landing (la entrada del hero). El resto es feedback.

## Composición (landing y app)

- Jerarquía alineada a la izquierda. El hero puede ser un split (oferta a un lado, índice de servicios al otro); no un titular centrado sobre una fila de tarjetas con icono.
- Prohibido: grillas genéricas de 3 o 4 tarjetas con icono + título + texto como estructura de página; blobs; degradados púrpura; glassmorphism; emoji como icono; numeración 01 / 02 / 03 de adorno.
- Los servicios se presentan como un índice tipográfico (nombre, breve, acción), no como cards de iconos de colores distintos.
- El proceso es una lista vertical clara. Si se enumera, que sea porque el orden importa, no como ornamento.
- CTA principal: «Consultar por WhatsApp». CTA secundario de texto: «Ver catálogo».
- Formulario de cotización: arma el mensaje y abre `wa.me`; no guarda datos en el sitio.

## Iconografía

Iconos solo cuando aclaran una acción (por ejemplo, el glifo de WhatsApp junto al CTA). Un solo trazo y un solo peso, en `--ink` o en el color del botón. El rayo naranja no se recicla como icono decorativo fuera del logo.

## Favicon e imagen social

- Favicon: `landing/favicon.svg` — campo `--blue`, rayo `--bolt` simplificado, legible a 16 px.
- Apple touch: `landing/apple-touch-icon.png` (180×180), misma lógica.
- Open Graph: `landing/og-image.png` (1200×630), fondo papel o azul, logo oficial, una línea de oferta, sin fotomontajes ni stock.


## Fotografía

Las fotos de la landing salen del catálogo de WhatsApp Business (trabajos reales). No se usa stock ni ilustraciones genéricas.

- Recortar el área de la foto (sin cromo de WhatsApp, flechas del carrusel ni textos de precio).
- Si la resolución es baja (capturas de ~500–600 px), no ampliar de forma agresiva. Usar las fotos a un tamaño cercano al nativo: velo azul `#014397` en el hero a sangre, tarjetas de galería relativamente compactas, `object-fit: cover`.
- Plomería e instalación de gas no tienen fotos en el catálogo: se presentan solo con tipografía, nunca con stock.
- La galería «Trabajos realizados» usa los nombres oficiales de los ítems. No se publican precios (el de instalación de aires del catálogo, Bs 95, es un error; si en algún momento se publicara, sería «desde Bs 700»). El ítem 2 se llama «Colocación de panel trifásico».
- Formato de entrega: WebP con respaldo JPG, `loading="lazy"` salvo el hero (`fetchpriority="high"`).

## Cómo reutilizar esto en la app

La PWA debe leer estos mismos tokens (CSS variables en un `:root` compartido o un archivo `tokens.css`). En modo Operate (formularios, listas, recordatorios):

- El azul de marca es acción y selección, no un fondo masivo de pantalla.
- Campos grandes, pocos toques, el mismo radio y la misma tipografía.
- Estados de error con `--danger` y texto, nunca solo con color.
- El naranja del rayo no aparece en la UI de trabajo, salvo el isotipo en la cabecera de la app.
