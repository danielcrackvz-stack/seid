# Panel de trabajo SEID (demostración)

Aplicación de demostración, instalable en el teléfono (PWA), para mostrarle al Ing. Abel Galarza cómo se vería el panel de administración.

**Demo en línea:** [https://danielcrackvz-stack.github.io/seid/app/](https://danielcrackvz-stack.github.io/seid/app/)

- Interfaz en español, pensada para usarse con el dedo.
- Sin servidor: los datos se guardan solo en este navegador (`localStorage`).
- Incluye datos de ejemplo claramente marcados como **DEMO**. En el menú (tres puntos) está la opción **Restablecer demo**.
- El inicio de sesión acepta cualquier nombre y contraseña (está simulado).
- Al guardar un mantenimiento, el próximo se programa solo a los 6 meses y se puede generar un PDF o un mensaje de WhatsApp.

Para probarla en local, sirva esta carpeta con cualquier servidor estático (no abra `index.html` como archivo, porque el módulo y la PWA necesitan HTTP).
