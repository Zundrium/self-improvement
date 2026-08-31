# Relational Database Implementation Plan

## Goal

Replace the Android `app_state` JSON document with a relational SQLite schema that supports focused reads and writes without assembling, cloning, validating, or serializing the complete application state.

The new database should:

- read only the data required by the active route;
- update only affected rows;
- keep tracker mutations and gamification updates transactional;
- store nutrition images outside JSON;
- support indexed history queries and pagination;
- preserve versioned JSON backup and restore;
- retain a browser-development implementation with equivalent behavior;
- start with a clean database rather than migrate the existing document.

## Current Structure

Android currently stores one row:

```sql
CREATE TABLE app_state (
  id TEXT PRIMARY KEY NOT NULL,
  document TEXT NOT NULL
);
```

The `document` column contains profile, settings, tracker history, nutrition, rewards, achievements, and gamification as one validated JSON object. An in-process cache avoids repeated bridge reads, but every persisted mutation still works with the complete state document.

## Target Architecture

### Runtime boundaries

```text
SvelteKit routes and components
            |
            v
LocalAppService
            |
            v
Focused domain repositories
            |
            v
Database transaction/query adapter
       /                         \
Android SQLite              Browser Dexie
```

`LocalAppService` remains the request-shaped frontend boundary. It must stop depending on `LocalAppState` and instead call focused repository operations.

Repository modules should be organized by domain under `src/lib/local/`:

```text
src/lib/local/database/
  connection.ts
  schema.ts
  transaction.ts
  profile-repository.ts
  tracker-settings-repository.ts
  steps-repository.ts
  sleep-repository.ts
  screen-time-repository.ts
  fitness-repository.ts
  nutrition-repository.ts
  meditation-repository.ts
  breathing-repository.ts
  stretch-repository.ts
  happiness-repository.ts
  period-repository.ts
  gamification-repository.ts
  backup-repository.ts
```

These can be small functions over a shared transaction object; a class per table is not required.

## SQLite Schema

The Android SQLite plugin enables foreign-key constraints when it opens the database. Keep its default journal mode; `PRAGMA journal_mode = WAL` returns a row on Android SQLCipher and must not be sent through the plugin's mutation-only `execute` path.

Use ISO-8601 strings for local dates and instants unless a measured query requires integer epoch timestamps.

### Profile and tracker visibility

```sql
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE enabled_trackers (
  tracker_id TEXT PRIMARY KEY NOT NULL,
  position INTEGER NOT NULL
);
```

`tracker_id` is validated in TypeScript against the tracker registry. `position` preserves user-facing order if ordering becomes configurable.

### Tracker settings

Use domain-specific tables rather than a nullable generic settings table.

```sql
CREATE TABLE steps_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_goal INTEGER NOT NULL
);

CREATE TABLE sleep_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  bedtime TEXT NOT NULL,
  reminders_enabled INTEGER NOT NULL CHECK (reminders_enabled IN (0, 1))
);

CREATE TABLE screen_time_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_limit_minutes INTEGER NOT NULL
);

CREATE TABLE fitness_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_sets INTEGER NOT NULL
);

CREATE TABLE fitness_exercise_speeds (
  exercise_id INTEGER PRIMARY KEY,
  speed_percent INTEGER NOT NULL
);

CREATE TABLE nutrition_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  weight_kg REAL NOT NULL,
  height_cm REAL NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  activity_level TEXT NOT NULL,
  daily_calorie_goal INTEGER NOT NULL,
  goal_mode TEXT NOT NULL,
  eating_window_enabled INTEGER NOT NULL CHECK (eating_window_enabled IN (0, 1)),
  eating_window_start TEXT NOT NULL,
  eating_window_end TEXT NOT NULL
);

CREATE TABLE meditation_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_duration_seconds INTEGER NOT NULL
);

CREATE TABLE breathing_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  rounds INTEGER NOT NULL,
  include_hold INTEGER NOT NULL CHECK (include_hold IN (0, 1))
);

CREATE TABLE stretch_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  hold_seconds INTEGER NOT NULL
);

CREATE TABLE stretch_difficulties (
  activity_id TEXT PRIMARY KEY,
  difficulty TEXT NOT NULL
);

CREATE TABLE happiness_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_rating INTEGER NOT NULL
);

CREATE TABLE period_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_flow TEXT NOT NULL,
  fallback_cycle_days INTEGER NOT NULL
);
```

### Steps

```sql
CREATE TABLE step_days (
  local_date TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  source_end_at TEXT NOT NULL
);

CREATE INDEX step_days_source_end_idx ON step_days(source_end_at);
```

### Sleep

```sql
CREATE TABLE sleep_days (
  local_date TEXT PRIMARY KEY,
  configured_bedtime TEXT NOT NULL,
  window_start_at TEXT,
  window_end_at TEXT,
  late_usage_seconds INTEGER NOT NULL,
  latest_screen_activity_at TEXT,
  status TEXT NOT NULL,
  source_timestamp TEXT
);

CREATE TABLE sleep_apps (
  local_date TEXT NOT NULL,
  package_name TEXT NOT NULL,
  name TEXT NOT NULL,
  seconds INTEGER NOT NULL,
  violating INTEGER NOT NULL CHECK (violating IN (0, 1)),
  PRIMARY KEY (local_date, package_name),
  FOREIGN KEY (local_date) REFERENCES sleep_days(local_date) ON DELETE CASCADE
);

CREATE INDEX sleep_days_status_date_idx ON sleep_days(status, local_date DESC);
```

### Screen time

```sql
CREATE TABLE tracked_packages (
  package_name TEXT PRIMARY KEY
);

CREATE TABLE screen_time_days (
  local_date TEXT PRIMARY KEY,
  total_minutes INTEGER NOT NULL,
  source_timestamp TEXT NOT NULL
);

CREATE TABLE screen_time_apps (
  local_date TEXT NOT NULL,
  package_name TEXT NOT NULL,
  name TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  last_used_at TEXT NOT NULL,
  PRIMARY KEY (local_date, package_name),
  FOREIGN KEY (local_date) REFERENCES screen_time_days(local_date) ON DELETE CASCADE
);

CREATE INDEX screen_time_apps_package_date_idx
  ON screen_time_apps(package_name, local_date DESC);
```

### Fitness

```sql
CREATE TABLE fitness_completions (
  workout_id INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (workout_id, local_date)
);

CREATE INDEX fitness_completions_date_idx ON fitness_completions(local_date DESC);
```

The static fitness program remains bundled source data and is not copied into SQLite.

### Nutrition

```sql
CREATE TABLE nutrition_entries (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL,
  name TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  ingredient_count INTEGER NOT NULL
);

CREATE TABLE nutrition_meals (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  media_id TEXT,
  calories INTEGER NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  ingredient_count INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES nutrition_entries(id) ON DELETE CASCADE
);

CREATE TABLE nutrition_ingredients (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  calories REAL NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  notes TEXT NOT NULL,
  FOREIGN KEY (meal_id) REFERENCES nutrition_meals(id) ON DELETE CASCADE
);

CREATE TABLE nutrition_media (
  id TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  relative_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE nutrition_fasting_dates (
  local_date TEXT PRIMARY KEY
);

CREATE INDEX nutrition_entries_date_created_idx
  ON nutrition_entries(local_date DESC, created_at DESC);
CREATE INDEX nutrition_meals_entry_position_idx
  ON nutrition_meals(entry_id, position);
CREATE INDEX nutrition_ingredients_meal_position_idx
  ON nutrition_ingredients(meal_id, position);
```

Images should be stored as files in app-private storage. SQLite stores only media metadata and a relative path. Deleting a meal must delete unreferenced media after its database transaction commits. A failed transaction must leave the existing file reference intact.

Browser development can store the equivalent media as `Blob` values in a Dexie media table.

### Meditation, breathing, stretch, happiness, and period

```sql
CREATE TABLE meditation_sessions (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  started_at INTEGER NOT NULL
);

CREATE TABLE breathing_exercises (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL,
  technique TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  started_at INTEGER NOT NULL
);

CREATE TABLE stretch_sessions (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL,
  hold_seconds INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  hard_variation_completed INTEGER NOT NULL DEFAULT 0
    CHECK (hard_variation_completed IN (0, 1))
);

CREATE TABLE happiness_entries (
  local_date TEXT PRIMARY KEY,
  rating INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE happiness_reasons (
  local_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (local_date, reason),
  FOREIGN KEY (local_date) REFERENCES happiness_entries(local_date) ON DELETE CASCADE
);

CREATE TABLE period_entries (
  local_date TEXT PRIMARY KEY,
  flow TEXT NOT NULL,
  notes TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX meditation_sessions_date_idx ON meditation_sessions(local_date DESC);
CREATE INDEX breathing_exercises_date_idx ON breathing_exercises(local_date DESC);
CREATE INDEX stretch_sessions_date_idx ON stretch_sessions(local_date DESC);
```

### Gamification, achievements, and rewards

```sql
CREATE TABLE gamification_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  started_local_date TEXT NOT NULL
);

CREATE TABLE gamification_awards (
  tracker_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  points INTEGER NOT NULL,
  PRIMARY KEY (tracker_id, local_date)
);

CREATE TABLE achievement_unlocks (
  achievement_id TEXT PRIMARY KEY,
  unlocked_at TEXT NOT NULL
);

CREATE TABLE rewards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  price INTEGER NOT NULL
);

CREATE TABLE redemptions (
  id TEXT PRIMARY KEY,
  reward_id TEXT,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  price INTEGER NOT NULL,
  redeemed_at TEXT NOT NULL,
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE SET NULL
);

CREATE INDEX awards_date_idx ON gamification_awards(local_date DESC);
CREATE INDEX redemptions_date_idx ON redemptions(redeemed_at DESC);
```

Redemptions retain the reward name, emoji, and price snapshot so deleting or editing a reward does not rewrite history.

### Native synchronization status

Synchronization status is operational metadata rather than a secret and can move from secure storage into SQLite:

```sql
CREATE TABLE native_sync_status (
  tracker_id TEXT PRIMARY KEY,
  permission TEXT NOT NULL,
  outcome TEXT NOT NULL,
  last_attempt_at TEXT,
  last_success_at TEXT,
  failure_category TEXT,
  failure_message TEXT
);
```

The OpenRouter API key remains outside the application database and backups.

## Query Model

Routes should request focused response models rather than a complete state snapshot.

Examples:

- Steps page: settings plus the latest seven `step_days` rows.
- Sleep page: one `sleep_days` row and its `sleep_apps` rows.
- Nutrition log: entries for one date, without ingredient details until an entry is opened.
- Achievements: compact aggregate queries and paginated achievement summaries.
- Profile: profile, enabled trackers, and settings only.
- Backup: the only operation allowed to assemble every domain.

Use `LIMIT`, indexed date ranges, and explicit ordering for all history queries.

## Transaction Model

Every user mutation should have one domain transaction:

```text
begin transaction
  read the affected completion state
  insert/update/delete affected domain rows
  calculate the new completion state
  add missing gamification award if completion changed
  reconcile achievements affected by this mutation
commit
emit completion and gamification events
```

Do not notify the UI before commit. Failed transactions must not update in-memory UI baselines or emit completion events.

Native synchronization should use one transaction per tracker payload. A failure in Sleep processing must not roll back a successful Steps transaction.

## Gamification and Achievement Evaluation

The existing achievement catalog remains source code. Replace whole-state evaluation with compact database snapshots and aggregate queries.

Examples:

```sql
SELECT COUNT(*) FROM fitness_completions;
SELECT MAX(count) FROM step_days;
SELECT SUM(duration_seconds) FROM meditation_sessions;
SELECT COUNT(DISTINCT local_date) FROM nutrition_entries;
```

Cross-tracker achievements should query completion dates through a shared completion projection rather than loading all tracker records.

A useful internal model is:

```ts
type CompletionProjection = {
  trackerId: AppTrackerId;
  localDate: string;
};
```

This projection can be produced through a SQL view or repository query. Keep tracker-specific completion rules in TypeScript when SQL would make them difficult to understand.

## Backup and Restore

Keep backups as versioned JSON; do not expose the SQLite file as the backup format.

### Export

1. Open a consistent read transaction.
2. Read each domain table in deterministic order.
3. Read referenced nutrition media files.
4. Encode media only in the export envelope.
5. Validate the complete envelope before writing it.

### Restore

1. Parse and validate the complete envelope before opening a write transaction.
2. Stage media files under temporary names.
3. Begin one SQLite transaction.
4. Delete existing rows in foreign-key-safe order.
5. Insert validated rows.
6. Commit the database transaction.
7. Atomically promote staged media files.
8. Remove obsolete media files.
9. Reload the application.

Introduce backup envelope version 2. Because data migration is not required, version 1 backups may be rejected with a clear message. If compatibility is later desired, implement an isolated v1-to-v2 backup converter rather than adding legacy handling to repositories.

## Clean-Slate Rollout

No document-to-table migration is required.

Recommended rollout:

1. Create the production database as `self-improvement-local-v2`.
2. Initialize the schema transactionally, then insert missing singleton defaults on the same connection.
3. Keep browser development on a separately versioned Dexie schema.
4. Do not add legacy-database cleanup before the first public installation.

No document-state migration is needed because the relational release predates public installation.

## Browser Development

Browser behavior should match Android behavior through repository contracts, not through a reconstructed `LocalAppState` document.

Dexie should use equivalent stores and compound indexes. For example:

```ts
this.version(2).stores({
  profile: 'id',
  enabledTrackers: 'trackerId, position',
  stepDays: 'localDate, sourceEndAt',
  sleepDays: 'localDate, [status+localDate]',
  sleepApps: '[localDate+packageName], localDate',
  nutritionEntries: 'id, [localDate+createdAt]',
  nutritionMeals: 'id, [entryId+position]',
  nutritionIngredients: 'id, [mealId+position]',
  nutritionMedia: 'id',
  achievementUnlocks: 'achievementId, unlockedAt'
});
```

Android and browser adapters must pass the same repository contract tests.

## Implementation Phases

### Phase 1: Database foundation

- Add SQLite and Dexie connection adapters.
- Add schema creation and clean initialization.
- Add transaction primitives.
- Add repository contract tests that run against fake IndexedDB and a SQLite test adapter.
- Keep the existing app-state store temporarily available behind its current API.

### Phase 2: Profile and settings

- Move profile, enabled trackers, and all tracker settings.
- Update bootstrap and settings service methods.
- Remove profile/settings reads from `LocalAppState`.

### Phase 3: Tracker history

- Move Steps, Sleep, Screen time, Fitness, Meditation, Breathing, Stretch, Happiness, and Period.
- Update native payload ingestion to use tracker-specific transactions.
- Add indexed day-range and pagination tests.

### Phase 4: Nutrition and media

- Add entry, meal, ingredient, fasting-date, and media repositories.
- Add app-private media file integration.
- Remove runtime base64 images from database responses except where OpenRouter requires an encoded request.
- Verify deletion, restore, and orphan cleanup.

### Phase 5: Gamification

- Add awards, achievement unlocks, rewards, and redemptions.
- Replace full-state completion comparison with affected-tracker transaction logic.
- Replace whole-state achievement evaluation with aggregate snapshots.

### Phase 6: Backup and removal

- Add backup version 2 export and restore.
- Remove `LocalAppState`, the `app_state` table, cache logic, and document validation.
- Remove obsolete secure sync-status storage.
- Add clean-slate initialization and old-database cleanup.

### Phase 7: Device validation and release

- Measure cold launch, resume, navigation, tracker saves, nutrition saves, and backup time.
- Verify database size and media cleanup after repeated use.
- Run the full Svelte and Android validation workflow.
- Release only after physical-device checks confirm tracker synchronization and restore behavior.

## Testing Requirements

### Repository contracts

Each repository must test:

- empty/default state;
- create, read, update, and delete behavior;
- deterministic ordering;
- date-range boundaries;
- uniqueness and foreign-key behavior;
- rollback after a failed mutation;
- parity between Android and browser adapters.

### Integration tests

Cover:

- bootstrap without reading tracker history;
- one tracker mutation without rewriting unrelated domains;
- native tracker payload processing;
- completion award idempotency;
- achievement unlock persistence;
- nutrition entry deletion with media cleanup;
- backup round trip;
- invalid restore leaving the current database untouched;
- clean initialization after upgrading from the document database.

### Performance checks

Record at minimum:

- number of SQLite bridge calls per route;
- rows and bytes returned per query;
- cold-start database initialization time;
- route load time with one year of tracker history;
- nutrition log load time with hundreds of entries;
- save latency while native synchronization is active;
- backup duration and output size.

No normal route should query every tracker table or load full-resolution nutrition media.

## Acceptance Criteria

- No `app_state` JSON document remains on Android or in browser persistence.
- Normal page loads execute only domain-specific queries.
- A tracker save updates only related rows plus affected gamification rows.
- Nutrition images are stored as files or blobs, never duplicated base64 strings.
- History queries are indexed and bounded.
- Disabled trackers do not perform native synchronization.
- Backup export and restore remain transactional and versioned.
- Android and browser repository contract tests pass.
- `npm run check`, `npm run lint`, and `npm run test` pass.
- Android tests, lint, merged-permission validation, signing, and packaging pass.
- Physical-device profiling shows no database-related long tasks during ordinary navigation.

## Primary Files to Replace or Refactor

- `src/lib/local/state.ts`
- `src/lib/local/service.ts`
- `src/lib/local/backup.ts`
- `src/lib/local/native-processing.ts`
- `src/lib/local/gamification.ts`
- `src/lib/local/achievement-engine.ts`
- `src/lib/local/nutrition.ts`
- `src/lib/api.ts`
- `src/native/android-data.ts`
- `src/native/secure-repository.ts`
- `src/routes/**/+page.ts`
- `android/app/src/main/java/com/zuncreative/selfimprovement/`
