# Self Improvement

A private Android-first self-improvement app for steps, sleep, screen time, fitness, nutrition, meditation, breathing, happiness, and period tracking.

The Android APK contains the complete SvelteKit frontend. `self.zund.cc` runs a separate API-only SvelteKit application on Cloudflare Workers for authentication, business logic, AI requests, Android updates, and D1 persistence. There is no hosted web frontend.

## Architecture

```text
Android APK
  SvelteKit SPA + Svelte 5 + Lily UI
  Capacitor Health Connect and Usage Access
  Keystore-backed Better Auth bearer session
                    |
                    | HTTPS JSON APIs
                    v
self.zund.cc
  API-only SvelteKit + Better Auth + Drizzle
                    |
                    v
              Cloudflare D1
```

- `mobile/` is the complete frontend SvelteKit application.
- `mobile/src/routes/` contains all screens and tracker interfaces.
- `mobile/src/lib/api.ts` owns authenticated API requests.
- `mobile/src/native/` owns Health Connect, UsageStats, secure storage, and app lifecycle integrations.
- `mobile/src/domain/` owns native payload transformation and synchronization.
- `mobile/static/` contains fitness media and the Health Connect privacy policy.
- `src/routes/api/app/` exposes authenticated frontend data and mutations.
- `src/routes/api/auth/` exposes Better Auth.
- `src/routes/api/android-update/` securely proxies private signed Android releases.
- `src/routes/(trackers)/` contains server-only tracker parsing and persistence logic.
- `src/lib/server/db/` contains the D1 schema.
- `android/` contains the committed Capacitor Android project.

Requests outside the backend's endpoint routes return JSON `404` responses. Cloudflare does not host the app interface or tracker media.

## Stack

- SvelteKit 2, Svelte 5, and TypeScript for both applications
- Lily UI and Tailwind CSS 4
- Capacitor 8 and Android
- Cloudflare Workers and D1
- Drizzle ORM
- Better Auth bearer sessions
- Health Connect and Android UsageStatsManager
- Vitest, ESLint, Prettier, and Svelte Check

## Local setup

```sh
npm install
cp .dev.vars.example .dev.vars
cp .env.example .env
```

Set `BETTER_AUTH_SECRET` in `.dev.vars` to a high-entropy value of at least 32 characters, then initialize D1:

```sh
npm run db:migrate:local
```

Start the Cloudflare API and Android frontend in separate terminals:

```sh
npm run dev
npm run mobile:dev -- --host 0.0.0.0
```

The API runs at `http://localhost:3000`; the mobile SvelteKit development server runs at `http://localhost:5173`. `PUBLIC_API_BASE_URL` in `.env` selects the API used by the frontend.

For an emulator, use URLs reachable through Android's host alias:

```sh
PUBLIC_API_BASE_URL=http://10.0.2.2:3000 \
CAPACITOR_SERVER_URL=http://10.0.2.2:5173 \
npm run mobile:android
```

For a USB device, reverse both ports and use localhost:

```sh
adb reverse tcp:3000 tcp:3000
adb reverse tcp:5173 tcp:5173
PUBLIC_API_BASE_URL=http://localhost:3000 \
CAPACITOR_SERVER_URL=http://localhost:5173 \
npm run mobile:android
```

A LAN address also works when it is added to `BETTER_AUTH_TRUSTED_ORIGINS` and `MOBILE_APP_ORIGINS`.

## Android development

Install Node.js 22, Java 21, and Android Studio with Android platform 36, build tools, and platform tools.

```sh
npm run mobile:check
npm run mobile:build
npm run mobile:sync
npm run mobile:android
```

`mobile:build` runs the SvelteKit static adapter and writes the complete SPA to `dist-mobile/`. `mobile:sync` copies that output and Capacitor plugins into the Android project. `mobile:android:open` opens Android Studio.

Production sessions are returned by Better Auth through the `set-auth-token` header and stored with Android Keystore-backed secure storage. Authenticated app and native-ingestion requests send that signed session as a bearer token. QR pairing and separate tracker credentials are not part of the current app.

The app requests camera access for meal capture, read-only Steps and Sleep access from Health Connect, and Usage Access for screen time. It uploads seven local days on demand and retries stale trackers when the app returns to the foreground. Trackers without recent measurements link to a shared Android data help page with permission, source-data, and synchronization checks. Profile → Android data shows permissions, individual sync status, failure details, settings links, and manual controls.

Password-reset email links pass through `/api/mobile/reset-password` and open the app through the `selfimprovement://reset-password` deep link.

## API development

The root SvelteKit project is the Cloudflare API:

```sh
npm run check
npm run test:web
npm run build
npm run preview
```

Important endpoint groups:

- `/api/auth/*` — login, sessions, passwords, and administrator actions
- `/api/app/*` — dashboard, profile, trackers, and persistent frontend data
- `/api/android-update/*` — latest signed release metadata and APK delivery
- tracker ingestion endpoints — authenticated native uploads and legacy webhook compatibility

Better Auth, Drizzle, and D1 are created per request from `event.platform.env.DB`. Mobile origins are explicitly allowed by `src/hooks.server.ts`; production and local values are configured through `MOBILE_APP_ORIGINS` and `BETTER_AUTH_TRUSTED_ORIGINS`.

## Runtime configuration

Local backend values belong in `.dev.vars`. Production values are configured through Wrangler and Cloudflare:

- `APP_URL` or `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `MOBILE_APP_ORIGINS`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GITHUB_RELEASE_TOKEN`
- `OPENROUTER_API_KEY`

The frontend build accepts `PUBLIC_API_BASE_URL` and defaults to `https://self.zund.cc`.

## Accounts

Public sign-up is disabled. Administrators create and manage users from the Android app. Users can update their profile, visible trackers, nutrition settings, and password in the app.

Create or promote the first local administrator:

```sh
npm run admin:create:local
```

For non-interactive use:

```sh
npm run admin:create:local -- --email admin@example.com --password 'strong-password'
```

## Android releases

`.github/workflows/android.yml` validates both SvelteKit applications, runs Android tests and lint, checks the merged manifest, and packages signed APK and AAB artifacts for `v*` tags.

Release APKs check `/api/android-update` on launch. The Cloudflare API uses a server-only, read-only `GITHUB_RELEASE_TOKEN` to inspect the private repository and return a short-lived trusted APK download redirect. The token never enters the APK.

Configure these GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_CERT_SHA256`

Keep the original release keystore and a tested backup outside GitHub. Losing it prevents compatible app updates.

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

## Validation

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

Deployment requires an authenticated Wrangler session and explicit approval. Shipping the frontend requires a signed Android release, not a Cloudflare frontend deployment.
