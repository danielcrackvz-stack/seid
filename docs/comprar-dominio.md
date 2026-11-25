# Cómo comprar el dominio de SEID

Fecha de esta guía: 25 de noviembre de 2026 (America/La_Paz).  
Preparado para Daniel, para resolverlo con el Ing. Abel Galarza y tener el sitio con dominio propio a más tardar el viernes.

Los precios y la disponibilidad cambian. Hay que confirmarlos en [nic.bo](https://nic.bo/) el día del pago.

## Recomendación

Comprar **`seid.com.bo`** en **NIC Bolivia**, el registro oficial, por **Bs 280 al año**.

Eso es lo que se le comentó al Ing. Galarza. Es la opción más razonable para una empresa de Santa Cruz: se paga en bolivianos, hay factura local, y el nombre se lee como un sitio boliviano. No hace falta el `.bo` corto al inicio (**Bs 980 al año**).

### Precio oficial (consultar el 25 de noviembre de 2026)

La tabla de NIC Bolivia, citadas por fuentes que la consultaron en noviembre de 2026 ([BeMoreX, 10-nov-2026](https://bemorex.com/blog/hosting-y-dominio-en-bolivia/), [Quimera Hosting, 6–7-nov-2026](https://quimerahosting.com/dominios/registrar-dominio-bo/), y un comunicado en [nic.bo/noticia.php](https://nic.bo/noticia.php)), coincide en:

| Tipo | Ejemplo | Precio anual en NIC Bolivia |
| --- | --- | --- |
| Tercer nivel (recomendado) | `seid.com.bo`, también `.org.bo`, `.net.bo`, `.web.bo` | **Bs 280** |
| Segundo nivel | `seid.bo` | **Bs 980** |
| Interés social (si aplicara) | p. ej. `.empresa.bo`, `.info.bo` | **Bs 55** |

Se puede pagar de **1 a 6 años** por adelantado. La renovación usa las mismas tarifas. El dominio **no incluye** alojamiento ni correo: el sitio puede seguir en GitHub Pages (gratis) o pasar a Cloudflare Pages (gratis).

### Disponibilidad comprobada en esta fecha

El 25 de noviembre de 2026, a las 03:33 (America/La_Paz), la consulta WHOIS de [nic.bo/whois.php](https://nic.bo/whois.php) devolvió **«Nombre de dominio no registrado»** para:

- `seid.com.bo`
- `seid.bo`
- `seid.org.bo`

Eso indica que **en ese momento estaban libres**. Un nombre se puede registrar entre esta consulta y el pago, y NIC también publica una lista de nombres no disponibles. Hay que volver a buscarlo en la cuenta de nic.bo justo antes de pagar.

### Alternativa en dólares, si más adelante se quiere un `.com`

Un `.com` en [Cloudflare Registrar](https://developers.cloudflare.com/registrar/faq/) suele salir **al costo**, alrededor de **USD 11,17 al año** en noviembre de 2026 (tarifa mayorista de Verisign más USD 0,20 de ICANN, sin recargo de Cloudflare). Exige usar los nameservers de Cloudflare y pagar con tarjeta en dólares. **`seid.com` ya está registrado** (no está disponible); si se quisiera un `.com`, habría que elegir una variante (por ejemplo `seidbolivia.com`). No es necesario para la entrega de esta semana si se confirma `seid.com.bo`.

No conviene comprar el `.bo` en un revendedor internacional: algunos lo publican a varios cientos de dólares, muy por encima del precio oficial de nic.bo.

## Dónde se compra y con quién hablar

- **Registro oficial:** [https://nic.bo](https://nic.bo/)
- **Centro de ayuda (pasos, DNS, factura, Cloudflare):** [https://ayuda.nic.bo](https://ayuda.nic.bo)
- **Consulta WHOIS (ver si un nombre está tomado):** [https://nic.bo/whois.php](https://nic.bo/whois.php)
- **Correo de soporte:** soporte@nic.bo (también figuran soporte@agetic.gob.bo y contacto@agetic.gob.bo en el sitio de AGETIC)
- **Teléfono:** (+591 2) 2184026 (La Paz)
- **Horario habitual de NIC**, según su política de delegación: lunes a viernes, 08:30–12:30 y 14:30–18:30 (America/La_Paz). El trámite es en línea; no hace falta ir a La Paz.
- Desde el 15 de enero de 2026 el `.bo` lo administra la **AGETIC** (D.S. 5519); el trámite sigue en nic.bo.

## Qué tiene que decidir Abel antes de pagar

El campo **Titular** no se puede cambiar después de activar el dominio (haría falta un trámite de transferencia de titularidad). Por eso el dominio debe quedar a nombre de la empresa o de Abel, **no a nombre de Daniel**.

Hace falta:

1. **El nombre exacto del titular.** Recomendado: la razón social **Electricidad Industrial Domiciliaria SEID SRL**. Alternativa: el nombre completo de Abel, igual a su documento de identidad, si prefieren registrarlo como persona natural.
2. **Datos de facturación:** NIT de la empresa, o CI / CE de Abel, para la factura electrónica de NIC.
3. **Un correo que Abel (o quien administre el dominio) revise de verdad.** Ahí llegan el alta de la cuenta, el código de acceso y los avisos de vencimiento.
4. **Confirmación del nombre:** `seid.com.bo`, y cuántos años pagan (1 es suficiente para empezar; 2 o 3 evitan olvidar la renovación).
5. **Medio de pago:** tarjeta de crédito o débito, o depósito / transferencia a la cuenta que muestre el sistema, con el comprobante.

Daniel puede acompañar el trámite en pantalla, pero la cuenta y el titular no deben quedar a su nombre.

## Pasos para registrar `seid.com.bo`

Los pasos oficiales están en [ayuda.nic.bo](https://ayuda.nic.bo) («¿Cómo registro mi cuenta…?» y «¿Cómo registro un nombre de dominio .bo?»). En la práctica:

1. Crear la cuenta en [https://nic.bo/registro_cuenta.php](https://nic.bo/registro_cuenta.php) con el correo acordado con Abel. El sistema envía un enlace para definir la contraseña (como mínimo 8 caracteres, con mayúscula, minúscula, número y un símbolo de los que indique el formulario). Al entrar, pide un **código de seguridad de un solo uso**, que llega al correo.
2. Completar los datos del titular y los de facturación (NIT o CI). El nombre del titular debe coincidir con el de la empresa o con el documento. Usar el NIT o el CI **solo para la factura de NIC** no hace que esos datos aparezcan en la web de SEID. En la cuenta se puede marcar los contactos del WHOIS como no públicos.
3. Ir a **Dominios → Registrar**. Escribir `seid`, elegir la extensión `.com.bo` y pulsar **Buscar**.
4. Si aparece disponible, elegir **1 a 6 años** y pulsar **Registrar**.
5. Leer y **aceptar** el Contrato de Registro de Nombres de Dominio bajo el ccTLD `.bo`. Sin esa aceptación no se completa la reserva.
6. El sistema genera una **nota de débito**, en general válida **10 días calendario**. Si no se paga en ese plazo, hay que volver a reservar. Se consulta en **Dominios → Notas de débito**.
7. Pagar, según lo que muestre el sistema:
   - **Código CPT (Banco Unión):** suele ser la vía más directa en Bolivia. La nota trae un código de trámite; se paga en la app o la web del Banco Unión (pago de trámites del Estado) o en caja, con el carné. La notificación a NIC suele ser automática y no hace falta subir comprobante.
   - **Tarjeta de crédito o débito** en la pasarela de NIC; también suele notificarse sola.
   - **Depósito o transferencia** a la cuenta que indique el documento: pagar el monto exacto y **adjuntar el comprobante** en la misma sección de notas de débito.
8. NIC verifica el pago y activa el dominio **como máximo el primer día hábil siguiente**.
9. Los **servidores DNS** se cargan en **Dominios → Administrar**. NIC Bolivia no deja cargar en su panel registros A, CNAME o TXT del sitio: hay que delegar el DNS a un proveedor externo. La opción prevista es **Cloudflare** (plan gratuito). NIC publica la guía «Cómo tener mi servidor DNS gratuito en CloudFlare» en el centro de ayuda.

No hace falta subir documentos de la sociedad para un `.com.bo`. Sí harían falta para extensiones restringidas (`.edu.bo`, `.gob.bo`, etc.), que aquí no aplican.

## Qué hacer el mismo día, para que el sitio abra con el dominio (jueves o viernes)

Mientras el sitio sigue en GitHub Pages, el camino más corto es:

1. Crear una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/) (puede ser con el correo de Abel; Daniel puede operar la zona si le dan acceso).
2. Añadir el dominio `seid.com.bo` en Cloudflare y copiar los **dos nameservers** que asigne (del tipo `algo.ns.cloudflare.com`).
3. En nic.bo, en la administración del dominio, cargar esos nameservers y guardar.
4. Esperar la propagación (a veces minutos, a veces unas horas).
5. En Cloudflare, crear los registros para GitHub Pages:
   - En el apex (`seid.com.bo`): registros **A** a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153` (direcciones publicadas por GitHub para Pages). Con el proxy de Cloudflare (nube naranja) también se puede usar un CNAME «aplanado» hacia `danielcrackvz-stack.github.io`.
   - Si se usa `www.seid.com.bo`: CNAME a `danielcrackvz-stack.github.io`.
6. En el repositorio `danielcrackvz-stack/seid`, en **Settings → Pages**, añadir el dominio personalizado `seid.com.bo` y dejar que GitHub emita el certificado. En el código habrá que añadir un archivo `CNAME` (o el equivalente que pida Pages) y actualizar canónicas, `sitemap.xml`, `robots.txt`, Open Graph y el enlace de `404.html` de `/seid/` a `/`.
7. Con el proxy de Cloudflare activo se pueden pegar las cabeceras de `docs/seguridad.md` (HSTS, `X-Content-Type-Options`, `frame-ancestors`, `Permissions-Policy`).

Más adelante, cuando convenga, el mismo dominio puede apuntar a **Cloudflare Pages** (plan gratuito) en lugar de GitHub Pages; el DNS ya estaría listo.

No hace falta comprar hosting ni correo para entregar la landing. El correo `@seid.com.bo` es un paso posterior (por ejemplo Zoho, que NIC menciona en su ayuda, u otro proveedor). No es requisito de esta semana.

## Qué no hace falta pagar ahora

- Hosting de la landing: GitHub Pages o Cloudflare Pages, gratis.
- El `.bo` corto (Bs 980), salvo que Abel lo pida expresamente.
- Un revendedor que cobre de más por el mismo `.com.bo`.
- Certificado HTTPS: lo emite GitHub Pages o Cloudflare, sin costo.

## Si algo falla

- Soporte de NIC: soporte@nic.bo / (+591 2) 2184026 / [ayuda.nic.bo](https://ayuda.nic.bo).
- Si `seid.com.bo` ya no está libre al momento de pagar: buscar una variante acordada con Abel (por ejemplo `seid-srl.com.bo` o el `.bo` corto) y repetir la búsqueda en nic.bo antes de pagar.
