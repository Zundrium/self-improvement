# Self Improvement

An Android self-improvement app with locally stored data for steps, sleep, screen time, fitness, nutrition, meditation, breathing, happiness, and period tracking.

The repository root contains one SvelteKit/Svelte 5 application. Capacitor packages its static output as the Android app. There is no account system, hosted frontend, custom API, analytics, advertising, or remote application database. Optional nutrition analysis calls OpenRouter directly with a user-supplied key stored on the device.

## Architecture

```text
src/ and static/
  SvelteKit SPA + Svelte 5 + Lily UI
  Dexie local state
  tracker entry and local gamification
  optional OpenRouter nutrition analysis
            |
            v
android/
  Capacitor shell and optional camera access
  read-only Health Connect steps
  Android Usage Access
  local notifications
  Google Drive SAF document-provider backups
```

- `src/routes/` contains the app screens and tracker UI.
- `src/lib/local/` owns Dexie state, local mutations, native-data processing, gamification, and JSON backup validation.
- `src/native/` owns Android lifecycle, Health Connect, Usage Access, notifications, signed app updates, file selection, and Google Drive backup integration.
- `src/domain/` validates and transforms native tracker data before it is saved locally.
- `static/` contains bundled fitness media and the privacy policy.
- Root SvelteKit, Vite, TypeScript, and component configuration files configure the app.
- `android/` contains the committed Capacitor Android project and native plugins.
- `capacitor.config.ts` packages `dist-mobile/` into Android.

## Data and backups

Tracker data and settings are stored in the app's on-device IndexedDB database through Dexie. Steps are read from Health Connect. Screen-time and bedtime-adherence data are read from Android Usage Access. Nutrition supports manual entry plus optional photo or description analysis through OpenRouter. The OpenRouter API key is stored in a separate local Dexie database and excluded from application backups.

Profile → Data supports:

- explicit JSON export through the Android document picker;
- validated JSON restore that replaces the current local state;
- an optional user-selected Google Drive folder through Android's Storage Access Framework;
- one automatic backup per day when the app opens or resumes;
- retention of the five newest exact `self-improvement-backup-*.json` files in that folder.

Folder and file selection use the maintained `@capawesome/capacitor-file-picker` plugin. Google Drive access is handled by the installed Drive document provider. Tracker and backup data is never sent to a custom server. Backup rotation ignores unrelated files.

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

Root scripts are canonical. The retained `mobile:*` aliases support existing Android workflows: `mobile:build` writes the static SPA to `dist-mobile/`, `mobile:sync` copies it and the configured Capacitor plugins into `android/`, and `mobile:android:open` opens Android Studio.

The merged release manifest permits Internet for OpenRouter and signed GitHub updates, optional camera access for nutrition photos, package installation for updates, notification support, Usage Access, read-only Steps, wake lock, and boot-completed access for local reminders. Exact alarm, Health write, and unrelated Health read permissions are rejected in CI.

## Validation

```sh
npm run check
npm run lint
npm run test
npm run build
```

Feature work must not run `npm run build` before local approval; the signed release workflow performs the release build.

## Android releases

`.github/workflows/android.yml` validates the app, runs Android tests and lint, checks merged permissions, and builds signed APK and AAB artifacts for `v*` tags. It then creates the public GitHub release. The Android app checks that release feed at launch and resume. A newer signed APK appears as an action candidate; tapping it opens a native confirmation before Android downloads and installs it.

Required GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_CERT_SHA256`

Keep the original release keystore and a tested backup outside GitHub.
