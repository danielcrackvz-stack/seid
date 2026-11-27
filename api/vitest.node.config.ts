import { defineConfig } from 'vitest/config';
// Pruebas cruzadas en Node: compara nuestro cifrado/hash con librerías de referencia.
export default defineConfig({ test: { include: ['test/node/*.test.ts'], environment: 'node' } });
