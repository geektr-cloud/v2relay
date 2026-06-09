# CLAUDE.md

This file guides Claude Code (claude.ai/code) when working with code in repo.

## Project

`v2relay` = single Cloudflare Worker. Vue 3 SPA (`dist/` via `ASSETS` binding) + Hono JSON API at `/api/*`. D1 (SQLite) via Prisma. Manages V2Ray/Clash subscription **Providers** → **Subscriptions** → **Nodes**, plus **Tags**, **Rulesets**, **Routes**, **AppConfigs**, **StaticFiles**, **SystemNotices**. Proxies subscription raw content with edge caching (KV).

Prod: `v2relay.geektr.cloud`. UI in zh-CN.

### Auth gate

All `/api/*` (except `/api/auth/*`) sits behind a signed-cookie middleware (`server/middlewares/auth.ts`). Credentials: `root` + `env.API_TOKEN`. Login at `POST /api/auth/login` sets an HttpOnly signed cookie HMAC'd with `env.API_TOKEN`. Frontend `rpc()` intercepts 401 → redirects to `/login` with a `next=` query.

### Public (no-auth) endpoints

Live at the worker root, **before** the SPA catch-all:

- `GET /sub/:apiToken` — render the AppConfig (clash YAML for now) for direct subscription URLs.
- `GET /files/<name-or-id>` — cached body of a `StaticFile`. Names may include `/`; the route is a wildcard, not a single-segment `:idOrName`.
- `GET /files/<name-or-id>/sha256` — sha256 hex stored in KV metadata; lets pollers cheaply skip body fetches when nothing changed.

## Commands

Package manager **pnpm**. Node `^20.19` or `>=22.12`.

- `pnpm dev` — Vite dev server with `@cloudflare/vite-plugin` (Workers runtime + D1 local)
- `pnpm build` — `vue-tsc --build` type-check + `vite build` in parallel
- `pnpm preview` — build, then `wrangler dev` against built bundle
- `pnpm deploy` — build + `wrangler deploy`
- `pnpm lint` — `eslint --fix` then `prettier --write` over `./src` and `./server`
- `pnpm type-check` — `vue-tsc --build` only
- `pnpm cf-typegen` — regen `worker-configuration.d.ts` from `wrangler.jsonc` bindings

**No test runner**; `test.sh` is an unrelated curl one-liner.

### Database / Prisma

- Edit `prisma/schema.prisma`; regen via `prisma generate` (outputs to `server/generated/prisma/` — never hand-edit).
- Apply migration to **local** D1: `wrangler d1 execute v2relay --local --file=prisma/migrations/<file>.sql`
- Apply to **remote** before deploy: same command with `--remote`.
- Ad-hoc SQL local: `wrangler d1 execute v2relay --local --command "<SQL>"`
- See `init.sh` for dump/reset recipe (mostly commented — uncomment selectively).

**Writing a migration (prisma 7.x — `migrate diff` flags changed):**

- `migrate diff` is the only prisma migrate command used here; there is **no** `migration_lock.toml` and migrations are **hand-numbered**, not prisma-managed state. So `--from-migrations <dir>` fails ("Could not determine the connector…") — you cannot auto-diff the live DB against the schema. Write incremental migrations **by hand**.
- Flag renames in prisma 7: `--to-schema-datamodel` → **`--to-schema`**, `--from-schema-datamodel` → **`--from-schema`** (old names error out).
- Trick to get the exact column DDL Prisma would emit (correct type + default, e.g. `Boolean` → `"x" BOOLEAN NOT NULL DEFAULT false`, `Json` → `JSONB`):
  ```sh
  # renders the FULL schema as CREATE TABLEs — copy just the one new column line into an ALTER
  prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script | grep -A30 'CREATE TABLE "<Model>"'
  ```
  Then hand-write `prisma/migrations/000X_name.sql` as `ALTER TABLE "<Model>" ADD COLUMN "<col>" <DDL>;`.
- `--from-empty --to-schema … > file.sql` regenerates the **entire** schema, not a delta — only useful for a fresh DB or the DDL-preview trick above, never as an incremental migration.

After any prisma schema change, also reconcile every `server/core/<entity>/schema.ts` — the `assert<Equals<...>>` in each will fail if the zod base schema drifts from the regenerated Prisma DTO.

**Schema-change workflow (do in this order to avoid type-check thrash):**

1. Edit `prisma/schema.prisma`.
2. `pnpm prisma generate` — refreshes `server/generated/prisma/dto.ts` AND the runtime client. Do NOT hand-edit `dto.ts` then run type-check; the runtime client still won't know the column → `prisma.<model>.update` will silently drop fields.
3. Update `server/core/<entity>/schema.ts` (field def + base object + `newItem`).
4. Write the migration SQL, apply local.
5. `pnpm type-check`.

**SQLite gotchas:**

- `ALTER TABLE ADD COLUMN ... NOT NULL DEFAULT '<lit>'` is supported.
- SQLite cannot alter a column's DEFAULT in place — to change a default (e.g. rename an enum-like literal), the migration must `CREATE TABLE <new>` → `INSERT … SELECT` → `DROP` → `RENAME` and recreate unique indexes. Don't forget a parallel `UPDATE` to rewrite existing rows from the old literal.

**Migrations are gitignored** (`prisma/migrations/.gitignore` ignores `*.sql`). They are deploy-time artifacts only; do not stage them in commits. Mention new migration filenames in the commit body so the deployer knows to apply them.

## Architecture

### Single-Worker SPA + API

`server/index.ts` exports a Hono `app` (+ `AppType` for client RPC). Mounts route modules under `/api/{auth,providers,subscriptions,tags,nodes,rulesets,app-configs,routes,static-files,system-notices}`, plus public `/sub/:token` and `/files/*`, then `app.get("/*", () => env.ASSETS.fetch(...))` serves the SPA. The auth middleware is attached via `app.use("/api/*", requireAuth)` (bypassed for `/api/auth/*` by path-prefix check). `pnpm dev` runs real Worker code via `@cloudflare/vite-plugin` — no separate Node server.

### TypeScript project layout

Root `tsconfig.json` references three child projects: `tsconfig.app.json` (SPA, src/**), `tsconfig.worker.json` (Worker, server/**), `tsconfig.node.json` (config files). Both app + worker include `worker-configuration.d.ts` so `cloudflare:workers` resolves (SPA needs it since `@server/index` is imported as a type for the RPC client).

### Database access (`server/db.ts`)

Single `prisma` client built at module scope via `PrismaD1(env.DB)`. Always `import { prisma } from "@server/db"`; never instantiate new clients.

### Per-entity layout (`server/core/<entity>/`)

Each entity is a self-contained directory that doubles as both the worker module **and** the client-side type/validation source:

```
server/core/<entity>/
  schema.ts   ← zod 4 schema + Prisma type assert + newItem  (imported by both worker and SPA)
  routes.ts   ← Hono routes (server-only — imports @server/db)
  index.ts    ← `export * as <entity> from "./schema";`  (client-safe barrel)
```

**Critical rule**: `index.ts` must NOT re-export anything from `routes.ts`. Doing so drags `@server/db` → `cloudflare:workers` into the SPA bundle. Routes are imported in `server/index.ts` via the explicit `@server/core/<entity>/routes` path.

**`schema.ts` structure** (canonical example: `server/core/nodes/schema.ts`):

1. Field-level `const x = z....()` definitions.
2. Base schema: `export const <entity> = z.object({ id, ... })` matching the Prisma DTO 1:1.
3. `assert<Equals<z.infer<typeof <entity>>, <Entity>>>()` (from `tsafe`) — fails compilation if zod drifts from prisma.
4. `export type { <Entity> }` (re-exporting the Prisma DTO type).
5. `export const newItem = (): <Entity> => ({...})` — empty form initializer used by the store.
6. Aggregated variants only here (e.g. `aggregatedNode = node.extend({ subscription })`). All cross-entity types (aggregates, manager input shapes) live in `schema.ts` — never define them inline in `routes.ts` or manager files.
7. API schemas: `create.body`, `upsert.body = <entity>.extend({ id: id.optional() })`, optional `fetch.query` / `fetchAll.query`.

For DB-managed columns (`createdAt`, `updatedAt` on Subscription), include them in the base to satisfy the assert, then `.omit()` them from `create.body` / `upsert.body`.

### Schema highlights (`prisma/schema.prisma`)

- `Provider` 1—n `Subscription` 1—n `Node`
- `Subscription.urls`, `Node.tags`, `Node.connInfo`, `Tag.keywords`, `Route.{rulesets,features,filter}`, `AppConfig.{config,nodeFilter}` are `Json` columns (SQLite TEXT). Runtime shapes are pinned via `prisma-json-types-generator` `/// ![Type]` doc comments; mirror those in the zod field defs.
- No FK from `Node.tags` to `Tag` — node tags match tags by name string.
- Subscription + Ruleset have `createdAt` / `updatedAt` (auto-managed); other entities do not.
- `AppConfig.apiToken` is `@default(uuid(4))` and powers the public `/sub/:token` route; rotate via `POST /api/app-configs/:id/rotate-api-token`.
- `AppConfig.overrideName` overrides `name` when serving (`Content-Disposition` header on `/sub/:token` and `name=` in the clash:// install URL).
- `AppConfig.nodeFilter` (Filter JSON, default `{type:"none"}`) narrows the node pool **before** each route's own filter; `"none"` is the unchanged-behavior sentinel.
- `AppConfig.keepNoResolve` (Boolean, default `false`) — when false (default), generation **strips** `no-resolve` from every classical rule; true keeps it. Plumbed to `ClashConfigAdapter` → `RuleAggregator(reservedNames, stripNoResolve = !keepNoResolve)`.
- `Subscription.urls` may be `[]` (empty array). Sync calls return 400 "no urls; sync disabled" on cache miss / forceReload. Cache hits + `PUT /content` manual upload still work.
- `StaticFile.name` allows `/` (so `geosite/foo.srs` is a valid name). Leading/trailing `/`, consecutive `//`, and trailing `/sha256` are rejected by the schema.

### Route conventions (`server/core/<entity>/routes.ts`)

Each `routes.ts` exports a `new Hono()` instance, mounted in `server/index.ts`. 6-endpoint pattern (canonical: `server/core/nodes/routes.ts`): `GET /`, `GET /:id` (or `/:idOrName`), `PUT /` (upsert via `schema.upsert.body`, destructure `{ id, ...data }`), `POST /` (`schema.create.body`), `PUT /:id` (`schema.create.body`), `DELETE /:id`.

Errors: throw `HttpErr(status, message)` from `@server/utils/http-errors`; the global `ErrorHandler` registered in `server/index.ts` serializes to `{ status, error }` JSON. Don't `c.json({ error }, 4xx)` ad-hoc.

**`:idOrName`**: providers/tags/rulesets are addressable by UUID *or* unique name via `mid.paramIdOrName`. Route picks the where-clause inline (`z.uuid().safeParse(idOrName).success ? { id } : { name }`). Subscriptions/nodes/routes are UUID-only via `mid.paramId`.

### Subscription raw-content proxy

`server/core/subscriptions/{routes.ts,subscription-manager.ts}`:

- `GET /:id/content` — cached normalized text. `?force_reload=true` bypasses cache.
- `PUT /:id/content` — overwrite cached content; request `content-type` is taken at face value (client sniffs first).
- `GET /:id/status` — JSON metadata (`sourceUrl`, `size`, `cachedAt`, `contentType`).

`SubscriptionManager.get()`: cache hit → return; else (if `urls.length`) iterate `sub.urls`, fetch each, run `sniffContentType` (`server/utils/sniff-content-type.ts`) and keep only `application/{json,yaml,nodelist}`. Sniffer unwraps base64. Storage = KV (binding `kv`, key `subscription:<id>`), no TTL, persistent until overwrite. Empty `urls` → 400 on miss/forceReload (sync disabled).

### Ruleset + StaticFile cache managers

`RulesetManager` / `StaticFileManager` follow the same KV-with-metadata pattern (`kvKey = "<entity>:<id>"`):

- Ruleset cache: 24h TTL (`expirationTtl: 86400`); `?force_reload=true` refetches. Inline-only rulesets (`rules` non-empty) bypass KV entirely.
- StaticFile cache: per-row `expire` seconds drives `expirationTtl`. SHA-256 of the body is computed at write time and stored in cache metadata — the `/files/<name>/sha256` endpoint never round-trips upstream when the cache is warm.

### Frontend structure (`src/`)

- `main.ts` wires Pinia, Vue Router, `vue-final-modal`'s `createVfm()`.
- Path aliases: `@/*` → `src/*`, `@server/*` → `server/*`.
- Routes (`src/router/index.ts`): `views/<resource>/<Resource>Page.vue` (list) + `<Resource>DetailPage.vue` (detail). Home (`/`) = `ProviderPage`. Statically imported. `/login` is the only public route (`meta.public = true`).
- Detail params: `provider`/`tag`/`ruleset`/`route`/`app-config`/`static-file` use `:idOrName`; `subscription`/`node` use `:id`.
- Global router guard checks `useAuthStore().authenticated` (lazy-bootstrapped via `auth.check()` on first nav). Unauthed nav → `/login?next=<fullPath>`. `App.vue` hides nav + RouterView entirely until authenticated so unauth users only see the login overlay.
- API access: typed Hono RPC client `client = hc<AppType>("/")` from `@/utils/api`. Always wrap with `useHonoApi(api)` from `@/lib/acrux` (it unpacks `.json()`). The `rpc()` helper intercepts 401 → unsets auth + pushes `/login`.
- Per-entity types come from `@server/core/<entity>` namespace (`<entity>.<Entity>`, `<entity>.upsert.body`, `<entity>.newItem`). Do **not** import `@server/generated/prisma/dto` directly from `src/`.
- `useAllTagsStore` (in `src/stores/tags.ts`) wraps the `GET /api/tags/all` aggregate endpoint (union of `Tag.name` table + every distinct value in `Node.tags`). Prefer it over walking `useNodeStore.useAll()` for tag-picker UIs (`NodeFilter` is the canonical consumer).

### Acrux (`src/lib/acrux/`)

The collection / async abstraction layer. Use tuple returns (not object accessors):

- `useAsyncState<T>(promise, initial, opts?)` → `[Ref<T>, { loading, error }, () => Promise<void>]`
- `useHonoApi(apiFn, transform?)` — wraps a hono `client` call into `(...args) => Promise<Dto>`
- `useSortedCollection({ newItem, fetchFn, removeFn, upsertFn, upsertSchema, resolveFn?, sortFn? })` → returns `{ useAll, useItem, useRemoval, useUpsert }` for a Pinia store
- `useValidation(form, standardSchema)` → `{ errors(key), ingore(key), valid(key), validate(), useErrors(key) }`

**Store contract** — `src/stores/<entity>.ts` is a one-liner:

```ts
import { <entity> } from "@server/core/<entity>";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const use<Entity>Store = defineStore("<entity>s", () => useSortedCollection({
  newItem: <entity>.newItem,
  fetchFn: useHonoApi(() => client.api.<entity>s.$get()),
  removeFn: useHonoApi((id: string) => client.api.<entity>s[":id"].$delete({ param: { id } })),
  upsertFn: useHonoApi((json: <entity>.<Entity>) => client.api.<entity>s.$put({ json })),
  upsertSchema: <entity>.upsert.body,
}));
```

Nodes additionally provide a `resolveFn` to aggregate the related subscription after upsert (only entity that aggregates in-store; others look up cross-entity names via the relevant `useAll`).

**Hook return shapes** (consumed in views):

- `const [items, status, refresh] = useAll();`
- `const [item, status, reload] = useItem(idRef);`
- `const [form, issues, status, submit] = useUpsert(idRef);` — `issues` is the `useValidation` API
- `useRemoval(idRef)` returns a `Removal<T>` tuple; pass directly to `<RemovalButton :ctx="removal" />`

### Presentational layer (`src/components/CMS/`)

Shells + modal/removal helpers (data abstraction lives in acrux):

- `<PageEntry>` — list shell (skeleton/empty/error states; emits `retry`, `create`).
- `<DetailPage>` — detail wrapper.
- `<RemovalButton :ctx="removal">` — destructive confirm bound to a `Removal<T>` tuple.
- `useFormModel(EditorComp)` → `{ create, update }` — modal create/edit via `vue-final-modal`.
- `useConfirmPopover({ message, useRemoval })` from `src/components/Actions/` — inline list-row delete confirm.

### Adding a new entity

1. Add Prisma model + migration; `pnpm prisma generate`.
2. `server/core/<entity>/schema.ts` — mirror `nodes/schema.ts` (fields → base → `assert<Equals>` → `newItem` → variants → api schemas).
3. `server/core/<entity>/index.ts` = `export * as <entity> from "./schema";` (no route re-export).
4. `server/core/<entity>/routes.ts` — 6-endpoint pattern.
5. Mount in `server/index.ts` via `@server/core/<entity>/routes`.
6. `src/stores/<entity>.ts` — one-liner (template above).
7. `src/views/<entity>/` — `<Entity>Page.vue` + `<Entity>List.vue` + `<Entity>Editor.vue` + `<Entity>DetailPage.vue` (reference: `src/views/node/`).
8. Add a route in `src/router/index.ts`.

### UI components

- shadcn-vue + reka-ui primitives in `src/components/ui/<widget>/`, each folder barrel `index.ts`.
- Forms use the Field family (`FieldSet`, `FieldLegend`, `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`).
- Icons: `lucide-vue-next`. Class utils: cva, `clsx`, `tailwind-merge`. Tailwind 4 via `@tailwindcss/vite` (no `tailwind.config.js`).
- DataView barrel (`src/components/DataView/index.ts`): `CopyBtn`, `CopyTag`, `QrBtn` (lazy-loaded modal + `qrcode` lib via `defineAsyncComponent` — nothing QR-related ships in the main bundle until first open), `DataView`/`DataItem`, `Route`/`Link`, `MultiLine`/`MultiLineInput`, `JsonTextArea`, `EntitySelect`, `DateFormatter`.

## Conventions

### Generated code

Never hand-edit `server/generated/prisma/**` or `worker-configuration.d.ts` — regen via `pnpm prisma generate` and `pnpm cf-typegen`. **Editing `dto.ts` by hand is a footgun** — `pnpm type-check` passes but the runtime Prisma client still doesn't know the column, so writes silently drop fields.

### Zod 4 idioms

- Use `z.uuid()` (not deprecated `z.string().uuid()`).
- Use `z.json()` for arbitrary-JSON columns instead of `z.unknown()` / `z.record(z.unknown())`. Reserve `z.string().refine(isValidJson)` for UI fields holding raw JSON text (e.g. a textarea).
- Frontend forms validate via the Standard Schema interface: `schema["~standard"].validate(...)` — exposed via `useValidation` (returned as the `issues` element of the `useUpsert` tuple).
- **Enum-like string columns**: Prisma maps them to `string` in `dto.ts`, so `z.enum([...])` breaks the `assert<Equals<...>>` check (`"a" | "b"` ≠ `string`). Use `z.string().refine((v) => VALUES.includes(v))` and export the const array + `type Outbound = (typeof VALUES)[number]` separately for UI use.

### TypeScript

- `noUncheckedIndexedAccess` on (`tsconfig.app.json`). Array/object index access produces `T | undefined` — handle the undefined branch.
- Only `import type` from `@server/*` inside `src/` — value imports of `@server/db`, `@server/index`, or any `@server/core/<entity>/routes` will pull `cloudflare:workers` into the SPA bundle.

### Wrangler bindings

- `DB` — D1 database `v2relay` (id `f7fda464-f94f-4cd7-b638-5f37756dfa3d`). Toggle `"remote": true` on the binding to point `pnpm dev` at prod D1.
- `kv` — KV namespace shared by `RulesetManager`, `StaticFileManager`, and `SubscriptionManager` (keys `ruleset:<id>` / `static-file:<id>` / `subscription:<id>`).
- `ASSETS` — static assets from `./dist`.
- Secret: `API_TOKEN` (admin login password; also the HMAC secret for the auth signed cookie).
- `nodejs_compat` flag enabled; observability on; source maps **not** uploaded (off in prod by default — flip in `wrangler.jsonc` when debugging).

Adding a new binding: edit `wrangler.jsonc`, then `pnpm cf-typegen` to refresh `worker-configuration.d.ts`.

### Adapters (`server/core/app-configs/adapter/`)

- `AppConfigAdapter` interface: `serialize(): Promise<string>` + `send(): Promise<Response>`.
- `ClashConfigAdapter(template, config, nodeFilter, displayName, updateIntervalHours = 24)` — only adapter currently wired. `send()` sets `Content-Disposition` (RFC 5987-encoded) + `profile-update-interval` so Clash clients pick up the profile name and refresh cadence on first import. v2ray is a registered type but has no adapter yet → 400 on /sub.
- Rules are built from the **parsed** ruleset copies, aggregated per policy (target): for each route the relevant rulesets' `RulesetManager.getParsedCollection()` (reads the `ruleset-parsed:<id>` KV copy, falls back to computing) plus the route's inline `rules` are merged into one `RuleCollection` keyed by `policy`. Then per policy: `domain` + `ipcidr` buckets become **inline `rule-providers`** (`{type:"inline", behavior, payload}`) referenced via `RULE-SET,<name>,<policy>`; `classical` lines go straight into `rules` (re-parsed + `stringifyWithPolicy` for correct `policy`-before-additions order). Provider names are slugged (`[^A-Za-z0-9_.-]→_`) + deduped against base-template providers. A bad/unreachable ruleset is skipped, not fatal.
- `MATCH` is special: not a rule-provider payload, so `RuleCollection` keeps it out of the buckets but flags `hasMatch`. The aggregator emits `MATCH,<policy>` (last for that target) when set — so a route's own MATCH is honored instead of the default `MATCH,DIRECT` fallback. Caveat: `hasMatch` only survives `RuleCollection.fromRuleList` (route inline `rules`); the `ruleset-parsed:<id>` JSON copy has no MATCH field, so a MATCH inside a fetched ruleset is lost.
- When emitting node-name arrays into `proxy-groups.members`, **use a for-of push loop, not spread** — `members.push(...nodeNames)` blows V8's arg-count limit on large pools.
