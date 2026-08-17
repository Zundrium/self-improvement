# Self Improvement

A mobile-first SvelteKit app that brings nutrition, fitness, and meditation into one private daily view.

## Stack

- SvelteKit 2, Svelte 5, and TypeScript
- Lily UI with Tailwind CSS 4
- Cloudflare Workers and D1
- Drizzle ORM with committed SQL migrations
- Better Auth with private accounts, profile, password-reset, and admin support
- Vitest, ESLint, Prettier, and Svelte Check

## Structure

- `src/hooks.server.ts` creates Drizzle and Better Auth per request from Cloudflare bindings.
- `src/lib/server/auth.ts` owns authentication and trusted-origin configuration.
- `src/lib/server/db/` contains the D1 client and shared schema.
- `src/lib/server/guards.ts` protects authenticated and administrator routes.
- `src/lib/audio/audio-manager.ts` handles meditation loops and fitness sound effects.
- `src/routes/api/auth/[...path]/+server.ts` exposes the Better Auth API.
- `src/lib/auth-client.ts` provides the browser authentication client.
- `src/routes/calories/` contains the calorie estimator, meal log, and nutrition feature logic.
- `src/routes/fitness/` contains workout pages, APIs, components, and feature-specific logic.
- `src/routes/meditate/` contains the meditation timer, sounds, and completion tracking.
- `drizzle/` contains versioned D1 migrations.
- `scripts/create-admin.mjs` creates or promotes the first administrator.

## Local setup

```sh
npm install
cp .dev.vars.example .dev.vars
```

Set `BETTER_AUTH_SECRET` in `.dev.vars` to a high-entropy value of at least 32 characters, then initialize D1:

```sh
npm run db:migrate:local
npm run dev
```

The development server binds to `0.0.0.0:3000` and is available at `http://localhost:3000`. The Cloudflare platform proxy exposes the local `DB` binding during Vite development. Local data is persisted under `.wrangler/`.

## Account routes

- `/sign-in` — authenticate and resume a protected destination
- `/forgot-password` and `/reset-password` — password recovery
- `/profile` — update the profile or password
- `/admin` — administrator-only user management

Public sign-up is disabled. Administrators can create users, change roles and passwords, ban or restore accounts, and delete accounts.

Create or promote the first local administrator. The command applies pending local migrations and prompts for credentials:

```sh
npm run admin:create:local
```

For non-interactive use:

```sh
npm run admin:create:local -- --email admin@example.com --password 'strong-password'
```

Use `admin:create:remote` only after the remote database is configured and migrated.

## Runtime configuration

Local runtime values belong in `.dev.vars`. Production values are configured through Wrangler and Cloudflare:

- `APP_URL` or `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `OPENROUTER_API_KEY`

Drizzle Studio or direct remote Drizzle access uses the values documented in `.env.example`.

## Calories

The authenticated `/calories` route includes nutrition onboarding, daily calorie and macro goals, photo-first AI meal estimation, iterative corrections, editable meal details, and a dated food log. Add `OPENROUTER_API_KEY` to `.dev.vars` locally or as a Cloudflare secret remotely.

## Fitness

The authenticated `/fitness` route includes the complete 30-day workout calendar, guided timed sessions, screen wake lock, workout cues and voice announcements, completion history, and per-exercise rep speed settings. The source music player, music files, and decorative button sounds are intentionally excluded.

## Meditation

The authenticated `/meditate` route includes a configurable timer, mixable looping ambient sounds, shared volume controls, and automatic D1 persistence for completed sessions. Meditation pages, components, audio, and feature logic are colocated under `src/routes/meditate/`.

## Database changes

After changing an exported schema:

```sh
npm run db:generate
npm run db:migrate:local
```

After changing Better Auth models or plugins:

```sh
npm run auth:schema
npm run db:generate
```

## Remote D1 setup

`wrangler.jsonc` intentionally uses `database_id: "local"` until a Cloudflare database is approved and provisioned.

```sh
npx wrangler d1 create self-improvement-db
```

Copy the returned database ID into `wrangler.jsonc`, configure production variables and secrets, then apply migrations:

```sh
npm run db:migrate:remote
```

## Validation

```sh
npm run check
npm run lint
npm run test
npm run build
```

## Deployment

```sh
npm run deploy
```

Deployment requires an authenticated Wrangler session and explicit approval.

## Integrated tools

The fitness program from `../zun-fitness`, calorie estimator from `../ai-calorie-counter`, and timer with ambient sounds from `../meditate` are available under `/fitness`, `/calories`, and `/meditate`.
