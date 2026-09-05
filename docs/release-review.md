# Release review: v0.40.15

The Codex changes reorganize shared components and domain contracts, harden local storage and backup operations, and improve startup, native synchronization, forms, session cleanup and manual nutrition entry. The detailed implementation scope and remaining work are in [the improvement report](../improvement_list.md).

## Regressions found and fixed during release review

- **Nutrition photo reads:** indexed entry/day reads decoded Blob data inside an IndexedDB read transaction. Real Chromium rejected a large-photo read with `PrematureCommitError`. Row and Blob selection now finishes within the snapshot; conversion to application data happens afterward while the store operation remains serialized. `tests/browser/nutrition-storage.test.ts` covers both entry and day reads.
- **Typed mutation refresh:** typed nutrition operations bypassed the legacy client's change event, leaving shared progress stale when an edit completed without navigation. Successful typed mutations now publish the same event once; reads and rejected writes do not. `src/lib/api-operations.test.ts` covers this contract.
- **Deferred native home cards:** loader invalidation replaced asynchronously loaded update/permission cards with the loader's empty placeholder, while their fetch ran only on mount. The home page now keeps native cards separate from local loader results and refreshes them when the bootstrap tracker projection changes. `tests/browser/home-feed.test.ts` covers refresh without remounting.

Each regression test failed before its fix and passed afterward. Existing tests are retained. The release workflow also runs formatting and mounted Chromium tests before packaging Android.

## Local validation

- `npm run check`: no errors or warnings.
- `npm run lint` and `npm run format:check`: 463 files passed.
- `npm run test`: 59 files, 236 tests passed.
- `npm run test:browser`: 6 files, 15 Chromium tests passed.
- `git diff --check`: passed.

Local validation used Node 25.9.0. The tag workflow repeats validation on Node 22 and owns the production build, Android tests/lint, permission checks, signing and publication. No local production build or build-dependent Capacitor command was run.

## Remaining acceptance work

No Android device or emulator was available for this review. Run [the Android smoke-test checklist](android-smoke-test.md) on the signed release, especially secure-key migration, camera access, background sessions, Back navigation, SAF providers and restoration.

The storage changes test transaction failures and in-session media rollback, not crash-atomic recovery after process termination. Backups retain the 25 MiB limit; larger photo histories and browser multi-tab write coordination remain follow-up work. This release does not add a schema version or remote application database.
