# SEID — Análisis de viabilidad, arquitectura, fases y costos

**Fecha del informe:** 23 de noviembre de 2026 (America/La_Paz)  
**Preparado para:** Daniel Pro (ingeniero de software), para cotizar e implementar el proyecto de la empresa SEID del Ing. Abel Galarza (Santa Cruz, Bolivia).  
**Alcance de este documento:** viabilidad técnica, stack, fases y **gastos de infraestructura/herramientas que pagaría el Ing. Galarza**. **No incluye** el honorario profesional de Daniel.

Los precios se consultaron el 23 de noviembre de 2026. Las tarifas cambian: hay que confirmarlas en la fuente oficial el día del pago. Donde no se pudo leer un monto en la página oficial (por ejemplo, la tabla de NIC.bo se renderiza de forma que no expone los números en el HTML), se indica con claridad y se cita la fuente secundaria que consultó esa misma tabla.

---

## 1. Resumen ejecutivo

El proyecto es **viable** y, bien acotado, puede arrancar con un gasto de infraestructura muy bajo. SEID es una empresa formal, unipersonal en la práctica (el Ing. Galarza trabaja solo). Eso favorece un sistema simple, para un solo usuario, pensado para usarse en el celular en obra, no un ERP grande.

**Recomendación principal**

| Pieza | Recomendación |
| --- | --- |
| Landing | Sitio estático (Astro o HTML/CSS). **Demo** en GitHub Pages (repositorio público, como pediste). **Producción** en Cloudflare Pages (plan gratuito, uso comercial permitido) con dominio propio. |
| Dominio | Empezar la demo sin dominio (URL `usuario.github.io/seid`). En producción: **`seid.com.bo`** (o el nombre que esté libre) en NIC Bolivia, **Bs 280 al año**, pagable en bolivianos. Opcional y más barato en dólares: **`.com` en Cloudflare Registrar (~USD 11,17/año, at cost)**. El `.bo` corto (~Bs 980/año) no hace falta al inicio. |
| Panel administrativo | **PWA instalable en el celular** (se agrega a la pantalla de inicio y se siente como app). Evita la cuota de Google Play (USD 25 único) y la de Apple (USD 99/año). Diseño de formularios grandes, pocos toques, offline-first. Si más adelante Abel insiste en Play Store, se puede empaquetar la misma PWA (TWA) o publicar una app Expo. |
| Backend | **Supabase**. En escenario mínimo: plan Free (con salvedades). En escenario recomendado: **Pro, desde USD 25/mes**, para que el proyecto no se pause y haya respaldos. |
| Recordatorios de mantenimiento | 15 días antes del ciclo de 6 meses: notificación push (FCM, sin costo) y, si se desea, plantilla *utility* de WhatsApp al propio Abel (~USD 0,0113 por mensaje a números bolivianos, según tarifas de lista publicadas). |
| Agente WhatsApp | Fase 3. Mantener el número actual de **WhatsApp Business**. Conectar **Cloud API con coexistencia** para que Abel siga usando la app en el celular. El bot responde y cotiza aires con las listas de precios que Abel cargue. Modelo de IA barato: **Gemini Flash-Lite** (hay capa gratuita; en producción conviene plan de pago por privacidad) o **Claude Haiku 5.5**. |
| Automatización | Preferir funciones programadas (Supabase Edge Functions / Cloudflare Workers), sin costo extra relevante a esta escala. n8n autohospedado o Make son alternativas, no un requisito. |

**Costos de infraestructura (sin honorarios de Daniel)**

| Escenario | Único / primer año (aprox.) | Mensual en régimen (aprox.) | Año 1 total (aprox.) |
| --- | --- | --- | --- |
| **Mínimo** (demo + producción austera, PWA, planes gratuitos, dominio `.com.bo`) | Bs 280 (dominio) ≈ **USD 24** al tipo oficial | **USD 0** si se permanece en capas gratuitas* | **≈ USD 24 / Bs 280** |
| **Recomendado** (dominio `.com.bo`, Supabase Pro, margen para WhatsApp + IA) | Bs 280 de dominio | **USD 25–33 / Bs 294–388** (oficial) | **≈ USD 325–420 + Bs 280 de dominio** → en conjunto **≈ USD 349–444 / Bs 4.100–5.220** al tipo oficial |

\*El plan Free de Supabase **pausa el proyecto a la semana de inactividad**. Es un riesgo real si Abel no entra todos los días. Por eso el escenario recomendado paga Supabase Pro.

Un botón de WhatsApp en la landing (`wa.me`) **no cobra nada**. Los costos de Cloud API aparecen recién en la fase del agente o de recordatorios por WhatsApp.

---

## 2. Entendimiento del proyecto

### 2.1 La empresa

- **Nombre:** SEID  
- **Ubicación:** Santa Cruz, Bolivia  
- **Titular:** Ing. Abel Galarza  
- **Situación:** empresa creada y formal (paga impuestos); en la operación, Abel trabaja de forma independiente y será el **único usuario** del panel.

### 2.2 Servicios a comunicar en la landing

1. Aire acondicionado: instalación y mantenimiento  
2. Electricidad domiciliaria completa (monofásico y trifásico) y eléctrica industrial  
3. Plomería, desagüe pluvial y trabajos de agua  
4. Instalación de gas  

La landing debe mostrar esos servicios y un llamado a la acción claro: **consultar por WhatsApp directamente a Abel**.

### 2.3 Lo que hay que construir

1. **Landing web** demostrable en GitHub Pages desde un repositorio público.  
2. **Aplicación de administración en el celular** (Abel prioriza app frente a “sistema web”), con UX/UI muy simple:  
   - registro de trabajos y ventas;  
   - digitalizar las dos plantillas de mantenimiento de aires y generar PDF;  
   - padrón de clientes y equipos;  
   - aviso automático **unos 15 días antes** del mantenimiento a los 6 meses (qué aire, qué cliente, dónde está);  
   - calendario, más adelante.  
3. **Agente en WhatsApp Business** que atienda consultas y arme cotizaciones de aires usando las listas de precios que le dan los proveedores a Abel.

### 2.4 Las dos plantillas de mantenimiento (campos a digitalizar)

La descripción de las hojas que Abel usa hoy (las fotos no se pudieron reabrir desde este entorno; conviene validar el detalle contra los originales al implementar) es la siguiente.

**Plantilla A — Formato de mantenimiento preventivo de aires acondicionados**

- Fecha, OT (orden de trabajo), inventario, ubicación, técnico  
- Tipo de equipo (casillas): ventana, minisplit, piso techo, central, cassette  
- Checklist de trabajos realizados  
- Observaciones, correctivos, firmas  

**Plantilla B — Informe de mantenimiento (estilo Oleoflores)**

- Marca, modelo, serie, tipo, capacidad, refrigerante  
- 10 actividades con estado *efectuado* / *no realizado*  
- Parámetros de operación **antes y después:** presión baja, presión alta, amperaje del compresor, voltaje  
- Reporte de fallas, repuestos, firmas  

El PDF generado debería parecerse lo más posible a esas hojas, para que Abel (y el cliente que firma) reconozca el mismo documento.

---

## 3. Viabilidad

**Sí, es viable.** El alcance encaja en un producto de fases, con herramientas de capa gratuita o de bajo costo, y un solo usuario final.

Fortalezas:

- El volumen de datos de un técnico independiente (clientes, equipos, PDFs, fotos) cabe con holgura en planes Free/Pro de entrada.  
- El recordatorio a 6 meses es un problema resuelto (fecha de instalación o del último mantenimiento + 183 días − 15 días de aviso).  
- La cotización de aires es estructurable: el agente no “inventa” precios; consulta listas que Abel actualiza.  
- La landing no necesita backend.  
- La demo pública en GitHub Pages permite enseñarle a Abel un avance real antes de gastar en dominio o planes de pago.

Riesgos a gestionar (ninguno bloquea el arranque):

- **WhatsApp Cloud API** exige portafolio de Meta, método de pago y, para coexistencia, que quien integre sea Tech Provider / Solution Partner o use un BSP (proveedor). No es “conectar un webhook en una tarde” la primera vez.  
- **Capas gratuitas** tienen límites y, en Supabase Free, pausa por inactividad.  
- **Pago en dólares** de servicios internacionales: hace falta tarjeta internacional (o un intermediario). Ver sección de tipo de cambio.  
- Si Abel usa **iPhone**, las notificaciones push de una PWA son más limitadas que en Android. Hay que confirmar su sistema operativo.  
- El agente de cotización solo es fiable si las listas de proveedores están al día y el bot **escala a Abel** cuando falta un dato o el trabajo no es un aire estándar.

---

## 4. Arquitectura y opciones de stack

### 4.1 Principio de diseño (UX para Abel)

El panel no debe parecer un sitio de escritorio abierto en el celular. Aunque por debajo sea web (PWA) o híbrido (Expo):

- pantallas de un solo propósito, tipografía grande, botones de pulgar;  
- el flujo de un mantenimiento debe seguir el orden de la hoja de papel;  
- firmas con el dedo;  
- fotos del equipo y de la placa (marca/serie) con la cámara;  
- **funciona sin internet en obra** y sincroniza después (crítico en Santa Cruz, en techos y sótanos);  
- PDF descargable y enviable por WhatsApp / correo;  
- un solo usuario (Abel), con opción futura de un ayudante.

### 4.2 Landing (web)

| Opción | Ventaja | Desventaja | Veredicto |
| --- | --- | --- | --- |
| **Astro** (estático) o HTML/CSS | Rápido, barato de hostear, excelente SEO y carga en 3G | No es un “app” (no hace falta aquí) | **Recomendada** |
| Next.js / similar | Útil si más adelante la landing y el panel comparten monorepo | Más complejidad de la necesaria para un brochure | Aceptable si ya se usa en el panel |
| WordPress + hosting compartido | Abel podría editar textos | Costo de hosting y mantenimiento innecesario | No recomendada |

Botón de contacto: enlace `https://wa.me/591XXXXXXXX` (o `https://wa.me/591XXXXXXXX?text=Hola...`). Costo: **cero**.

**Demo:** repositorio público + GitHub Pages.  
**Producción:** Cloudflare Pages (plan Free). GitHub Pages sirve muy bien para la demo; para el sitio comercial de una empresa, Cloudflare Pages es la opción más clara: el plan Free permite uso comercial y dominio propio con HTTPS. El plan Hobby de **Vercel está pensado para uso personal / no comercial**, así que **no** conviene usarlo como hosting de producción de SEID.

Fuentes: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages), [límites de Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/), [términos de Vercel](https://vercel.com/legal/terms).

### 4.3 Panel: PWA vs Expo / React Native vs Flutter

Daniel prefiere “aplicación y no un sistema web”. Eso se puede cumplir de dos maneras: una **PWA que se instala y se siente como app**, o una app nativa en las tiendas.

| Criterio | **PWA instalable** (recomendado al inicio) | **Expo (React Native)** | **Flutter** |
| --- | --- | --- | --- |
| Sensación de app | Alta en Android (acceso directo, pantalla completa). En iOS, buena pero con matices | Nativa | Nativa, muy pulida |
| Costo de tiendas | **USD 0** | Play USD 25 único; App Store USD 99/año si se publica en iOS | Igual que Expo si se publica |
| Demo para Abel | La misma URL, también en GitHub Pages / Cloudflare | Requiere build (Expo EAS Free: hasta 15 builds Android y 15 iOS al mes, cola de baja prioridad) o TestFlight | Builds locales o CI |
| Offline / cámara / PDF / firma | Viable (IndexedDB, service worker) | Excelente | Excelente |
| Un solo código con la landing | Sí (web) | Parcial (se puede monorepo, no es el mismo bundle) | No comparte UI con la landing |
| Curva y talento JS | Máxima coincidencia si la landing es web | Alta si se trabaja en TypeScript | Otra curva (Dart) |
| Actualizaciones | Inmediatas, sin pasar por tienda | Tienda, o canal de updates de Expo | Tienda |

**Recomendación:** construir el panel como **PWA móvil primero**, con instalación (“Agregar a la pantalla de inicio”) y aspecto de aplicación. Es lo más accesible para Abel en costo y para Daniel en entrega de demos. Si Abel usa Android (lo más frecuente en este contexto, hay que confirmarlo), el resultado es muy convincente. Si más adelante quiere el ícono en Play Store, se puede publicar un envoltorio TWA o un cliente Expo **sin rehacer la lógica de negocio**.

No recomiendo pagar el programa de Apple (USD 99/año) para un sistema **interno de un solo usuario**. Si Abel tiene iPhone, la PWA en Safari + “Agregar a inicio” alcanza.

Fuentes de tarifas de tiendas (noviembre 2026): [Google Play Console — USD 25 de registro, un solo pago](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en); [Apple Developer Program — USD 99 por año de membresía](https://developer.apple.com/programs/enroll/). Expo EAS Free: [expo.dev/pricing](https://expo.dev/pricing).

### 4.4 Backend: autenticación, base de datos y archivos (PDFs, fotos)

| Opción | Plan de entrada | Encaje para SEID | Veredicto |
| --- | --- | --- | --- |
| **Supabase** | **Free:** USD 0; 2 proyectos activos; 500 MB de base; 1 GB de archivos; 5 GB de egress; 50.000 MAU; API ilimitada. **Ojo: el proyecto se pausa tras 1 semana de inactividad.** **Pro:** desde **USD 25/mes** (incluye créditos de cómputo Micro, 8 GB de disco, 100 GB de storage, 250 GB de egress, respaldos diarios 7 días; no se pausa). | Auth, Postgres, storage de PDFs/fotos, funciones y (en Pro o con workarounds) tareas programadas | **Recomendado.** Free para desarrollo/demo; **Pro en producción**. |
| **Firebase** | **Spark (gratis, sin tarjeta):** Auth 50.000 MAU; Firestore 1 GiB, 50.000 lecturas/día, 20.000 escrituras/día, 10 GiB egress/mes; Hosting 10 GB y 360 MB/día; **FCM (push) sin costo**. **Cloud Functions no está en Spark** (hace falta plan Blaze, pago por uso, con cuotas gratuitas). En la tabla oficial, el storage de archivos en buckets clásicos aparece como no aplicable en Spark para algunos casos: para PDFs conviene Blaze o Supabase Storage. | Muy bueno para push. El paso a Blaze es casi inevitable si hay funciones programadas (recordatorios). | Alternativa sólida, sobre todo si se elige Expo + FCM. |
| PocketBase u otro backend en un VPS | Costo = el VPS (~EUR 5,49–5,99/mes) | Control total, más operación a cargo de Daniel | Solo si se quiere evitar proveedores en USD |

Fuente Supabase: [supabase.com/pricing](https://supabase.com/pricing). Fuente Firebase: [firebase.google.com/pricing](https://firebase.google.com/pricing).

### 4.5 Generación de PDF

Generar el PDF **en el celular** (por ejemplo `pdf-lib` o una plantilla HTML a PDF) evita un servidor de informes. El archivo se guarda en Storage y Abel lo comparte. Las firmas van embebidas. Es la vía más barata y funciona offline si se implementa bien.

### 4.6 Arquitectura de referencia (escenario recomendado)

```
[Landing estática] ── Cloudflare Pages (prod) / GitHub Pages (demo)
        │
        └── Botón wa.me ──> WhatsApp de Abel

[PWA admin, celular de Abel]
        │  Auth + API
        ▼
[Supabase]  Postgres (clientes, equipos, OT, mantenimientos, ventas, listas de precios)
            Storage (PDF, fotos)
            Edge Functions (recordatorios, webhook de WhatsApp en fase 3)

[Recordatorios]  cron diario ──> push FCM y/o plantilla utility de WhatsApp a Abel

[Fase 3]  WhatsApp Cloud API (coexistencia con la app Business)
            └── Agente (Gemini Flash-Lite o Claude Haiku 5.5)
                    └── Lee listas de precios + escala a Abel
```

---

## 5. Dominio y hosting

### 5.1 Dominios bolivianos (NIC Bolivia)

Desde el 15 de enero de 2026 el `.bo` lo administra la **AGETIC** (D.S. 5519); el trámite sigue en [nic.bo](https://nic.bo/). Se puede pagar de 1 a 6 años por adelantado. El titular (persona o empresa) y los datos de facturación (NIT/CI) quedan asociados al dominio.

La página de NIC.bo muestra “Nuestros precios”, pero en la consulta de este informe los montos no vinieron en el HTML (probablemente van en un componente visual). Varias guías que **consultaron la tabla oficial en noviembre de 2026** coinciden en:

| Tipo | Ejemplo | Precio anual (NIC Bolivia) | ≈ USD al TCO oficial (Bs 11,75) |
| --- | --- | --- | --- |
| Segundo nivel | `seid.bo` | **Bs 980** | ≈ USD 83,40 |
| Tercer nivel | `seid.com.bo`, también `.org.bo`, `.net.bo`, etc. | **Bs 280** | ≈ USD 23,83 |
| Interés social | p. ej. `.empresa.bo`, `.info.bo` | **Bs 55** (si aplicara y el nombre estuviera en esa categoría) | ≈ USD 4,68 |

Fuentes: [nic.bo](https://nic.bo/); consulta del 10-nov-2026 en [BeMoreX](https://bemorex.com/blog/hosting-y-dominio-en-bolivia/); consulta del 6–7-nov-2026 en [Quimera Hosting](https://quimerahosting.com/dominios/registrar-dominio-bo/). **Confirmar el total en nic.bo antes de pagar** (impuestos, si los hay, y vigencia de la tarifa).

Para una pyme de Santa Cruz, **`.com.bo` es la opción más razonable**: se paga en bolivianos, factura local, y transmite presencia boliviana. El `.bo` corto es bastante más caro y no es imprescindible.

### 5.2 Dominio `.com`

No tiene precio único; depende del registrador. Tras el alza de Verisign del 1 de noviembre de 2026 (tarifa mayorista USD 10,97) + USD 0,20 de ICANN:

| Registrador | Registro (aprox.) | Renovación (aprox.) | Notas |
| --- | --- | --- | --- |
| **Cloudflare Registrar** | **USD 11,17**/año | **USD 11,17**/año (at cost, sin markup; ICANN incluido) | Debe usar nameservers de Cloudflare. Encaja si el sitio vive en Cloudflare Pages. Precio observado en nov. 2026. |
| **Namecheap** (regular, desde el 1-nov-2026) | USD 15,98/año + USD 0,20 ICANN (el primer año a veces tiene oferta) | **USD 19,98 + USD 0,20 = USD 20,18**/año | Más caro a largo plazo que Cloudflare. |

Fuentes: [anuncio de Namecheap](https://www.namecheap.com/support/knowledgebase/article.aspx/10840/2201/com-price-change-november-1-2026); [FAQ de Cloudflare Registrar (at cost, nameservers propios)](https://developers.cloudflare.com/registrar/faq/). El USD 11,17 de Cloudflare (10,97 + 0,20) está reportado por observatorios de precios de noviembre de 2026 (p. ej. [tld.reviews](https://tld.reviews/prices/history), consulta 9-nov-2026). Confirmar en el checkout de Cloudflare.

### 5.3 Qué dominio conviene

1. **Demo (ahora):** sin dominio, GitHub Pages. Costo USD 0.  
2. **Producción, máximo accesible y pago en Bs:** `algo.com.bo` en nic.bo, **Bs 280/año**.  
3. **Si Abel tiene cómo pagar USD y se quiere el nombre corto internacional:** `algo.com` en Cloudflare, **≈ USD 11,17/año**.  
4. **Opcional más adelante:** registrar ambos y redirigir uno al otro (suma de los dos precios).

Hay que comprobar disponibilidad (`seid.com.bo`, `seid.bo`, `seid.com`, o un nombre más específico si `seid` está tomado).

### 5.4 Hosting de la landing

| Servicio | Costo | Dominio propio + HTTPS | Uso comercial | Rol sugerido |
| --- | --- | --- | --- | --- |
| **GitHub Pages** | USD 0 en repos públicos | Sí | Pensado para sitios de usuario/organización/proyecto; para el **sitio comercial definitivo** es más limpio no depender de él | **Demo** que Abel puede abrir |
| **Cloudflare Pages Free** | USD 0 (500 builds/mes, 1 build a la vez, 20.000 archivos, 100 proyectos, 100 dominios custom por proyecto) | Sí | Sí (plan Free) | **Producción** de la landing (y de la PWA) |
| **Vercel Hobby** | USD 0 | Sí | **No recomendado** (restricción de uso personal / no comercial en los términos) | Evitar para SEID |
| Firebase Hosting Spark | 10 GB storage, 360 MB/día | Sí | Sí, dentro de los límites de Spark | Alternativa si todo el stack es Firebase |

No hace falta un hosting compartido tradicional (cPanel) si la landing es estática.

Correo `@dominio`: no es obligatorio para arrancar. Se puede evaluar más adelante un reenvío (por ejemplo, enrutamiento de correo de Cloudflare, si se usa ese DNS) hacia el Gmail de Abel. No se incluye un buzón de pago en ninguno de los dos presupuestos.

---

## 6. WhatsApp: app Business vs Cloud API

### 6.1 Fase 1 (sin agente): no migrar nada

El número que Abel ya usa en **WhatsApp Business** se enlaza en la landing. Él responde a mano, como hoy. **Costo de Meta: USD 0.**

### 6.2 Cuando se automatiza: Cloud API y coexistencia (importante)

El modelo antiguo de Cloud API **sacaba el número de la app del celular**. Para alguien que trabaja solo y tiene que tomar el teléfono en cualquier momento, eso es un problema grave.

En 2026 Meta documenta la **coexistencia** (onboarding de usuarios de la app WhatsApp Business): el **mismo número** puede seguir en la app Business y, a la vez, conectarse a Cloud API.

Puntos oficiales a tener en cuenta:

- Hace falta **WhatsApp Business app 2.24.17 o superior**.  
- Quien configura el Embedded Signup debe ser **Solution Partner o Tech Provider**. Daniel puede completar esa verificación en Meta o apoyarse en un BSP (proveedor de la API) que ya lo sea. El trámite no tiene una tarifa pública única de Meta; un BSP sí puede cobrar plataforma mensual (hay que cotizarlo en su momento; **aquí no se inventa ese precio**).  
- Tras el alta, los chats 1 a 1 y los contactos se pueden sincronizar. **Grupos, llamadas, listas de difusión y varias herramientas solo-de-la-app siguen en la app.**  
- El número compartido tiene un tope de 20 mensajes por segundo (irrelevante a esta escala).  
- **Los mensajes que Abel envíe desde la app Business siguen sin costo. Los que salgan por Cloud API se facturan** con la tarifa de Cloud API.

Fuente: [Onboard WhatsApp Business app users (coexistencia)](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users).

**Recomendación:** no “migrar” el número abandonando la app. En fase 3, **conectar Cloud API en modo coexistencia** y dejar que Abel retome cualquier conversación desde el celular. El agente debe tener un botón o palabra clave de “pasar con el ingeniero”.

### 6.3 Cómo cobra Meta (reglas oficiales, vigentes con la actualización del 1 de octubre de 2026)

Fuente: [Pricing on the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing).

- Se cobra **por mensaje entregado**, solo de empresa a usuario. **Los mensajes del cliente a la empresa no se cobran.**  
- Desde el 1 de julio de 2025 el cobro es **por mensaje** (ya no por “conversación” de 24 h como en el modelo anterior).  
- Las **ventanas de 24 h** siguen existiendo para **responder con mensajes libres (no plantilla)**. Esos mensajes se clasifican como **service**. Para escribirle a un cliente **fuera** de esa ventana hace falta una **plantilla** (utility, marketing o authentication).  
- **Capa gratuita de service:** los **primeros 1.000 mensajes service entregados por mes, por número de negocio**, son gratis. No se acumulan al mes siguiente. A partir del 1.001 se cobra.  
- También son gratis los mensajes dentro de la **free entry point window** (p. ej. cuando el chat nace de un anuncio click-to-WhatsApp, hasta 7 días, según la documentación de Meta).  
- Bolivia (**código +591**) no es un mercado con tarifa propia: está en la región **“Rest of Latin America”**.

### 6.4 Tarifas por mensaje a números bolivianos

Meta publica un **CSV / rate card oficial** (“USD list rates”) en su página de pricing, pero en esta consulta no se pudo extraer el archivo binario con los montos. Varios recuentos que citan la **tarifa de lista vigente desde el 1 de octubre de 2026** para Bolivia / Rest of Latin America coinciden en:

| Categoría | ¿Cuándo se usa en SEID? | USD por mensaje entregado |
| --- | --- | --- |
| **Marketing** | Promos, reenganche (no hace falta al inicio) | **0,0740** |
| **Utility** | Avisos transaccionales: p. ej. “en 15 días toca mantenimiento del minisplit de Don X, en [dirección]” | **0,0113** |
| **Authentication** | OTP, si alguna vez se usara | **0,0113** |
| **Service** (respuesta libre en la ventana de 24 h, p. ej. el agente de IA) | Primeros **1.000/mes/número: USD 0**. Luego **0,0113** | **0,0113** después de la capa gratis |

Fuentes secundarias (confirmar contra el CSV oficial de Meta antes de comprometer un número con Abel): [Mywa, tarifas oct. 2026](https://mywa.net/whatsapp-api-pricing/bolivia), [Linqa](https://linqa.com/pricing/whatsapp/bolivia/), [Telerivet](https://www.telerivet.com/product/whatsapp/country/bo), [PayPerWa rate card 2026-10-01](https://payperwa.com/meta-whatsapp-rates-2026-10-01.csv). La página oficial de reglas y de la región: [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing).

**Qué implica para SEID:** con un flujo típico de un técnico independiente (decenas de chats al mes, no miles), las respuestas del agente casi seguro **entran en los 1.000 service gratis**. Los recordatorios de mantenimiento, si se envían como plantilla utility **fuera** de una ventana de 24 h, sí se pagan: 20 avisos/mes × USD 0,0113 ≈ **USD 0,23/mes**. Es despreciable frente a cualquier plan de backend.

Hace falta un **método de pago en el Billing Hub de Meta** para que, al pasar de 1.000 service, los mensajes no se dejen de entregar.

---

## 7. Agente de IA (cotizaciones de aires)

El agente no debe improvisar precios. Debe:

1. Entender si el cliente pide un aire, un mantenimiento, electricidad, plomería o gas.  
2. Si es cotización de aire: pedir datos mínimos (ambiente, BTU/capacidad si la sabe, 220 V, marca preferida, instalación incluida o no, ciudad/zona).  
3. Consultar las **listas de proveedores** que Abel carga (tabla en Supabase, o una planilla que él actualice).  
4. Armar una cotización tentativa y dejar claro que **la confirma el Ing. Galarza**.  
5. Escalar a Abel ante duda, pedido especial o servicios que no sean aires.

### 7.1 Costo de modelos (oficial, por 1 millón de tokens, USD)

| Modelo | Entrada | Salida | Capa gratuita | Fuente |
| --- | --- | --- | --- | --- |
| **Gemini 2.5 Flash-Lite** (`gemini-2.5-flash-lite`) | USD 0,10 (texto) | USD 0,40 | Sí, tokens gratis en Free (con límites de ritmo; el contenido **puede usarse para mejorar productos de Google**) | [Gemini Developer API pricing](https://aistudio.google.com/docs/pricing) |
| **Gemini 3.1 Flash-Lite** (`gemini-3.1-flash-lite`) | USD 0,25 (texto) | USD 1,50 | Sí, misma salvedad de datos en Free | Igual |
| **Gemini 3.5 Flash-Lite** (`gemini-3.5-flash-lite`) | USD 0,30 | USD 2,50 | Sí, misma salvedad | Igual |
| **Claude Haiku 5.5** (prompts ≤ 100 k tokens) | USD 0,10 | USD 0,50 | No hay capa gratis permanente de API (sí créditos de prueba para cuentas nuevas) | [Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| GPT-5 mini | USD 0,25 | USD 2,00 | No evaluado como primera opción (salida más cara) | [OpenAI pricing](https://developers.openai.com/api/docs/pricing) |

**Recomendación de modelo:** en desarrollo, Gemini Flash-Lite en capa gratuita. En producción, **plan de pago** de Gemini (para que los chats de clientes no entren en “used to improve our products”) o **Claude Haiku 5.5**, que es muy competitivo en precio y calidad para cotizaciones en español.

**Orden de magnitud:** 50 chats/mes, 3 turnos, ~1.500 tokens de entrada y ~400 de salida por turno ≈ 225 k de entrada y 60 k de salida al mes. Eso es **≈ USD 0,05** con Gemini 2.5 Flash-Lite o **≈ USD 0,05** con Haiku 5.5. Incluso multiplicando por 10 el volumen, el IA sigue en pocos dólares al mes. En el presupuesto recomendado se reserva un **colchón de USD 1–5/mes**.

Daniel tiene Claude Pro para trabajar en el desarrollo; eso **no reemplaza** una clave de API de producción (son productos distintos).

---

## 8. Recordatorios y calendario

- **Regla:** fecha base (instalación o último mantenimiento) + 6 meses, aviso **15 días antes** (el plazo debe ser configurable).  
- **Contenido del aviso a Abel:** cliente, ubicación, equipo (marca/modelo/serie/tipo), fecha límite del mantenimiento.  
- **Canal mínimo (gratis):** notificación push con FCM si el panel es PWA en Android o app nativa; más una bandeja “Pendientes” dentro de la app (no depende de push).  
- **Canal muy barato y natural para Abel:** plantilla WhatsApp *utility* al número de Abel (≈ USD 0,0113).  
- **Telegram** a Abel es otra vía de costo cero, si él lo usa; no es necesario.  
- En **iOS**, si se queda en PWA, el push es el punto más débil: la bandeja en la app + WhatsApp al propio Abel cubren el hueco.

El **calendario (fase 4)** puede ser una vista mensual dentro de la app (instalaciones, mantenimientos, avisos). No requiere Google Calendar ni un SaaS extra. Si más adelante se desea, se puede exportar a ICS o sincronizar con Google; no hace falta presupuestarlo ahora.

Tarea programada: un cron diario (Supabase scheduled function, Cloudflare Workers cron, o un workflow de n8n). A esta escala, el costo de cómputo es despreciable o está incluido en el plan.

---

## 9. Plataformas de automatización (fase 3 y recordatorios)

| Opción | Precio consultado | Cuándo usarla |
| --- | --- | --- |
| **Código propio** (Edge Functions / Workers) | USD 0 en capas gratuitas, a este volumen | **Preferida:** menos piezas, mismo repo, más control |
| **n8n Community Edition** autohospedada | Software **gratis** (uso interno/negocio, con la licencia community: usuarios externos no editan flujos). El costo es el VPS. | Si se quieren flujos visuales y Daniel quiere operar un servidor |
| **VPS Hetzner Cloud** | Desde **EUR 5,49/mes** (Regular Performance) o **EUR 5,99/mes** (Cost-Optimized), **sin IVA** en la lista; los clientes fuera de la UE normalmente no pagan IVA alemán, **confirmar en el checkout**. ≈ **USD 6,0–6,6** a EUR/USD 1,10 | Solo si se elige n8n u otro backend propio |
| **n8n Cloud Starter** | **EUR 20/mes** con facturación anual (hosted por n8n) ≈ USD 22 | Comódo, pero más caro que Pro de Supabase no justifica si ya hay backend |
| **Make** | Plan Free: **1.000 créditos/mes**. Core: reportado en nov. 2026 a **USD 16/mes** (mensual) o **USD 12/mes** (anual) por 10.000 créditos. La página de planes no dejó leer los montos con claridad en esta consulta; **confirmar en [make.com/pricing](https://www.make.com/en/pricing)** | Útil para un experimento corto; no es la base recomendada del agente |

Fuentes: [n8n pricing](https://n8n.io/pricing/), [n8n Community / self-host](https://docs.n8n.io/hosting/), [Hetzner Cloud](https://www.hetzner.com/cloud/), [Make pricing](https://www.make.com/en/pricing).

**Veredicto:** no alquilar VPS ni n8n Cloud en el arranque. Reservarlos como plan B.

---

## 10. Fases de trabajo

Trabajar por fases permite mostrarle avances a Abel (sobre todo la landing en GitHub Pages) y no gastar en API de WhatsApp ni en Supabase Pro hasta que el panel exista.

### Fase 1 — Landing y presencia

- Sitio con servicios (aires, electricidad monofásica/trifásica e industrial, plomería/pluvial/agua, gas), zona de trabajo (Santa Cruz), identidad de SEID e Ing. Galarza.  
- CTA de WhatsApp (`wa.me`).  
- Repositorio **público** y demo en **GitHub Pages**.  
- Costo de infra: **USD 0**. Dominio, cuando Abel apruebe: `.com.bo` o `.com`.

### Fase 2 — App de administración + PDF + recordatorios

- PWA instalable, login simple (correo + contraseña o enlace mágico).  
- Clientes, ubicaciones, equipos de aire (datos de placa + tipo/capacidad/refrigerante).  
- Registro de trabajos y ventas.  
- Formularios digitales de las plantillas A y B, firmas, fotos, **PDF**.  
- Recordatorio 15 días antes del mantenimiento semestral (app + push y/o WhatsApp utility a Abel).  
- Aquí se decide Free vs Pro de Supabase según el uso real.

### Fase 3 — Agente de WhatsApp

- Alta de Cloud API **con coexistencia** (el número no abandona la app de Abel).  
- Listas de precios de proveedores (Abel las edita en la app).  
- Agente para preguntas frecuentes y **cotización de aires**, con escalamiento a Abel.  
- Otros servicios: captura del pedido y aviso a Abel, sin cotizar a ciegas.

### Fase 4 — Calendario

- Vista calendario de instalaciones, mantenimientos y recordatorios.  
- Filtros por cliente/equipo. Se puede ir encajando en la fase 2 si sobra tiempo, pero no es el primer entregable.

---

## 11. Tipo de cambio usado

Bolivia ya no está en el tipo fijo de 6,96. Desde el 29 de junio de 2026 rige un régimen flexible; el **TCO del Banco Central** y el **paralelo (P2P)** están cerca, con una brecha del orden del **2–3 %** en esta fecha.

| Tipo | Valor al 23 de noviembre de 2026 | Fuente |
| --- | --- | --- |
| **Oficial (TCO BCB)** | **Bs 11,75 por USD 1**, vigente del 21 al 23 de noviembre de 2026 (corte del viernes 20-nov-2026) | [BCB — última cotización TCO](https://www.bcb.gob.bo/bcb_tco_publico_ultima_cotizacion.php) |
| **Paralelo P2P** | Compra **Bs 11,96** / venta **Bs 12,08** (último registro del 23-nov-2026) | [paralelobolivia.com](https://paralelobolivia.com/en/exchange-rate-history) |
| **EUR/USD** (solo para VPS/n8n) | ≈ **1,10** (mercado ~1,097 el 23-nov-2026; se redondea a 1,10 para las conversiones) | Cotización de mercado del día (p. ej. series EURUSD) |

**Cómo se convierten los montos de este informe**

- Precios que NIC cobra en bolivianos se muestran en Bs y se aproximan a USD como `Bs ÷ 11,75`.  
- Precios internacionales en USD se aproximan a Bs oficiales como `USD × 11,75`.  
- Si Abel debe **comprar dólares en el paralelo** para pagar una tarjeta o un servicio en USD, el costo en bolivianos es más cercano a `USD × 12,08` (precio de **venta** del 23-nov-2026): unos **+2,8 %** respecto al oficial.  
- El TCO se publica por jornadas y **se mueve**. Los equivalentes en Bs de servicios en USD hay que recalcularlos el día del pago.

**Pago práctico:** el dominio `.com.bo` se puede pagar en Bolivia (tarjeta o transferencia, según lo que muestre nic.bo). Supabase, Cloudflare, Meta y Google Play exigen, en la práctica, **tarjeta internacional** u otro medio en USD. Conviene confirmar con Abel si dispone de una antes de comprometer el escenario recomendado.

---

## 12. Tablas de costos (sin honorarios de Daniel)

Montos “aprox. BOB oficial” = USD × 11,75. Entre paréntesis, cuando aplica, BOB si se compra el dólar al paralelo de venta (× 12,08).

### 12.1 Piezas sueltas (referencia)

| Ítem | Frecuencia | USD | BOB oficial | BOB si USD al paralelo | Fuente / nota |
| --- | --- | --- | --- | --- | --- |
| Dominio `.com.bo` (NIC) | Anual | ≈ 23,83 (derivado) | **280** | — (se paga en Bs) | Confirmar en nic.bo |
| Dominio `.bo` | Anual | ≈ 83,40 (derivado) | **980** | — | Confirmar en nic.bo |
| Dominio `.com` Cloudflare | Anual | **11,17** | ≈ 131 | ≈ 135 | At cost, nov. 2026 |
| Dominio `.com` Namecheap (renovación regular) | Anual | **20,18** | ≈ 237 | ≈ 244 | 19,98 + 0,20 ICANN |
| GitHub Pages / Cloudflare Pages Free | Mensual | **0** | 0 | 0 | Suficiente para la landing |
| Supabase Free | Mensual | **0** | 0 | 0 | Pausa a los 7 días sin uso |
| Supabase Pro | Mensual | **25** (desde) | ≈ 294 | ≈ 302 | Producción recomendada |
| Firebase Spark | Mensual | **0** | 0 | 0 | Functions no incluidas |
| Google Play Developer | Único | **25** | ≈ 294 | ≈ 302 | Solo si se publica en Play |
| Apple Developer Program | Anual | **99** | ≈ 1.163 | ≈ 1.196 | No recomendado para uso interno de 1 persona |
| WhatsApp service (hasta 1.000/mes) | Mensual | **0** | 0 | 0 | Por número de negocio |
| WhatsApp utility a +591 | Por mensaje | **0,0113** | ≈ 0,13 | ≈ 0,14 | Confirmar rate card oficial |
| WhatsApp marketing a +591 | Por mensaje | **0,0740** | ≈ 0,87 | ≈ 0,89 | Confirmar rate card oficial |
| IA (Gemini/Haiku a este volumen) | Mensual | **0–5** (típico < 1) | 0–59 | 0–60 | Ver sección 7 |
| VPS Hetzner (opcional) | Mensual | ≈ 6,0–6,6 | ≈ 71–77 | ≈ 73–80 | EUR 5,49–5,99 × 1,10 |
| n8n Cloud Starter (opcional) | Mensual (anualizado) | ≈ 22 | ≈ 259 | ≈ 266 | EUR 20 × 1,10 |

### 12.2 Escenario A — Mínimo presupuesto (accesible)

Objetivo: que Abel pueda ver la demo, publicar la landing y usar el panel en el celular **gastando lo menos posible**.

| Concepto | Tipo | USD | BOB oficial |
| --- | --- | --- | --- |
| GitHub Pages (demo) + Cloudflare Pages (prod) | Mensual | 0 | 0 |
| Dominio `seid.com.bo` (o el nombre libre) | Anual / único del año | ≈ 23,83 | **280** |
| PWA (sin Play Store ni App Store) | Único | 0 | 0 |
| Supabase Free o Firebase Spark | Mensual | 0 | 0 |
| Recordatorios en la app + FCM | Mensual | 0 | 0 |
| Botón WhatsApp (`wa.me`), sin Cloud API | Mensual | 0 | 0 |
| **Total único / año 1 (si solo se paga el dominio)** | | **≈ 24** | **280** |
| **Total mensual en régimen** | | **0** | **0** |
| **Total año 1** | | **≈ 24** | **280** |
| **Años siguientes** | Anual | ≈ 24 (solo dominio) | 280 |

**Qué se sacrifica:** riesgo de **pausa** del proyecto Supabase Free; no hay respaldos diarios del plan Pro; el agente de WhatsApp queda para cuando haya tarjeta y tiempo de alta en Meta (mientras tanto, Abel responde a mano). Mitigación temporal: un *cron* de “keep-alive” (no es un SLA) o pasar a Firebase / a Pro en cuanto el panel sea de uso diario.

Si se pospone el dominio y se deja solo la URL de GitHub Pages, el escenario mínimo de **demo es USD 0**.

### 12.3 Escenario B — Recomendado (producción seria, sigue siendo austero)

Objetivo: que el sistema no se caiga si Abel no entra una semana, que los PDFs y fotos estén respaldados, y que el agente de la fase 3 tenga margen de WhatsApp + IA.

| Concepto | Tipo | USD | BOB oficial (paralelo, si paga en USD) |
| --- | --- | --- | --- |
| Dominio `.com.bo` | Anual | ≈ 23,83 | **280** (pago en Bs) |
| Cloudflare Pages + (opcional) DNS/registrar | Mensual | 0 | 0 |
| **Supabase Pro** | Mensual | **25** | ≈ 294 (≈ 302) |
| WhatsApp Cloud API (capa service + ~20 utility/mes) | Mensual | **0–2** (se reserva 2) | ≈ 0–24 (0–24) |
| API de IA (Gemini pago o Haiku 5.5) | Mensual | **1–5** (se reserva 3) | ≈ 12–59 (12–60) |
| Tiendas de apps | — | **0** (se permanece en PWA) | 0 |
| **Subtotal mensual** | Mensual | **26–32** (presupuesto **30**) | ≈ **306–376** (oficial) / **314–387** (paralelo) |
| **Dominio año 1** | Anual | ≈ 24 | 280 |
| **Infraestructura anual recurrente (12 × 30)** | Anual | **360** | ≈ 4.230 (oficial) / 4.349 (paralelo) |
| **Total año 1 (recurrente + dominio)** | | **≈ 384** | **≈ 4.510 oficial** (dominio en Bs 280 + USD 360 × 11,75) o **≈ 4.629** si los USD se compran al paralelo |
| **Años siguientes** | Anual | ≈ 360 + dominio 24 = **≈ 384** | misma lógica |

**Opcionales, no incluidos en el total recomendado**

| Extra | Cuándo | USD | BOB oficial |
| --- | --- | --- | --- |
| También registrar `.com` en Cloudflare | Si se quiere el nombre internacional | 11,17/año | ≈ 131 |
| Publicar en Google Play | Si Abel pide la app en la tienda | 25 único | ≈ 294 |
| Apple Developer | Solo si se exige App Store | 99/año | ≈ 1.163 |
| VPS + n8n Community | Si se prefiere automatización visual | ≈ 6–7/mes | ≈ 71–82 |

Con un solo técnico y un volumen bajo, **USD 25/mes de Supabase Pro es, de lejos, la partida más grande**. WhatsApp e IA, bien implementados, deberían quedar cerca de cero o de unos pocos dólares.

### 12.4 Cómo se ve el gasto por fase (escenario recomendado)

| Fase | Qué paga Abel de infra | Orden de magnitud |
| --- | --- | --- |
| 1 Landing + demo GitHub Pages | Nada, o el dominio cuando apruebe el nombre | USD 0, luego Bs 280/año |
| 2 App + PDF + recordatorios | Supabase Pro al pasar a producción | + USD 25/mes |
| 3 Agente WhatsApp | Método de pago en Meta + uso de API + IA | + USD 0–5/mes típico (reservar hasta ~7) |
| 4 Calendario | Sin costo extra de infra | USD 0 |

---

## 13. Datos que conviene confirmar con Abel (no bloquean el análisis)

- Sistema de su celular (Android o iPhone) y si acepta una PWA con ícono en el inicio.  
- Disponibilidad del nombre de dominio (`seid.com.bo`, `seid.com`, etc.) y razón social / NIT para la factura de NIC.  
- Si tiene **tarjeta internacional** para Supabase, Cloudflare y Meta.  
- Número de WhatsApp Business (no hace falta publicarlo en este documento) y si usa grupos o llamadas de negocio que deban seguir en la app (la coexistencia las deja en la app).  
- Volumen aproximado: instalaciones de aires al mes, mantenimientos al mes, chats de WhatsApp al día.  
- Cómo le entregan hoy las listas de precios los proveedores (Excel, PDF, WhatsApp) para diseñar la carga.  
- Si el recordatorio debe llegarle **solo a él** (recomendado al inicio) o también al cliente.  
- Revisión de las dos plantillas originales al momento de maquetar el PDF (firmas, logos, numeración de las 10 actividades).

---

## 14. Conclusión

El proyecto SEID es **viable, acotado y barato de operar** si se respeta un orden: primero la landing demostrable, después el panel en el celular que quite el papel, después el agente de WhatsApp, y al final el calendario.

La decisión de stack que más ahorra y más rápido se le puede mostrar a Abel es: **landing estática + PWA instalable + Supabase + GitHub Pages para la demo**. El gasto mínimo realista de producción es **el dominio `.com.bo` (Bs 280 al año)**. El gasto recomendado de producción es **ese dominio más unos USD 25–33 al mes**, casi todos de Supabase Pro, sin cuotas de tiendas de aplicaciones.

El honorario de Daniel va **por encima** de estas cifras y lo define él.

---

## 15. Fuentes

Consultadas el 23 de noviembre de 2026.

**Dominios y hosting**

- NIC Bolivia: https://nic.bo/  
- BeMoreX, precios NIC consultados el 10-nov-2026: https://bemorex.com/blog/hosting-y-dominio-en-bolivia/  
- Quimera Hosting, precios NIC consultados el 6–7-nov-2026: https://quimerahosting.com/dominios/registrar-dominio-bo/  
- Namecheap, cambio de precio `.com` (1-nov-2026): https://www.namecheap.com/support/knowledgebase/article.aspx/10840/2201/com-price-change-november-1-2026  
- Cloudflare Registrar FAQ: https://developers.cloudflare.com/registrar/faq/  
- Observación de precio Cloudflare `.com` USD 11,17 (9-nov-2026): https://tld.reviews/prices/history  
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages  
- Límites de Cloudflare Pages: https://developers.cloudflare.com/pages/platform/limits/  
- Términos de Vercel: https://vercel.com/legal/terms  

**Backend, tiendas, automatización**

- Supabase Pricing: https://supabase.com/pricing  
- Firebase Pricing: https://firebase.google.com/pricing  
- Google Play Console (USD 25): https://support.google.com/googleplay/android-developer/answer/6112435?hl=en  
- Apple Developer Program (USD 99/año): https://developer.apple.com/programs/enroll/  
- Expo pricing: https://expo.dev/pricing  
- n8n pricing: https://n8n.io/pricing/  
- n8n self-host / Community: https://docs.n8n.io/hosting/  
- Hetzner Cloud: https://www.hetzner.com/cloud/  
- Make pricing: https://www.make.com/en/pricing  

**WhatsApp e IA**

- Meta, pricing WhatsApp Business Platform (reglas, capa de 1.000 service, región Rest of Latin America, Bolivia +591): https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing  
- Meta, coexistencia (Business app + Cloud API): https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users  
- Tarifas de lista Bolivia oct. 2026 (secundarias; confirmar en el rate card oficial): https://mywa.net/whatsapp-api-pricing/bolivia — https://linqa.com/pricing/whatsapp/bolivia/ — https://www.telerivet.com/product/whatsapp/country/bo — https://payperwa.com/meta-whatsapp-rates-2026-10-01.csv  
- Gemini Developer API pricing: https://aistudio.google.com/docs/pricing  
- Claude API pricing: https://platform.claude.com/docs/en/about-claude/pricing  
- OpenAI API pricing (referencia GPT-5 mini): https://developers.openai.com/api/docs/pricing  

**Tipo de cambio**

- BCB, TCO última cotización (Bs 11,75, vigencia 21–23 nov. 2026): https://www.bcb.gob.bo/bcb_tco_publico_ultima_cotizacion.php  
- Paralelo vs oficial (23-nov-2026): https://paralelobolivia.com/en/exchange-rate-history  
