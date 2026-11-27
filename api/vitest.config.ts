import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations');
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          r2Buckets: ['FOTOS_TEST'],
          bindings: {
            TEST_MIGRATIONS: migrations,
            JWT_SECRET: 'secreto-de-prueba-0123456789abcdef',
            ALLOWED_ORIGINS: 'https://danielcrackvz-stack.github.io,https://seid.com.bo',
          },
        },
      }),
    ],
    test: {
      include: ['test/*.test.ts'],
      setupFiles: ['./test/setup.ts'],
    },
  };
});
