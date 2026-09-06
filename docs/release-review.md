# Release review: v0.43.1

This patch adjusts the breathing hold sphere and matches completed home-card backgrounds to other cards.

## Visual corrections

- The inner breathing hold sphere now fills the outer blue sphere at scale 1, rather than stopping at 60% of its diameter. It still grows during hold and shrinks to scale 0 during exhale. The blue sphere retains its existing 0.42 resting/exhale scale and phase timing.
- Completed and rest cards use the same base background as other home cards, without a gradient or an extra gray tint. Muted text and completion checkmarks remain.
- No tracker logic, stored data, backup schemas, permissions or native integrations change.

## Local validation

- `npm run check`: no errors or warnings.
- `npm run lint` and `npm run format:check`: passed.
- `npm run test`: 69 files, 296 tests passed.
- `npm run test:browser`: 9 files, 31 Chromium tests passed. Coverage verifies equal sphere diameters at full hold, inner scale 0 with blue scale 0.42 after exhale, reduced motion, skipped hold, and matching card surfaces in both themes.
- `git diff --check`: passed.
- Existing development server reused at `http://127.0.0.1:5174`; a real mobile-width breathing cycle was inspected through hold and exhale.

No production build was run locally. The approved tag workflow repeats validation on Node 22 and owns the production build, Android tests and lint, permission checks, signing, and GitHub release publication.

## Remaining acceptance work

No physical Android device or emulator was used. Run [the Android smoke-test checklist](android-smoke-test.md) on the signed release, especially breathing animation and updating from the preceding release.
