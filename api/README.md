# SEID API

Servidor de la app de SEID: Cloudflare Workers + D1, con TypeScript y Hono.
- Sincronización offline-first: `POST /sync` y `GET /sync?since=`.
- Respaldo: `GET /export`.
- Notificaciones Web Push (aes128gcm + VAPID, sin dependencias de Node) con un Cron diario de recordatorios.

- Contrato con la app: [`../docs/app-sync-contract.md`](../docs/app-sync-contract.md)
- Cómo publicar (Windows): [`../docs/api-deploy.md`](../docs/api-deploy.md) y `scripts/deploy.ps1`

```bash
npm ci
npm test                 # pruebas en workerd (Miniflare) + pruebas cruzadas en Node
npm run typecheck
npm run db:migrate:local && npm run dev    # API local en http://localhost:8787 (requiere .dev.vars con JWT_SECRET)
```

| Carpeta | Contenido |
| --- | --- |
| `src/` | Worker. `index.ts` rutas, `sync.ts` reglas de sincronización, `reminders.ts` + `notify.ts` recordatorios, `push/webpush.ts` cifrado |
| `migrations/` | Esquema D1 |
| `scripts/` | `create-user.mjs`, `gen-vapid.mjs`, `gen-secret.mjs`, `deploy.ps1` |
| `test/` | Pruebas (Vitest + `@cloudflare/vitest-plugin`) |
