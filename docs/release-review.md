# Release review: v0.42.0

This minor release lengthens the tracker-section fade-in to one second when changing dates.

## Date navigation

- Each shared section now fades in over one second instead of 450 milliseconds. Existing and newly mounted sections use the same duration.
- The fade remains opacity-only. Circular progress and other content stay in place, and fade cleanup does not clear transforms.
- The five-day charts still slide right for earlier dates and left for later dates. Numbers and progress values still animate in place.
- Persistent page identity, scroll/focus preservation, reduced motion and date-bound save guards are unchanged.
- Chromium regression coverage checks the one-second duration for existing and newly mounted sections, their lack of transforms, and the stationary circular progress during both navigation directions.

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
