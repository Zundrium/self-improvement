# Android Companion Implementation Plan

## Goal

Add a small Android companion to the existing project that reads steps and sleep from Health Connect, reads screen time from Android UsageStatsManager, and sends those records to the existing SvelteKit backend.

This is an additive integration, not a rewrite:

- Keep the SvelteKit dashboard, Better Auth, Cloudflare Worker, D1, and tracker pages hosted.
- Keep the current Health Connect and Life Dashboard webhooks working as fallbacks.
- Bundle only the companion UI and native integrations in the APK.
- Build signed APK and AAB artifacts with GitHub Actions.

## Initial scope

The first release will provide:

- Android-only support.
- Health Connect availability and permission handling.
- Read-only access to steps and sleep.
- Android Usage Access permission handling and per-app screen-time collection.
- One-step pairing with the existing account.
- Secure on-device credential storage.
- Manual sync and sync whenever the app returns to the foreground.
- Per-tracker permission, last-sync, and error status.
- A debug APK from CI and a signed release APK/AAB from tagged builds.

The first release will not:

- Move SvelteKit server routes, Better Auth, or D1 into the APK.
- Rebuild the complete dashboard inside the companion.
- Remove the existing webhook integrations.
- Write records to Health Connect.
- Target iOS or the Play Store.
- Promise exact background execution times.

## Architecture

```text
Android companion
  Svelte 5 + Lily UI
        |
        +-- Capacitor Health Connect plugin
        +-- Capacitor UsageStatsManager plugin
        +-- Android secure storage
        +-- Android background worker
        |
        v
Existing SvelteKit ingestion endpoints
        |
        v
Existing tracker services and D1 tables
```

The root project will remain one npm project. A separate mobile build keeps the Cloudflare and Android outputs independent without introducing a workspace prematurely.

```text
mobile/
  index.html
  src/
    components/
    health/
    screen-time/
    sync/
    App.svelte
android/
capacitor.config.ts
vite.mobile.config.ts
.github/workflows/android.yml
```

The mobile build can reuse the Lily components and design tokens under `src/lib`. Native Android source under `android/` will be committed because Capacitor treats it as application source.

## Pairing and authentication

Do not put a Better Auth session or account password in the companion for the first release. Reuse the existing tracker token authentication through a single pairing flow:

1. Add a “Connect Android companion” action to the authenticated web application.
2. Create or rotate the existing steps, sleep, and screen-time tokens together.
3. Display one QR payload containing its schema version, API base URL, and the three credentials.
4. Scan the QR from the companion and validate its structure before saving it.
5. Store credentials through Android Keystore-backed secure storage, never local storage.
6. Allow the user to clear the connection in the companion and rotate it from the website.

The QR credentials are displayed once and are never persisted in plaintext by the backend. Reconnecting invalidates the previous credentials. Tracker goals and existing records must remain intact when credentials rotate.

This approach avoids cross-origin cookie authentication, introduces no new mobile session model, and lets the first version reuse the current endpoints:

- `POST /steps/api/health-connect`
- `POST /sleep/api/health-connect`
- `POST /screen-time/api/usage`

A unified device-token API should only replace this design if multiple devices, remote revocation, or richer device management becomes necessary.

## Data collection

### Steps

- Request read access only.
- Use Health Connect aggregation rather than summing raw records from multiple sources.
- Read a rolling seven-day range so missed uploads repair themselves.
- Produce one daily record in the existing steps payload format.
- Construct day boundaries in the device time zone and test daylight-saving transitions.
- Respect the existing 400-record and 128 KiB endpoint limits.

### Sleep

- Request read access only.
- Read sleep sessions and available stage data for the rolling seven-day range.
- Map native sleep states to the current webhook stage representation.
- Preserve source metadata where the plugin exposes it.
- Calculate and validate session durations before upload.
- Verify that sessions crossing midnight are assigned consistently with the current backend.
- Respect the existing session, stage, and 128 KiB endpoint limits.

The Health Connect plugin must prove that it returns the stage detail required by the current tracker before it is accepted. If it does not, add the smallest possible Kotlin bridge for sleep rather than weakening stored data silently.

### Screen time

- Open Android Usage Access settings when permission is missing.
- Query daily foreground usage for the rolling seven-day range.
- Convert Android milliseconds to whole minutes.
- Exclude zero-duration entries and the companion itself.
- Sort deterministically and enforce the existing 100-app-per-day limit.
- Use package names as a safe fallback when an application label is unavailable.
- Avoid `QUERY_ALL_PACKAGES` unless testing proves it is necessary. It requires additional Google Play policy justification.
- Respect the existing seven-day and 256 KiB endpoint limits.

## Sync behavior

Implement one small sync coordinator with independent tracker results:

1. Confirm the companion is paired.
2. Check each required permission.
3. Collect the rolling seven-day range.
4. Transform records into the existing versioned payloads.
5. Upload each tracker independently.
6. Record successful sync times locally.
7. Retain failed trackers for retry without blocking successful trackers.

The existing database writes are already naturally idempotent by user/date or sleep-session end time. Verify this behavior with repeated identical uploads before relying on it.

The app must:

- Sync on demand.
- Sync when returning to the foreground if the previous success is stale.
- Tolerate offline use and retry later.
- Distinguish permission, validation, authentication, network, and server failures.
- Never log credentials or health payloads.
- Rotate credentials after a `401` only through an explicit reconnect.

## Background synchronization

Background execution is a separate milestone after foreground synchronization is proven.

1. Evaluate whether the selected Capacitor plugins can run safely from a headless task.
2. Confirm Health Connect background-read feature and permission availability on the target phone.
3. Prefer Android WorkManager for periodic, network-constrained work.
4. If the JavaScript bridge cannot run headlessly, add a focused Kotlin worker that reads the required native data and calls the existing endpoints.
5. Make the worker use the same secure credentials and payload contract as foreground sync.
6. Fall back to foreground synchronization when background health access is unavailable or denied.

WorkManager scheduling is best-effort and subject to Android battery policy. The UI must report the actual last successful sync rather than implying a guaranteed schedule.

## Delivery phases

### Phase 1: Android shell

- Add Capacitor and the Android platform.
- Add the independent mobile Vite build.
- Reuse Lily for a connection/status screen.
- Establish production and live-reload Capacitor configurations.
- Install a debug APK on an emulator and physical phone.

Exit criteria: the bundled app opens without depending on the Vite server, and live reload works during development.

### Phase 2: Pairing

- Add the authenticated web pairing action and QR display.
- Add QR scanning and schema validation in the companion.
- Add Keystore-backed credential storage.
- Add disconnect and credential-rotation flows.
- Confirm no credentials appear in logs, URLs, analytics, or build artifacts.

Exit criteria: a new APK can be paired once and authenticate against all three existing endpoints.

### Phase 3: Foreground Health Connect sync

- Add availability checks and permission rationale screens.
- Implement daily step aggregation and upload.
- Implement sleep session/stage mapping and upload.
- Compare seven days of results with Health Connect and the existing webhook source.

Exit criteria: repeated syncs produce correct steps and sleep without duplicate records.

### Phase 4: Foreground screen-time sync

- Add Usage Access status and settings navigation.
- Implement daily app usage collection and upload.
- Validate totals against Android Digital Wellbeing or the existing Life Dashboard source.
- Decide whether app-label resolution justifies broader package visibility.

Exit criteria: seven-day totals and per-app usage match the device closely enough to replace the existing companion source.

### Phase 5: Reliability and background work

- Add stale-on-resume synchronization.
- Add retry handling and partial sync status.
- Add WorkManager-based periodic synchronization where permissions permit it.
- Test reboot, Doze, offline recovery, denied permissions, and revoked Health Connect access.

Exit criteria: the app recovers without manual data repair and clearly reports when Android prevents background access.

### Phase 6: GitHub Actions release build

- Add Node, Java, Android SDK, and Gradle setup.
- Run web and mobile validation before packaging.
- Build the mobile assets and run `npx cap sync android`.
- Build a debug APK for manual workflow runs.
- Build signed APK and AAB artifacts for version tags.
- Store the encoded keystore, alias, and passwords only in GitHub Actions secrets.
- Upload artifacts with the application version and Git revision.
- Document keystore backup and recovery outside GitHub.

Exit criteria: a tagged commit produces an installable signed APK and an AAB signed with the same durable release key.

### Phase 7: Rollout

- Run the companion alongside the existing webhook apps for at least seven days.
- Compare each source day by day.
- Resolve differences before changing setup guidance.
- Make the own companion the recommended setup while retaining legacy webhook instructions.
- Remove legacy integrations only after a separate explicit decision.

## Local development

Required tooling:

- Node.js and the existing project dependencies.
- Android Studio with the Android SDK and platform tools.
- The Java version required by the chosen Capacitor Android version.
- An emulator for shell development.
- A physical Android phone for Health Connect, Usage Access, and background testing.

Planned commands:

```sh
# Existing SvelteKit backend and local D1 on port 3000
npm run dev

# Mobile Vite server on port 5173
npm run mobile:dev -- --host 0.0.0.0

# Synchronize web assets and native dependencies
npm run mobile:sync

# Run or open the Android project
npm run mobile:android
npm run mobile:android:open

# Production mobile assets
npm run mobile:build
```

Host access from Android:

- Emulator: use `10.0.2.2` for services running on the development machine.
- USB device: use `adb reverse` for ports 3000 and 5173, or use the machine's LAN address.
- Physical device over LAN: keep the existing development server bound to `0.0.0.0`.

JavaScript and Svelte changes should live reload. Plugin, manifest, Gradle, or Kotlin changes require `mobile:sync` and a native rebuild. Local pairing must encode an API URL reachable from the device rather than browser-only `localhost` unless `adb reverse` is active.

## Testing

### Automated

- Unit-test native-to-payload transformations with fixed time zones and daylight-saving boundaries.
- Run existing parser tests against payload fixtures produced by the companion.
- Test empty data, maximum data, malformed records, duplicate days, and oversized batches.
- Test sync retry and partial failure behavior without native APIs.
- Test QR schema versions and rejection of malformed or unexpected API origins.
- Keep the existing commands green:

```sh
npm run check
npm run lint
npm run test
npm run build
npm run mobile:build
```

- Run Gradle unit tests and lint in the Android workflow.

### Physical-device verification

- Health Connect missing, available, denied, partially granted, and revoked.
- History access available and unavailable.
- Usage Access denied and granted.
- Empty Health Connect database and multiple data sources.
- Sleep crossing midnight and daylight-saving changes.
- Offline sync followed by recovery.
- App update without lost pairing.
- Credential rotation and old-credential rejection.
- Background behavior after reboot and under battery optimization.

## Security and privacy requirements

- Request only steps, sleep, history, and background permissions that are actually used.
- Provide an explicit Health Connect rationale and privacy-policy route.
- Store tokens with Android Keystore-backed encryption.
- Redact tokens and payloads from logs and error reporting.
- Use HTTPS outside local development.
- Reject unknown QR schema versions and untrusted non-local HTTP API origins.
- Do not embed account credentials, API tokens, keystores, or production secrets in the APK or repository.
- Review Health Connect and Google Play health-data declarations before any store release.

## Main risks

- The Health Connect plugin may not expose complete sleep stages or background reads.
- Android may defer periodic work because of Doze or vendor battery restrictions.
- Health Connect history and background permissions vary by provider version.
- Screen-time app labels may conflict with Android package-visibility policy.
- Multiple Health Connect sources may produce different totals if raw records are summed.
- Time-zone and daylight-saving mistakes can shift records between days.
- Release signing keys cannot be replaced without affecting upgrade compatibility.

Each risk has an early validation step before dependent work begins. Foreground sync remains a usable fallback even if reliable background collection requires additional native code.

## Completion criteria

The companion is complete when:

- A user can pair it with one QR scan.
- Steps, sleep, and screen time sync into the current tracker pages.
- Repeated and delayed syncs do not create duplicates or regress newer data.
- Credentials remain encrypted on the device and absent from logs/builds.
- Permission denial and background limitations are visible and recoverable.
- Existing webhook integrations continue to work.
- Local development works with live reload and a physical device.
- GitHub Actions produces a signed, installable APK and AAB.
- Web, mobile, and Android validation all pass.
