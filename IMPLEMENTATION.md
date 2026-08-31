# Local Data Android Implementation

## Goal

Self Improvement is one SvelteKit/Svelte 5 application packaged for Android with Capacitor. All tracker behavior and persistent state are local. The project has no authentication, backend, custom data API, AI service, or hosted web target. Its only direct network request checks public GitHub releases for signed app updates.

## Runtime boundary

The repository root contains the complete application under `src/` and `static/`:

- dashboard, profile, gamification, rewards, and tracker screens;
- Lily UI components and bundled media;
- local endpoint-compatible reads and mutations;
- Dexie state and backup validation;
- native data collection and on-device processing;
- JSON export, restore, and optional Google Drive SAF backup controls.

The static adapter writes `dist-mobile/`. `capacitor.config.ts` and `android/` package that output into the Android app.

## Local state

`src/lib/local/database/schema.ts` defines the normalized SQLite schema with Drizzle. Android stores profile, settings, tracker history, nutrition, gamification, rewards, and synchronization status in focused relational tables. Browser development uses equivalent Dexie tables, including Blob-backed nutrition media.

`src/lib/local/state.ts` maps domain projections to those tables and serializes relational transactions. Normal routes read only their required domains, while backup and gamification operations can assemble broader validated projections. Tracker mutations persist their domain rows and affected gamification rows in one transaction.

`src/lib/local/service.ts` preserves the existing loader and mutation call shape without making HTTP requests. `src/lib/api.ts` dispatches directly to that service. There are no credentials or sessions.

## Native tracker processing

- Steps use read-only Health Connect `READ_STEPS` access.
- Sleep and screen time use Android Usage Access.
- Native payloads are validated, transformed, and written to Android SQLite or the browser Dexie adapter in tracker-specific transactions.
- Trackers process independently so denied access for one source does not block the others.
- Bounded permission, validation, and native-provider failures are retained on-device for troubleshooting.
- Stale data is processed when the app opens or resumes and can be refreshed manually.
- Bedtime adherence evaluates selected app activity during the four hours after the configured bedtime.

No tracker payload is uploaded or sent to a server.

## Nutrition

Nutrition is manual-only. The create and edit screens share the Lily-based `EntryEditor` fields for date, time, name, notes, meals, ingredients, quantities, units, calories, protein, carbohydrates, and fat. Entries are saved locally through an endpoint-compatible create mutation. Edit, delete, fasting, calorie goals, eating windows, and nutrition settings remain local and available.

The app has no camera surface, photo storage, AI estimate, or correction flow.

## Backups

`src/lib/local/backup.ts` exports the relational domains as a version 2 JSON envelope and validates the complete envelope before a transactional restore. Version 1 document backups are rejected with a clear compatibility message.

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

- `android.permission.INTERNET`;
- `android.permission.PACKAGE_USAGE_STATS`;
- `android.permission.POST_NOTIFICATIONS`;
- `android.permission.RECEIVE_BOOT_COMPLETED`;
- `android.permission.REQUEST_INSTALL_PACKAGES`;
- `android.permission.WAKE_LOCK`;
- `android.permission.health.READ_STEPS`.

CI compares the merged manifest to this exact set. Internet and package installation support the signed GitHub updater. Camera, exact alarm, Health writes, and other Health reads fail validation.

## Development and delivery

Root scripts target the one app:

```sh
npm run dev
npm run check
npm run lint
npm run test
npm run build
```

The `mobile:*` compatibility aliases and `cap:*` Capacitor aliases remain available for Android work. There is no deploy script or non-Android deployment target.

Feature work remains uncommitted until local approval and must not run `npm run build` before that approval. GitHub Actions performs app and Android builds, creates signed APK/AAB artifacts for version tags, and publishes the GitHub release.

The Android updater reads the repository's public latest-release endpoint. When the semantic version is newer and the release includes the expected GitHub APK asset, Today shows an update action candidate. Tapping it opens a native confirmation, downloads through Android's DownloadManager, requests per-app installation access when needed, and hands the APK to Android's package installer. Android enforces signing-key continuity before replacing the installed app.
