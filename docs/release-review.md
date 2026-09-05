# Release review: v0.40.17

This release replaces date-triggered tracker remounts with in-place GSAP transitions.

## Date navigation

- The root layout preserves registered tracker-page identity across date queries and nutrition log date parameters. Nested workflows retain their existing identity resets; restore still remounts the shell.
- The shared five-day line and completion charts retain date-keyed elements. Earlier dates slide right, later dates slide left, and calendar jumps use bounded travel. Rapid changes retarget from current positions; missing days remain gaps.
- Shared metrics count to their new values, including localized calorie/step totals and screen-time duration changes. Their accessible text exposes the final value rather than every animation frame.
- Tracker sections receive a short directional transition, including newly mounted conditional content. Reduced motion skips or finishes date motion, and component teardown releases tweens, observers and media-query listeners.
- Date-bound save guards prevent late success, failure or cleanup from changing another date's forms, fasting dialogs or completion state. An already committed historical write is still refreshed normally.

## Local validation

- `npm run check`: no errors or warnings.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run test`: 67 files, 281 tests passed.
- `npm run test:browser`: 7 files, 20 Chromium tests passed.
- `git diff --check`: passed.
- Development-app checks verified preserved page/chart elements across all eleven trackers. Scroll remained unchanged across date navigation on scrollable tracker pages. Seeded nutrition data verified intermediate calorie values, keyboard calendar selection, browser Back, and reduced motion in light desktop and dark mobile views. No production build was run locally.

The tag workflow repeats validation on Node 22 and owns the production build, Android tests and lint, permission checks, signing, and GitHub release publication.

## Remaining acceptance work

No physical Android device or emulator was used. Run [the Android smoke-test checklist](android-smoke-test.md) on the signed release, especially rapid date navigation, pending saves, reduced motion, TalkBack and active-session cleanup. This release does not change stored data, backup schemas, permissions or native integrations.
