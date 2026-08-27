# Self Improvement

A local-only Android self-improvement app for steps, sleep, screen time, fitness, nutrition, meditation, breathing, happiness, and period tracking.

The repository contains one SvelteKit/Svelte 5 application under `mobile/`. Capacitor packages its static output as the Android app. There is no account system, hosted frontend, custom API, analytics, advertising, or remote application database.

## Architecture

```text
mobile/
  SvelteKit SPA + Svelte 5 + Lily UI
  Dexie local state
  manual tracker entry and local gamification
            |
            v
android/
  Capacitor shell
  read-only Health Connect steps
  Android Usage Access
  local notifications
  Google Drive SAF document-provider backups
```

- `mobile/src/routes/` contains the app screens and tracker UI.
- `mobile/src/lib/local/` owns Dexie state, local mutations, native-data processing, gamification, and JSON backup validation.
- `mobile/src/native/` owns Android lifecycle, Health Connect, Usage Access, notifications, file selection, and Google Drive backup integration.
- `mobile/src/domain/` validates and transforms native tracker data before it is saved locally.
- `mobile/static/` contains bundled fitness media and the privacy policy.
- `android/` contains the committed Capacitor Android project and native plugins.
- `capacitor.config.ts` packages `dist-mobile/` into Android.

## Data and backups

Tracker data and settings are stored in the app's on-device IndexedDB database through Dexie. Steps are read from Health Connect. Screen-time and bedtime-adherence data are read from Android Usage Access. Nutrition is entered manually; the app does not use a camera, photo analysis, or AI.

Profile → Data supports:

- explicit JSON export through the Android document picker;
- validated JSON restore that replaces the current local state;
- an optional user-selected Google Drive folder through Android's Storage Access Framework;
- one automatic backup per day when the app opens or resumes;
- retention of the five newest exact `self-improvement-backup-*.json` files in that folder.

Folder and file selection use the maintained `@capawesome/capacitor-file-picker` plugin. Google Drive access is handled by the installed Drive document provider. The app has no internet permission and cannot contact a custom server. Backup rotation ignores unrelated files.

## Local setup

Install Node.js 22 and dependencies:

```sh
npm install
npm run dev
```

The development app is served at `http://localhost:5173`. Browser development uses the same local Dexie-backed app but does not provide Android-only Health Connect, Usage Access, notifications, or scheduled Drive backups.

## Android development

Install Java 21 and Android Studio with Android platform 36, build tools, and platform tools.

```sh
npm run mobile:check
npm run mobile:build
npm run mobile:sync
npm run mobile:android
```

`mobile:build` writes the static SPA to `dist-mobile/`. `mobile:sync` copies it and the configured Capacitor plugins into `android/`. `mobile:android:open` opens Android Studio.

The merged release manifest is limited to notification support, Usage Access, read-only Steps, wake lock, and boot-completed access for local reminders. Internet, camera, package installation, exact alarm, Health write, and unrelated Health read permissions are rejected in CI.

## Validation

```sh
npm run check
npm run lint
npm run test
npm run build
```

Feature work must not run `npm run build` before local approval; the signed release workflow performs the release build.

## Android releases

`.github/workflows/android.yml` validates the app, runs Android tests and lint, checks merged permissions, and builds signed APK and AAB artifacts for `v*` tags. It then creates the GitHub release. The app does not check for or install updates itself.

Required GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_CERT_SHA256`

Keep the original release keystore and a tested backup outside GitHub.
