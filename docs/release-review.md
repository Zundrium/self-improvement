# Release review: v0.40.16

This release standardizes tracker action rules and tracker-page composition so new trackers have explicit, compiler-checked integration points.

## Tracker architecture

- Action candidates now use `defineActionCandidate`. The factory owns enabled-tracker requirements, condition composition, the default tracker icon, and stable per-instance IDs.
- Reusable conditions cover tracker-state predicates, local-day matching, and local-time boundaries. Candidate resolvers now focus on presentation and navigation.
- `trackerActionCandidates` is a complete `AppTrackerId` record. Period tracking has an intentional empty registration, so adding a tracker can no longer leave action registration silently incomplete.
- Candidate attribution and extra enabled-tracker requirements are separate contracts. Sleep setup remains attributed to Sleep and available when the standalone Screen time tracker is hidden.
- Main tracker pages now compose their content only from reusable `*Section` components and the `TrackerSections` layout container. A Svelte AST test enforces the rule for every registered app tracker.

The implementation checklist and ownership rules are documented in [the architecture guide](architecture.md).

## Local validation

- `npm run check`: no errors or warnings.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run test`: 63 files, 252 tests passed.
- `npm run test:browser`: 6 files, 15 Chromium tests passed.
- `git diff --check`: passed.

The tag workflow repeats validation on Node 22 and owns the production build, Android tests and lint, permission checks, signing, and GitHub release publication. No local production build or build-dependent Capacitor command was run.

## Remaining acceptance work

No Android device or emulator was used for this review. Run [the Android smoke-test checklist](android-smoke-test.md) on the signed release. The release changes composition and maintainability contracts; it does not change stored data, backup schemas, Android permissions, or native integrations.
