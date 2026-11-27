# Guía paso a paso: compra de dominio, conexión a GitHub Pages y aparición en Google para SEID

**Proyecto:** Electricidad Industrial Domiciliaria SEID SRL (Ing. Abel Galarza — Santa Cruz / Warnes, Bolivia)  
**Fecha de verificación de datos:** 25 de noviembre de 2026

Esta guía está pensada para alguien que **nunca compró ni configuró un dominio**. Todo está explicado en orden, con costos reales verificados, qué datos te pedirán y qué pasos dependen de ti, de Abel o de aspectos técnicos.

---

## 1. Verificación del precio que le comentaste a Abel (Bs 280/año)

**Sí, el dato de Bs 280 anuales es correcto y oficial.**  
En Bolivia, un dominio comercial **`.com.bo`** (de tercer nivel) cuesta exactamente **Bs 280 por año** en **NIC Bolivia** (`nic.bo`). Ese mismo monto aplica tanto para el registro inicial como para cada renovación anual.

> **Dato importante de contexto (2026):** Desde el **15 de enero de 2026**, el registro de dominios `.bo` pasó de ADSIB a **AGETIC** (Decreto Supremo 5519). El portal oficial para comprar y administrar el dominio sigue siendo **`https://nic.bo/`**, aunque en algunos PDFs y pantallas todavía veas el nombre «ADSIB».

---

## 2. Opción A: Comprar `.com.bo` o `.bo` en NIC Bolivia (`nic.bo`)

### 2.1 Tarifas oficiales anuales (NIC Bolivia)

Según la tabla oficial publicada en [`https://nic.bo/`](https://nic.bo/):

| Categoría | Extensiones | Precio anual | Quién puede registrarlo |
| --- | --- | --- | --- |
| **Tercer nivel (comercial)** | `.com.bo`, `.org.bo`, `.net.bo`, `.tv.bo`, `.web.bo` | **Bs 280 / año** | Cualquier persona natural mayor de edad o empresa (nacional o extranjera) |
| **Segundo nivel** | `.bo` (ej. `seid.bo`) | **Bs 980 / año** | Cualquier persona natural mayor de edad o empresa |
| **Interés social** | `.empresa.bo`, `.industria.bo`, `.tecnologia.bo`, `.info.bo`, `.ia.bo` y más de 25 otras | **Bs 55 / año** | Cualquier persona natural mayor de edad o empresa |
| **Educativo** | `.edu.bo` | **Bs 280 / año** | Solo universidades/entidades educativas con documentación |
| **Restringido** | `.gob.bo`, `.int.bo`, `.mil.bo` | **Bs 500 / año** | Solo entidades estatales/militares/internacionales con documentación |

* Se puede pagar por adelantado desde **1 año hasta 6 años** (por ejemplo, 1 año de `.com.bo` = Bs 280; 2 años = Bs 560).
* El dominio **no incluye hosting ni correo electrónico**: solo es el nombre. En el caso de SEID no necesitas pagar hosting porque la web ya está alojada gratis en GitHub Pages.

### 2.2 Requisitos para `.com.bo`

De acuerdo con las [Políticas de Delegación de NIC Bolivia (`ADSIB-DOM-POLT-001`)](https://nic.bo/documentos/ADSIB-DOM-POLT-001_2025.pdf) y el [Centro de Ayuda `ayuda.nic.bo`](https://ayuda.nic.bo/):

* **No te piden subir documentos legales ni constitución de la SRL** para registrar un `.com.bo` (los documentos adjuntos solo se exigen para `.edu.bo`, `.gob.bo`, `.mil.bo` e `.int.bo`).
* **Titular del dominio (¡muy importante!):**
  * Si se registra a nombre de la empresa, en el campo *Titular* debes escribir la razón social exacta: **`Electricidad Industrial Domiciliaria SEID SRL`**.
  * Si se registra a nombre de una persona natural, el nombre completo tal como figura en su Carnet de Identidad.
  * **Advertencia:** Una vez que el dominio se activa, el campo **Titular es inmutable** (no se puede editar desde el panel; cambiarlo requiere un trámite de transferencia de titularidad). Revísalo dos veces antes de confirmar.
* **Datos de facturación (NIT o CI):**
  * NIC Bolivia emite **factura electrónica** vinculada a un **NIT** (si facturan a nombre de SEID SRL), **Carnet de Identidad (CI)** o **Carnet de Extranjero (CE)**.
  * *Tranquilidad sobre la web pública:* Que uses el NIT de la SRL (o el CI) para comprar el dominio y recibir la factura **no** hace que aparezca en la página web de SEID. Además, desde tu cuenta en `nic.bo` puedes configurar los datos de contacto del WHOIS como **no públicos** para proteger la privacidad.
* **Cuenta de usuario:** Correo electrónico real y activo (ahí llegan los códigos de acceso, la factura y los avisos de vencimiento), teléfono/celular y dirección.

### 2.3 Paso a paso para registrar en `nic.bo`

1. **Crea tu cuenta en NIC Bolivia:**
   * Entra a [`https://nic.bo/registro_cuenta.php`](https://nic.bo/registro_cuenta.php).
   * Completa el formulario: Organización (opcional), Nombres, Apellidos, Correo electrónico, País (`Bolivia`), Departamento (`Santa Cruz`), Ciudad (`Santa Cruz de la Sierra` o `Warnes`), Celular/Teléfono, Dirección y el código de la imagen (captcha), y haz clic en **Crear usuario**.
   * Abre el correo que te llegará (revisa también *Spam/Correo no deseado*) y haz clic en **Establecer contraseña**. La contraseña debe tener al menos **8 caracteres**, una minúscula, una mayúscula, un número y un símbolo entre `.%()=&+-#$@`.
2. **Inicia sesión:**
   * Ingresa en [`https://nic.bo/`](https://nic.bo/) con tu correo y contraseña. Cada vez que entres, el sistema enviará un **Código de Seguridad de un solo uso** a tu correo para confirmar el acceso.
3. **Busca y reserva el dominio:**
   * En el menú ve a **`[Dominios] → [Registrar]`**.
   * Escribe el nombre (por ejemplo `seid`), selecciona **`.com.bo`** y haz clic en **Buscar**.
   * Marca el dominio libre, elige la cantidad de años (**1 a 6 años**) y haz clic en **Registrar**.
4. **Acepta el contrato y registra al Titular:**
   * Lee y acepta el *Contrato de Registro de Nombres de Dominio bajo el ccTLD .bo*.
   * Completa el *Formulario de Registro del Titular del Dominio* (razón social de la SRL o nombre completo) y confirma los contactos (Administrativo, Técnico y Financiero se llenan por defecto con los datos de tu cuenta; después puedes cambiarlos en `[Dominios] → [Administrar]`).
5. **Completa la facturación:**
   * Ingresa los datos para la factura (Razón social + NIT de SEID SRL, o nombre + CI).
   * Selecciona **Bolivia** como país desde donde pagarás para que aparezcan los métodos de pago nacionales.
6. **Paga la Nota de Débito:**
   * Al finalizar, el sistema genera una **Nota de Débito** válida por **10 días calendario** (si pasan 10 días sin pagar, la reserva se cancela). Puedes volver a verla en **`[Dominios] → [Notas de Débito]`**.
   * Métodos de pago documentados por NIC Bolivia ([guía oficial de registro](https://ayuda.nic.bo/contenido.php?codigo=sV62BR7ZvVCNnkidawLbSLhDfP9Z7y33QAtlJFuEW4IRpy%2F%2F8pTFbzTZU0Wg2IUKbQYljZVfWynD%2FnLogLR3O+KwHSOPdlF4d+zQT2wmXJacvJfl1yyIrlkzpmbV69Xg) y [comunicado CPT](https://nic.bo/noticia.php)):
     * **Código de Pago de Trámite (CPT) — Banco Unión S.A. (la forma más práctica en Bolivia):** La Nota de Débito incluye un código **CPT de 12 dígitos**. Puedes pagarlo desde la app o web del Banco Unión (**UNIMóvil / UNINet** → *Pago de Trámites → Pago de Trámites del Estado*) o en **cajas del Banco Unión** presentando tu Carnet de Identidad e indicando el código CPT. El sistema notifica el pago automáticamente a NIC Bolivia y **no necesitas subir comprobante**.
     * **Tarjeta de crédito o débito (pasarela en línea):** Si eliges pagar con tarjeta en la plataforma, la notificación también es automática y no requiere subir comprobante.
     * **Otras formas de pago (depósito / transferencia bancaria):** Al elegir otra modalidad distinta a tarjeta/CPT, se genera un documento imprimible con los datos de la cuenta bancaria del administrador. Paga el **monto exacto** (Bs 280), toma foto o escanea el comprobante y súbelo en **`[Dominios] → [Notas de Débito] → Adjuntar`**.
7. **Espera la activación:**
   * Según la normativa oficial, el dominio se activa como máximo **dentro del primer día hábil** posterior a la verificación del pago por parte del administrador (con CPT o tarjeta la confirmación al sistema es automática; con depósito/transferencia depende de que validen el comprobante).

### 2.4 Contacto oficial de NIC Bolivia / AGETIC

Datos tomados exclusivamente de [`https://nic.bo/`](https://nic.bo/), la [Política de Delegación](https://nic.bo/documentos/ADSIB-DOM-POLT-001_2025.pdf) y el [portal oficial de AGETIC (`agetic.gob.bo/node/13890`)](https://agetic.gob.bo/node/13890):

* **Portal y panel:** [`https://nic.bo/`](https://nic.bo/)
* **Centro de ayuda:** [`https://ayuda.nic.bo/`](https://ayuda.nic.bo/)
* **Teléfono:** `(+591 2) 2184026`
* **WhatsApp de Soporte Técnico (AGETIC — solo mensajes de texto):** `+591 63195237` (*Soporte Técnico Otras Plataformas*; nota: el número `63124081` que figura en AGETIC es únicamente para Ciudadanía Digital)
* **Correos electrónicos:** `soporte@nic.bo` (en `nic.bo`) / `soporte@agetic.gob.bo` y `contacto@agetic.gob.bo` (en `agetic.gob.bo`)
* **Dirección física (La Paz):** Calle Pedro Salazar N° 631, esquina Andrés Muñoz, Edificio FNDR (pisos 3, 4 y 5), Zona Sopocachi, La Paz, Bolivia *(todo el trámite se hace en línea desde Santa Cruz; no hace falta ir presencialmente)*.
* **Horario de atención:** Lunes a viernes de **08:30 a 12:30 y de 14:30 a 18:30 (hora de Bolivia, UTC-4)** según la Política de Delegación de `nic.bo` (en trámites de AGETIC también se usa jornada continua de 08:30 a 16:30, así que conviene escribir o llamar dentro de 08:30–16:30).

---

## 3. Opción B: Comprar `.com` en Cloudflare Registrar

[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) vende dominios **al costo mayorista** (exactamente lo que cobran el registro e ICANN, sin margen de ganancia ni subidas sorpresa en la renovación).

* **Precio actual verificado de `.com`:** **$11.17 USD / año** tanto para registro como para renovación y transferencia.  
  *(Desde el **1 de noviembre de 2026**, Verisign subió la tarifa mayorista de `.com` a $10.97 USD, más $0.20 USD de tarifa ICANN = **$11.17 USD**; antes costaba $10.46 USD. Fuente: [ICANN .COM Fee Schedule Nov 2026](https://itp.cdn.icann.org/en/files/registry-agreements/com/com-fees-01-11-2026-en.pdf) y [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)).*
* **Qué incluye:** Privacidad WHOIS gratis, DNS, SSL y DNSSEC en un solo lugar.
* **Limitaciones y requisitos importantes:**
  * Requiere **tarjeta de crédito o débito habilitada para pagos internacionales en dólares (USD)** (en Bolivia hay que verificar el límite y comisiones en USD de tu banco).
  * Obliga a usar los servidores DNS de Cloudflare ([FAQ oficial de Cloudflare Registrar](https://developers.cloudflare.com/registrar/faq/)) — lo cual para nuestro proyecto está perfecto, porque igual usaremos Cloudflare DNS.
  * El nombre corto `seid.com` **ya está ocupado** desde 1996, así que habría que usar una variante como `seidbolivia.com`.

### Comparación rápida: `.com.bo` vs `.com` para SEID

| Criterio | `.com.bo` (NIC Bolivia) | `.com` (Cloudflare Registrar) |
| --- | --- | --- |
| **Precio anual** | **Bs 280** (fijo en bolivianos) | **$11.17 USD** (depende de tipo de cambio/comisiones de tarjeta) |
| **Forma de pago** | Local en Bs (CPT Banco Unión, transferencia, tarjeta) | Tarjeta internacional en USD |
| **Nombre exacto `seid`** | **`seid.com.bo` está libre** | `seid.com` ocupado (habría que usar `seidbolivia.com`) |
| **Confianza en Bolivia** | Muy alta para clientes locales (identifica empresa boliviana) | Internacional / genérica |
| **Administración DNS** | Se delega gratis a Cloudflare en 5 minutos | Ya viene directo en Cloudflare |

---

## 4. Disponibilidad actual y recomendación

### 4.1 Disponibilidad verificada el 25 de noviembre de 2026

Consultada directamente en el buscador de [`https://nic.bo/dominio_buscar.php`](https://nic.bo/) y mediante RDAP de Verisign (`rdap.verisign.com`) para `.com`:

| Dominio candidato | Estado al 25-nov-2026 | Precio anual |
| --- | --- | --- |
| **`seid.com.bo`** | **Libre** | **Bs 280** |
| `seidsrl.com.bo` | **Libre** | Bs 280 |
| `seidbolivia.com.bo` | **Libre** | Bs 280 |
| `seid.bo` | **Libre** | Bs 980 |
| `seid.com` | **Ocupado** (registrado desde 1996) | — |
| `seidbolivia.com` | **Libre** (sin registro en RDAP) | $11.17 USD (Cloudflare) |
| `seidsantacruz.com` | **Libre** (sin registro en RDAP) | $11.17 USD (Cloudflare) |
| `seidsrl.com` | **Libre** (sin registro en RDAP) | $11.17 USD (Cloudflare) |

> **Nota:** La disponibilidad puede cambiar en cualquier momento si otra persona registra el nombre antes de que completen el pago.

### 4.2 Recomendación

* **Opción recomendada #1:** Comprar **`seid.com.bo`** en **NIC Bolivia (Bs 280/año)**.
  * **Por qué:** Es corto, profesional, lleva el nombre exacto de la empresa, está disponible, Abel ya aprobó el precio de Bs 280, se paga en bolivianos (CPT del Banco Unión o transferencia) y genera más confianza en clientes de Santa Cruz y toda Bolivia.
  * **Sobre los documentos:** No hace falta subir papeles de la SRL; solo necesitas decidir si la factura electrónica sale con el NIT de la SRL o con el CI de quien pague, y definir quién será el Titular.
* **Opción alternativa #2:** Si prefieren no usar NIC Bolivia o quieren el costo en dólares por tarjeta internacional, elegir **`seidbolivia.com`** en **Cloudflare Registrar ($11.17 USD/año)**.

*(Nota sobre correo corporativo: **No necesitan comprar correo empresarial**, porque se definió que el sitio no mostrará correo electrónico y todo el contacto va directo a WhatsApp `+591 73643342`. Si algún día lo quisieran, se puede agregar después sin cambiar de dominio).*

---

## 5. Después de comprar: cómo conectar el dominio a GitHub Pages

El repositorio actual es **`danielcrackvz-stack/seid`** y publica automáticamente la carpeta `landing/` mediante **GitHub Actions** (`.github/workflows/pages.yml`).

### ¿NIC Bolivia permite usar DNS externos como Cloudflare?

**Sí.** De hecho, NIC Bolivia **no** permite crear registros `A`, `AAAA`, `CNAME` ni `TXT` dentro de `nic.bo`; exige que delegues tu dominio a un servidor DNS externo gratuito como **Cloudflare** ([guía oficial de `ayuda.nic.bo` para Cloudflare](https://ayuda.nic.bo/contenido.php?codigo=+I1AZGCbxl2yr8Esh+MmmpojDL6y1%2FFZYUP7f%2FLTE0Q7%2FMgIM6IPeczvVRi2tz%2FLMPCg3ibCOSu7Md5u5IK5+7nzXMpc+RLAWsqiMocrAsREU02Osj%2FclSFbv2m9v0v4)).

### Paso 1: Agregar el dominio a Cloudflare (Plan Gratis)

1. Crea una cuenta gratuita en [`https://dash.cloudflare.com/`](https://dash.cloudflare.com/) (o inicia sesión).
2. Haz clic en **Add a site / Añadir sitio**, escribe **`seid.com.bo`** y elige el **Plan Free ($0)**.
3. Cloudflare te mostrará **2 nameservers** (servidores de nombres), con un formato parecido a:
   * `algo.ns.cloudflare.com`
   * `otro.ns.cloudflare.com`
   *(Copia los dos exactamente como te aparezcan en tu pantalla).*

### Paso 2: Cambiar los nameservers en NIC Bolivia

1. Entra a [`https://nic.bo/`](https://nic.bo/) (con tu correo, contraseña y el código de un solo uso).
2. Ve a **`[Dominios] → [Administrar] → Administración de DNS`** ([guía oficial](https://ayuda.nic.bo/contenido.php?codigo=ch06AbIZhkt4FHyRUwL8vE79qIxUJa0KXJu/crQquzXO5Pk9yk2E3ji7i7+hff6HUN8Z3nd/DJxHcUE3sJ8foalo142dQaTOeHniNHhE4M7k8Tc4Ba0WhvzCt0FXrGUa)).
3. Haz clic en **Introducir Nuevo DNS** e ingresa el primer nameserver de Cloudflare (el campo IP queda vacío porque no termina en `.bo`). Repite para el segundo nameserver.
4. Haz clic en **Registrar Cambios**.
   * *Tiempo:* NIC Bolivia tarda ~20 minutos en aplicar el cambio, aunque la propagación en Internet puede tomar algunas horas (hasta 24 h).

### Paso 3: Configurar el dominio personalizado en GitHub

Según la [documentación oficial de GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), primero se agrega el dominio en GitHub antes de apuntar los registros DNS para evitar que otro usuario reclame el dominio:

1. Entra a GitHub en `danielcrackvz-stack/seid` → **Settings → Pages**.
2. En **Custom domain**, escribe **`seid.com.bo`** y haz clic en **Save**.
   * *Nota:* Como el sitio despliega mediante GitHub Actions, GitHub indica que **no se creará un archivo `CNAME`** en el repositorio (y no hace falta crearlo manualmente).
   * *(Recomendado por seguridad en GitHub)*: También puedes verificar tu dominio en tu cuenta de GitHub (*Settings → Pages* de tu perfil) con un registro `TXT` para bloquear cualquier intento de uso en otro repositorio.

### Paso 4: Crear los registros DNS en Cloudflare para GitHub Pages

En Cloudflare, entra a tu dominio `seid.com.bo` → **DNS → Records** (borra cualquier registro `A` o `CNAME` viejo si hubiera alguno) y agrega exactamente estos registros (IPs oficiales vigentes de la [documentación de GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)):

| Tipo | Nombre | Contenido / Destino | Estado de Proxy (Nube) |
| --- | --- | --- | --- |
| `A` | `@` | `185.199.108.153` | **DNS only** (nube gris) |
| `A` | `@` | `185.199.109.153` | **DNS only** (nube gris) |
| `A` | `@` | `185.199.110.153` | **DNS only** (nube gris) |
| `A` | `@` | `185.199.111.153` | **DNS only** (nube gris) |
| `AAAA` | `@` | `2606:50c0:8000::153` | **DNS only** (nube gris) |
| `AAAA` | `@` | `2606:50c0:8001::153` | **DNS only** (nube gris) |
| `AAAA` | `@` | `2606:50c0:8002::153` | **DNS only** (nube gris) |
| `AAAA` | `@` | `2606:50c0:8003::153` | **DNS only** (nube gris) |
| `CNAME` | `www` | `danielcrackvz-stack.github.io` | **DNS only** (nube gris) |

> **Importante:**
> * En el `CNAME` de `www`, pon **`danielcrackvz-stack.github.io`** (sin `/seid`). GitHub redirigirá automáticamente `www.seid.com.bo` hacia `seid.com.bo`.
> * Deja la **nube gris (DNS only)** para que GitHub Pages valide el DNS sin bloqueos y emita el certificado SSL automático.
> * **No** crees un registro comodín `*.seid.com.bo` (GitHub advierte contra ello por riesgo de secuestro de subdominios).

### Paso 5: Activar HTTPS y actualizar URLs del código

1. Regresa a GitHub **Settings → Pages**. Cuando termine la comprobación DNS (desde unos minutos hasta 24 h), marca la casilla **Enforce HTTPS**.
2. Una vez activo `https://seid.com.bo/`, hay que actualizar en el código del repositorio (`landing/sitemap.xml`, `landing/robots.txt` y las metaetiquetas `canonical` / `og:url` / `og:image` de `landing/index.html`) la URL antigua (`https://danielcrackvz-stack.github.io/seid/`) por **`https://seid.com.bo/`** y hacer `push` a `main`.

---

## 6. Cómo aparecer en Google (Search Console y Google Maps)

### Expectativas reales y costos (¡todo es gratis!)

* **La indexación NO es instantánea:** Comprar el dominio y subir la web no hace que salga en Google en 5 minutos. Google primero descubre el dominio, rastrea la página y luego decide indexarla. Incluso enviando todo correctamente, suele tomar **desde unos días hasta 1 o 2 semanas (o algo más)** empezar a aparecer en búsquedas, y ganar posiciones frente a competidores toma semanas/meses según el contenido y las reseñas.
* **No necesitas pagar nada:** Tanto **Google Search Console** como **Google Business Profile (Perfil de Negocio en Google / Google Maps)** son **100 % gratuitos** ([guía oficial](https://support.google.com/business/answer/6337413?hl=es)). No hace falta pagar anuncios para aparecer en Google.
* *(Sobre Google Ads)*: **Google Ads** es una plataforma **opcional y de pago** (por clic) por si algún día Abel quisiera invertir presupuesto en salir en los primeros espacios patrocinados de inmediato, pero **no es necesaria** para que la web y el negocio aparezcan de forma orgánica y gratuita en Google y Google Maps.

### 6.1 Google Search Console (para aparecer en búsquedas de Google)

Cuando ya tengas el dominio conectado y funcionando con HTTPS (`https://seid.com.bo/`):

1. Entra a [`https://search.google.com/search-console`](https://search.google.com/search-console) con una cuenta de Google.
2. Haz clic en **Agregar propiedad** y elige el cuadro de la izquierda: **Dominio** (cubre `seid.com.bo`, `www.seid.com.bo`, `http` y `https` a la vez; [documentación oficial](https://support.google.com/webmasters/answer/34592?hl=es)). Escribe **`seid.com.bo`** y continúa.
3. **Verificación por registro DNS TXT en Cloudflare** ([guía oficial](https://support.google.com/webmasters/answer/9008080?hl=es)):
   * Search Console te mostrará un código tipo `google-site-verification=XXXXXXXX...`.
   * Ve a **Cloudflare → DNS → Records → Add record**:
     * **Type:** `TXT`
     * **Name:** `@`
     * **Content:** pega exactamente el texto completo que te dio Google.
   * Guarda el registro (**no lo borres después**, debe permanecer en Cloudflare).
   * Vuelve a Search Console y haz clic en **Verificar**. *(Si recién creaste el registro, puede fallar al segundo 1; espera unos minutos o hasta un par de horas y vuelve a pulsar Verificar).*
4. **Enviar el `sitemap.xml`** ([guía oficial](https://support.google.com/webmasters/answer/7451001?hl=es)):
   * El sitio ya incluye un archivo `/sitemap.xml` (recuerda haberlo actualizado a `https://seid.com.bo/sitemap.xml`).
   * En el menú izquierdo de Search Console, entra a **Sitemaps**, escribe `sitemap.xml` en el recuadro y pulsa **Enviar**.
5. **Solicitar indexación de la página principal** ([guía oficial](https://support.google.com/webmasters/answer/9012289?hl=es)):
   * Arriba, en la barra *Inspeccionar cualquier URL*, pega `https://seid.com.bo/` y presiona Enter.
   * Haz clic en **Solicitar indexación**.
   * **Plazo realista:** Google indica que tras solicitar indexación o enviar el sitemap, el rastreo e indexación suelen demorar **desde unos días (1 semana aprox.) hasta un par de semanas** ([por qué falta una página en Google](https://support.google.com/webmasters/answer/7474347?hl=es)).

### 6.2 Google Business Profile (Google Maps y búsquedas locales — gratis)

Para que cuando alguien en Santa Cruz o Warnes busque *"electricista"* o *"mantenimiento de aire acondicionado"* aparezca la ficha de SEID en Google Maps y en el buscador:

1. Entra a [`https://business.google.com/`](https://business.google.com/) con la cuenta de Google de Abel (o una cuenta compartida para el negocio) y crea el perfil.
2. **Nombre del negocio:** Escribe el nombre real con el que atiende (ej. `Electricidad Industrial Domiciliaria SEID SRL` o `SEID SRL`, sin rellenar el nombre con palabras extra artificiales).
3. **Categorías** ([guía de categorías](https://support.google.com/business/answer/7249669?hl=es)):
   * **Categoría principal:** **`Electricista`** (la actividad principal del negocio).
   * **Categoría adicional:** **`Servicio de aire acondicionado`** (o la equivalente exacta de instalación/reparación de aire acondicionado que sugiera el buscador de Google).
   * Los demás trabajos (plomería, gas, tableros trifásicos) agrégalos en la sección **Servicios** dentro del perfil, sin inflar las categorías innecesariamente.
4. **Configurar como negocio de área de servicio SIN mostrar dirección pública** ([guía oficial de dirección](https://support.google.com/business/answer/2853879?hl=es) y [áreas de servicio](https://support.google.com/business/answer/9157481?hl=es)):
   * Durante el alta, cuando Google pregunte si los clientes visitan el local físico, responde **No** (SEID trabaja a domicilio / en obra).
   * Define las **Áreas de servicio** (puedes agregar hasta **20 zonas**, por ejemplo: *Santa Cruz de la Sierra*, *Warnes*, *Montero*, *Cotoca*, *La Guardia*, *Porongo*).
   * **Ojo con la verificación:** Google **sí te pedirá una dirección física real** (la casa, taller u oficina base de Abel; nunca casilla postal) para validar que la empresa existe en esa ciudad, pero **no tienes que mostrarla al público**.
   * **Cómo ocultar la dirección:** Al configurar o luego en **Editar perfil → Ubicación → Ubicación de la empresa → Editar**, **desactiva** la casilla **«Mostrar dirección de la empresa a los clientes»** y guarda. Con eso la ficha mostrará únicamente las zonas donde trabaja y **nunca la dirección privada**.
5. **Teléfono, web y WhatsApp:**
   * **Teléfono:** `+591 73643342`.
   * **Sitio web:** `https://seid.com.bo/`.
   * **WhatsApp en el perfil** ([guía oficial de chat](https://support.google.com/business/answer/15013580?hl=es)): Una vez que el perfil esté verificado, ve a **Editar perfil → Contacto → Chat**, elige **WhatsApp** e ingresa `https://wa.me/59173643342` *(esta función depende de la disponibilidad regional de Google; si aparece habilitada en tu panel para Bolivia, queda activa gratis)*.
6. **Fotos y horarios:** Sube fotos reales y nítidas de los trabajos de Abel (aires acondicionados, tableros eléctricos, herramientas, uniforme/logo) y sus horarios reales de atención.
7. **Verificación y tiempos reales** ([métodos de verificación](https://support.google.com/business/answer/7107242?hl=es) y [verificación por video](https://support.google.com/business/answer/14271705?hl=es)):
   * Google asigna automáticamente los métodos de verificación disponibles para el perfil (hoy lo más habitual es **grabación de video en vivo desde el celular** —mínimo 30 segundos, continuo y sin editar, mostrando señalización/calles del entorno cercano, herramientas o equipos reales de trabajo y algún comprobante/documento con el nombre del negocio—, aunque también puede ofrecer llamada/SMS, correo o tarjeta postal).
   * Tras enviar el video de verificación, la revisión de Google tarda **hasta 5 días hábiles**.
   * Después de verificar, las ediciones normales del perfil suelen mostrarse en unos **10 minutos** (hasta **48 horas** para cambios de áreas de servicio, o hasta **30 días** si alguna edición pasa a revisión).

---

## 7. Checklist rápido para entregar el jueves / viernes

1. **Hoy / mañana (Daniel + Abel):** Confirmar el nombre elegido (**`seid.com.bo`** recomendado), quién figura como Titular y si la factura va con el NIT de SEID SRL o con CI.
2. **Compra en `nic.bo` (15–20 min):** Crear cuenta, registrar `seid.com.bo`, generar Nota de Débito y pagar los **Bs 280** por CPT (Banco Unión) o transferencia/tarjeta.
3. **Activación (máx. 1 día hábil):** Esperar el correo de activación de NIC Bolivia.
4. **Conectar a Cloudflare + GitHub Pages (20 min + propagación):** Agregar `seid.com.bo` en Cloudflare (gratis), poner los 2 nameservers en `nic.bo`, configurar Custom Domain en GitHub, cargar los registros `A`, `AAAA` y `CNAME` en Cloudflare y activar **Enforce HTTPS**.
5. **Actualizar URLs en el repo y activar Google (15–20 min):** Actualizar `sitemap.xml`, `robots.txt` y metadatos a `https://seid.com.bo/`, verificar en Google Search Console, enviar `sitemap.xml` y crear la ficha gratuita en Google Business Profile ocultando la dirección.

## URL canónica del sitio (cuando el dominio esté activo)

La URL pública del sitio (la que aparece en Google, en las tarjetas de WhatsApp y en el mapa del sitio) está centralizada en un solo archivo:

`landing/site-origin.txt`

Hoy contiene:

```
https://danielcrackvz-stack.github.io/seid
```

Cuando `seid.com.bo` esté apuntando al sitio (o el dominio que finalmente compren), basta con dejar en ese archivo una sola línea, **sin barra final**:

```
https://seid.com.bo
```

El script `scripts/assemble-site.sh` —que ya usa el flujo de GitHub Actions— reemplaza el marcador `__SITE_ORIGIN__` en HTML, `robots.txt` y `sitemap.xml` al armar `_site`. Los enlaces internos (CSS, fotos, términos, privacidad) son relativos, así que no hay que retocarlos al cambiar de dominio.

Después de cambiar el archivo, se hace commit, se publica `main` y se espera a que termine el flujo de Pages. En Search Console convendrá verificar la propiedad del dominio nuevo y enviar de nuevo el mapa del sitio.
