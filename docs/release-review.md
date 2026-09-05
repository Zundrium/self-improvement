# Release review: v0.41.0

This release replaces positional tracker-section transitions with a simple fade when changing dates.

## Date navigation

- Shared sections now animate opacity only. Circular progress and other content stay in place instead of shifting sideways, and fade cleanup does not clear transforms.
- The five-day charts still slide right for earlier dates and left for later dates. Numbers and progress values still animate in place.
- Persistent page identity, scroll/focus preservation, reduced motion and date-bound save guards are unchanged.
- Chromium regression coverage checks that existing and newly mounted sections fade without transforms, and that circular progress keeps the same horizontal position during and after both navigation directions.

## Local validation

- `npm run check`: no errors or warnings.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run test`: 67 files, 281 tests passed.
- `npm run test:browser`: 7 files, 20 Chromium tests passed.
- `git diff --check`: passed.

No production build was run locally. The tag workflow repeats validation on Node 22 and owns the production build, Android tests and lint, permission checks, signing, and GitHub release publication.

## Remaining acceptance work

No physical Android device or emulator was used. Run [the Android smoke-test checklist](android-smoke-test.md) on the signed release, especially date navigation and reduced motion. This release does not change stored data, backup schemas, permissions or native integrations.
