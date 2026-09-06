# Release review: v0.43.2

This patch changes the breathing sphere's phase labels and completion checkmark from white to dark text (80% black) in both themes. The bright sphere palette, hold animation, phase timing and timer are unchanged.

## Local validation

- `npm run check`: no errors or warnings.
- `npm run lint` and `npm run format:check`: passed.
- `npm run test`: 69 files, 296 tests passed.
- `npm run test:browser`: 9 files, 33 Chromium tests passed, including dark sphere foreground in light and dark modes.
- `git diff --check`: passed.

No production build was run locally. The approved tag workflow repeats validation on Node 22 and owns the production build, Android tests and lint, permission checks, signing, and GitHub release publication.

## Remaining acceptance work

No physical Android device or emulator was used. Run [the Android smoke-test checklist](android-smoke-test.md) on the signed release. No stored data, backup schemas, permissions or native integrations change.
