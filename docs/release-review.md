# Release review: v0.43.0

This minor release makes the home page a persistent overview of every enabled tracker.

## Tracker status cards

- Every tracker owns a baseline status candidate, including Steps and Period. Contextual priority, scores and conflicts remain, with exactly one local card per enabled tracker.
- Completed trackers stay visible on a neutral gray surface with a checkmark. Rest days use the same quiet surface without claiming completion. Tracker labels distinguish otherwise similar cards.
- Steps show remaining steps or goal completion. Excess calories stay visible as a warning rather than a completion or meal prompt. Missing data and ongoing screen-time tracking are not treated as completion.
- The registry distinguishes active trackers from passive Steps, Sleep and Screen time. It only breaks tied baseline scores; existing contextual priorities are preserved.
- Native blocking guidance still replaces the affected local card. Disabled trackers stay hidden. No stored data, backup, gamification, permission or native schema changes are needed.

## Local validation

- `npm run check`: no errors or warnings.
- `npm run lint` and `npm run format:check`: passed.
- `npm run test`: 69 files, 296 tests passed.
- `npm run test:browser`: 8 files, 28 Chromium tests passed, including completed/rest/attention/actionable cards in light and dark modes and keyboard focus.
- `git diff --check`: passed.
- Existing development server reused at `http://127.0.0.1:5174`; mobile-width home check rendered all eleven tracker cards.

No production build was run locally. The approved tag workflow repeats validation on Node 22 and owns the production build, Android tests and lint, permission checks, signing, and GitHub release publication.

## Remaining acceptance work

No physical Android device or emulator was used. Run [the Android smoke-test checklist](android-smoke-test.md) on the signed release, especially tracker completion refresh, native permission cards and updating from the preceding release.
