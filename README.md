# Self Improvement

A mobile-first SvelteKit app that brings health, screen time, nutrition, fitness, meditation, breathing, happiness, and period tracking into one private daily view.

## Stack

- SvelteKit 2, Svelte 5, and TypeScript
- Lily UI with Tailwind CSS 4
- Cloudflare Workers and D1
- Drizzle ORM with committed SQL migrations
- Better Auth with private accounts, profile, password-reset, and admin support
- Capacitor 8 with a committed Android platform and an independent Svelte mobile bundle
- Vitest, ESLint, Prettier, and Svelte Check

## Structure

- `src/hooks.server.ts` creates Drizzle and Better Auth per request from Cloudflare bindings.
- `src/lib/server/auth.ts` owns authentication and trusted-origin configuration.
- `src/lib/server/db/` contains the D1 client and schema aggregator.
- `src/lib/server/db/trackers/` contains one schema file per tracker.
- `src/lib/server/guards.ts` protects authenticated and administrator routes.
- `src/lib/audio/audio-manager.ts` handles shared meditation loops and fitness sound effects.
- `src/lib/trackers/registry.ts` is the shared tracker catalog used by navigation and profile settings.
- `src/lib/server/trackers/preferences.ts` persists each user's visible trackers.
- `src/routes/api/auth/[...path]/+server.ts` exposes the Better Auth API.
- `src/lib/auth-client.ts` provides the browser authentication client.
- `src/routes/(trackers)/nutrition/` contains the calorie estimator, meal log, and nutrition logic.
- `src/routes/(trackers)/fitness/` contains workout pages, APIs, components, and fitness logic.
- `src/routes/(trackers)/meditation/` contains the timer, sounds, and meditation history.
- `src/routes/(trackers)/breathing/` contains the guided daily 4-7-8 breathing exercise and history.
- `src/routes/(trackers)/steps/` contains Health Connect ingestion and step history.
- `src/routes/(trackers)/happiness/` contains daily happiness levels, level-specific reasons, and history.
- `src/routes/(trackers)/period/` contains menstruation entries, cycle estimates, and period history.
- `drizzle/` contains versioned D1 migrations.
- `mobile/` contains the companion UI; `vite.mobile.config.ts` builds it to `dist-mobile/`.
- `android/` contains the committed Capacitor Android application source.
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

## Android companion development

Install Node.js 22, Java 21, and Android Studio with the Android SDK, platform 36, build tools, and platform tools. Use an emulator for shell work and a physical Android 8+ device for Health Connect and Usage Access validation.

Build and run the bundled application without a Vite dependency:

```sh
npm run mobile:check
npm run mobile:build
npm run mobile:sync
npm run mobile:android
```

`mobile:android:open` synchronizes the bundle and opens the generated project in Android Studio. Native plugin, manifest, Kotlin/Java, and Gradle changes require another sync and native rebuild.

For live reload, run the backend and mobile Vite server in separate terminals:

```sh
npm run dev
npm run mobile:dev -- --host 0.0.0.0
```

An emulator reaches the mobile server through the host alias:

```sh
CAPACITOR_SERVER_URL=http://10.0.2.2:5173 npm run mobile:android
```

For a USB device, reverse both development ports and use device-local URLs:

```sh
adb reverse tcp:3000 tcp:3000
adb reverse tcp:5173 tcp:5173
CAPACITOR_SERVER_URL=http://localhost:5173 npm run mobile:android
```

A LAN address is an alternative for physical devices. The pairing QR must contain an API base URL reachable by the device: `http://10.0.2.2:3000` for an emulator, `http://localhost:3000` with `adb reverse`, or the development machine's LAN address. `CAPACITOR_SERVER_URL` is omitted from production bundles; cleartext WebView traffic is enabled only when that development URL uses HTTP.

Health Connect's rationale activity is wired to the bundled `mobile/public/privacypolicy.html` asset. The Android manifest requests only Internet, Usage Access, and read-only steps and sleep access; it does not request `QUERY_ALL_PACKAGES`, health history, background health access, or health write access.

### Physical-device validation

Before release, verify that:

- the bundled app opens with no Vite server and survives an app update without losing pairing;
- QR pairing and disconnect/credential rotation work without tokens appearing in logs;
- Health Connect missing, denied, partially granted, granted, and revoked states are recoverable;
- only steps and sleep read permissions appear, including sleep sessions crossing midnight;
- Usage Access denied and granted states work and per-app totals match Android Digital Wellbeing;
- offline sync retries on foreground return, and repeated seven-day uploads remain idempotent.

Background sync is deliberately deferred. The selected Health Connect and UsageStatsManager Capacitor plugins run through an active JavaScript bridge and do not provide a supported headless/WorkManager-safe execution path. The first release therefore uses manual sync plus a foreground/on-resume stale-sync fallback and requests no background permission. A focused native WorkManager implementation can be added only after headless data access and secure credential use are validated.

## Android releases

`.github/workflows/android.yml` validates the web and mobile builds, runs Android unit tests and lint with Java 21, and checks the merged release manifest before packaging. The manifest check permits only steps and sleep Health Connect read permissions and rejects health write access and `QUERY_ALL_PACKAGES`. A manual `workflow_dispatch` uploads a debug APK. A `v*` tag builds a signed release APK and AAB, stores them as a workflow artifact, and publishes both files on a GitHub Release for the tag.

Configure these GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_CERT_SHA256`

`ANDROID_KEYSTORE_BASE64` is the base64 encoding of the durable release keystore. `ANDROID_CERT_SHA256` is the expected SHA-256 fingerprint of its signing certificate; tagged builds fail if `apksigner` reports another identity. Obtain it from the trusted release keystore and copy the value after `SHA256:`:

```sh
keytool -list -v -keystore release.keystore -alias "$ANDROID_KEY_ALIAS" | grep 'SHA256:'
```

Colons, whitespace, and letter casing are normalized by CI. Never commit the keystore or signing values. Keep the original keystore and its alias/passwords in encrypted storage outside GitHub, with a separately tested backup; the GitHub secret is not a recovery backup, and losing the key prevents compatible application updates.

For a local signed build, set `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`, run `npm run mobile:sync`, then run `./gradlew assembleRelease bundleRelease` from `android/`.

## Account routes

- `/sign-in` — authenticate and resume a protected destination
- `/forgot-password` and `/reset-password` — password recovery
- `/profile` — update the profile, visible trackers, nutrition settings, or password
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

## Nutrition

The authenticated `/nutrition` route includes nutrition onboarding, daily calorie and macro goals, photo-first AI meal estimation, iterative corrections, editable meal details, and a dated food log. Add `OPENROUTER_API_KEY` to `.dev.vars` locally or as a Cloudflare secret remotely.

## Fitness

The authenticated `/fitness` route presents each day's 30-day-program workout as a date-selected daily view, with completion marks in the date picker, guided timed sessions, screen wake lock, workout cues and voice announcements, and per-exercise rep speed settings. The source music player, music files, and decorative button sounds are intentionally excluded.

## Steps

The authenticated `/steps` route creates a one-time webhook token for the free HC Webhook FOSS Android app, receives daily Health Connect step totals, and tracks a seven-day history against a configurable goal. Configure HC Webhook to use the displayed URL and custom header with Steps resolution set to Daily.

## Sleep

The authenticated `/sleep` route receives Health Connect sleep sessions through HC Webhook, subtracts known awake stages when Full sleep resolution is available, and compares daily duration and the recorded seven-day average with a configurable seven-hour default goal.

## Screen time

The authenticated `/screen-time` route receives the previous seven days of Android usage from the free Life Dashboard Companion app. It shows daily totals, the seven-day average, and a bounded per-app breakdown sent to its token-protected webhook.

Steps, Sleep, and Screen time share the same phone-connection setup component while keeping separate webhook credentials and source-specific setup instructions.

## Meditation

The authenticated `/meditation` route includes a configurable timer, mixable looping ambient sounds, shared volume controls, automatic D1 persistence, and a dated history with completion marks.

## Breathing

The authenticated `/breathing` route guides one daily six-round 4-7-8 breathing exercise. Its circle expands during each four-second inhale, stays full during each seven-second hold, and contracts during each eight-second exhale. Completed days are persisted in D1 and marked in the date selector.

## Happiness

The authenticated `/happiness` route records a daily happiness level from 1 to 5. Levels 1–2 show low-mood reasons, level 3 shows moderate positive reasons, and levels 4–5 show stronger positive reasons.

## Period

The authenticated `/period` route records daily menstruation flow and private notes, marks tracked dates, keeps recent history, and estimates cycle timing from saved entries.

## Adding a tracker

1. Create `src/routes/(trackers)/<tracker>/` and keep its pages, APIs, components, tests, and feature logic there.
2. Add its metadata to `src/lib/trackers/registry.ts` so it appears in profile configuration.
3. Put persistent models in `src/lib/server/db/trackers/<tracker>.ts`, export them from `src/lib/server/db/schema.ts`, and generate a migration.
4. Add its daily summary to the root dashboard when it has dashboard data.

Only reusable cross-tracker concerns belong under `src/lib`.

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

`npm run test` runs both the web and mobile Vitest suites.

```sh
npm run check
npm run lint
npm run test
npm run build
npm run mobile:check
npm run mobile:build
```

## Deployment

```sh
npm run deploy
```

Deployment requires an authenticated Wrangler session and explicit approval.

## Integrated tools

The fitness program from `../zun-fitness`, calorie estimator from `../ai-calorie-counter`, and timer with ambient sounds from `../meditate` are available under `/fitness`, `/nutrition`, and `/meditation`.
