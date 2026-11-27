declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    JWT_SECRET: string;
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
    [key: string]: unknown;
  }
}
