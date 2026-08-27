# Local-Only Android Implementation

## Goal

Self Improvement is one SvelteKit/Svelte 5 application packaged for Android with Capacitor. All application behavior and persistent state are local. The project has no authentication, backend, custom network API, AI service, or hosted web target.

## Runtime boundary

`mobile/` contains the complete application:

- dashboard, profile, gamification, rewards, and tracker screens;
- Lily UI components and bundled media;
- local endpoint-compatible reads and mutations;
- Dexie state and backup validation;
- native data collection and on-device processing;
- JSON export, restore, and optional Google Drive SAF backup controls.

The static adapter writes `dist-mobile/`. `capacitor.config.ts` and `android/` package that output into the Android app.

## Local state

`mobile/src/lib/local/state.ts` defines and validates one versioned app-state document. Dexie stores that document in IndexedDB and serializes updates through transactions. The state includes:

- the local display profile and tracker visibility;
- tracker history and settings;
- fitness progress and exercise speed preferences;
- manual nutrition entries, macros, calorie goals, eating windows, and fasting dates;
- gamification awards, rewards, and redemptions.

`mobile/src/lib/local/service.ts` preserves the existing loader and mutation call shape without making HTTP requests. `mobile/src/lib/api.ts` dispatches directly to that service. There are no credentials or sessions.

## Native tracker processing

- Steps use read-only Health Connect `READ_STEPS` access.
- Sleep and screen time use Android Usage Access.
- Native payloads are validated, transformed, and written directly to Dexie.
- Trackers process independently so denied access for one source does not block the others.
- Bounded permission, validation, and native-provider failures are retained on-device for troubleshooting.
- Stale data is processed when the app opens or resumes and can be refreshed manually.
- Bedtime adherence evaluates selected app activity during the four hours after the configured bedtime.

No tracker payload is uploaded or sent to a server.

## Nutrition

Nutrition is manual-only. The create and edit screens share the Lily-based `EntryEditor` fields for date, time, name, notes, meals, ingredients, quantities, units, calories, protein, carbohydrates, and fat. Entries are saved locally through an endpoint-compatible create mutation. Edit, delete, fasting, calorie goals, eating windows, and nutrition settings remain local and available.

The app has no camera surface, photo storage, AI estimate, or correction flow.

## Backups

`mobile/src/lib/local/backup.ts` wraps the state in a versioned JSON envelope and validates both the envelope and nested state before restore.

Users can export or restore a JSON file through Android's document picker. They can also explicitly select a Google Drive folder through the Storage Access Framework. The Drive app remains responsible for network transfer; Self Improvement receives only persisted document-provider access to the selected tree.

The Android backup plugin:

1. validates that the selected tree belongs to the Google Drive document provider;
2. persists read and write access;
3. writes one timestamped JSON backup per scheduled or manual run;
4. enumerates direct children of the selected tree every time retention runs;
5. recognizes only files with a valid timestamp and the exact `self-improvement-backup-YYYY-MM-DDTHH-mm-ss-SSSZ.json` name;
6. keeps the five newest recognized files and never rotates unrelated files.

Enumeration makes retention independent of SharedPreferences metadata and handles a reselected folder safely. Automatic backup is due once every 24 hours and runs when the Android app opens or resumes.

## Permissions

The release manifest permits only:

- `android.permission.PACKAGE_USAGE_STATS`;
- `android.permission.POST_NOTIFICATIONS`;
- `android.permission.RECEIVE_BOOT_COMPLETED`;
- `android.permission.WAKE_LOCK`;
- `android.permission.health.READ_STEPS`.

CI compares the merged manifest to this exact set. Internet, camera, package installation, exact alarm, Health writes, and other Health reads fail validation.

## Development and delivery

Root scripts target the one app:

```sh
npm run dev
npm run check
npm run lint
npm run test
npm run build
```

Mobile and Capacitor aliases remain available for Android work. There is no deploy script or non-Android deployment target.

Feature work remains uncommitted until local approval and must not run `npm run build` before that approval. GitHub Actions performs app and Android builds, creates signed APK/AAB artifacts for version tags, and publishes the GitHub release. There is no in-app update checker.
