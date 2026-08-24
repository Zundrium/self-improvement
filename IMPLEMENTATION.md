# Android Frontend Migration

## Goal

Make the Android application the only complete Self Improvement frontend. Keep `self.zund.cc` as an API-only SvelteKit service for login, server logic, AI requests, updates, and persistent D1 data.

## Runtime boundaries

### Android SvelteKit application

`mobile/` contains the complete user experience:

- authentication and password recovery;
- daily dashboard and date navigation;
- steps, sleep, screen time, fitness, nutrition, meditation, breathing, happiness, and period screens;
- profile, tracker visibility, nutrition preferences, password changes, and administrator user management;
- Health Connect and Android Usage Access permissions;
- foreground and resume synchronization;
- fitness and meditation media;
- Android deep-link handling and secure session storage.

The static adapter writes the SPA to `dist-mobile/`, which Capacitor packages from `capacitor.config.ts`.

### Cloudflare SvelteKit application

The root `src/` application exposes endpoints only:

- `/api/auth/*` for Better Auth;
- `/api/app/*` for authenticated frontend queries and mutations;
- `/api/android-update/*` for private signed release delivery;
- bounded tracker ingestion endpoints;
- JSON `404` responses for all other paths.

It contains no tracker pages, navigation, forms, media, or hosted app shell.

## Authentication

Better Auth uses the bearer plugin in addition to administrator support.

1. The Android login screen posts credentials to `/api/auth/sign-in/email`.
2. Better Auth returns the signed session through `set-auth-token`.
3. The frontend stores it through `@aparajita/capacitor-secure-storage` on Android.
4. Every app API request sends `Authorization: Bearer <token>`.
5. Server hooks resolve the session before API handlers and expose refreshed tokens.
6. A `401` clears the local session and returns the user to login.
7. Sign-out invalidates the server session before deleting local credentials.

Cloudflare allows only configured mobile development origins and the Capacitor `https://localhost` origin. Password-reset callbacks use an API endpoint that redirects into the `selfimprovement://reset-password` Android deep link.

## Native tracker synchronization

Native collection is part of the authenticated app rather than a separately paired companion.

- Steps read Health Connect.
- Sleep and screen time read UsageStatsManager; sleep uses detailed activity and screen-interactive events for bedtime adherence.
- Each collector uses the device IANA time zone; aggregate trackers upload seven days, while detailed bedtime events are limited to the latest two days because Android retains them only briefly.
- Uploads use the Better Auth bearer session and `X-Time-Zone`; no QR token is required.
- The backend ensures tracker connection rows exist for authenticated users and keeps existing goals and records.
- Trackers upload independently so one denied permission does not block the others.
- Successful times, permission state, and bounded failures persist in secure storage.
- Stale trackers retry when the app returns to the foreground.
- Profile → Android data provides permission and manual sync controls.

Legacy webhook token columns and ingestion authentication remain compatible with previously configured integrations, but the current app does not expose pairing or setup flows.

## Frontend data flow

Universal SvelteKit `+page.ts` loaders call `mobile/src/lib/api.ts`. The root layout loads `/api/app/session`, redirects unauthenticated routes to login, and supplies the authenticated user and enabled tracker registry to navigation.

Mutations use JSON API requests rather than SvelteKit server form actions because the Android build is a static SPA. Components update optimistically where appropriate and invalidate page data after persistent changes.

Tracker screens keep their prior behavior:

- dated dashboard summaries;
- seven-day steps, bedtime-adherence, and screen-time histories;
- guided fitness sessions and rep-speed settings;
- photo-first nutrition analysis, correction, logs, and entry editing;
- meditation sounds and persisted sessions;
- guided 4-7-8 breathing;
- happiness levels and reasons;
- menstruation flow, notes, and cycle estimates.

## Static assets

All frontend assets live under `mobile/`:

- Lily components and shared app components under `mobile/src/lib/components/`;
- fitness files under `mobile/static/fitness/`;
- meditation audio under `mobile/src/routes/meditation/sounds/`;
- Health Connect privacy policy at `mobile/static/privacypolicy.html`.

The Cloudflare project no longer has a `static/` frontend asset directory.

## Local development

```sh
npm run dev
npm run mobile:dev -- --host 0.0.0.0
```

`PUBLIC_API_BASE_URL` selects the Cloudflare API. Emulator development uses `10.0.2.2`; USB development can use `adb reverse`. Native plugin or manifest changes require another `mobile:sync` and Android rebuild.

## Delivery

The existing signed GitHub release workflow remains the frontend delivery mechanism. It now builds the complete mobile SvelteKit application before Capacitor synchronization. Cloudflare deployments update only the API.

The Android release must continue to request only Internet, camera, package installation, notifications, Usage Access, and read-only Steps permission. Exact-alarm permission remains excluded. The custom reset-password deep link is declared on the exported main activity.

## Validation

```sh
npm run check
npm run lint
npm run test
npm run build
npm run mobile:check
npm run mobile:build
cd android && ./gradlew test lint
```

Physical-device validation must cover:

- login, session persistence, expiration, sign-out, and password-reset deep links;
- all tracker routes and persistent mutations;
- Health Connect denied, partially granted, granted, and revoked states;
- Usage Access denied and granted states;
- repeated seven-day uploads and timezone changes;
- offline recovery and resume synchronization;
- app upgrades without session or tracker-data loss;
- signed self-update download and installation.
