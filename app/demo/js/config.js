/* Configuración pública de la app SEID. */
export const APP_VERSION = '2.0.1';
export const WHATSAPP_NUMBER = '59173643342';
export const TECNICO_NOMBRE = 'Ing. Abel Galarza';

/**
 * URL del servidor de sincronización (Cloudflare Workers).
 * Vacío = la app funciona solo en este teléfono (sin nube).
 * Ejemplo cuando exista el backend: 'https://api.seid.com.bo'
 * Si se activa, agregue ese origen a connect-src en la CSP de index.html.
 */
export const API_BASE_URL = '';
