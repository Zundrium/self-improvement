# Project Notes

- The repository root contains the single SvelteKit/Svelte 5 application with locally stored data, packaged for Android with Capacitor under `android/`.
- Use Lily components under `src/lib/components/ui`; do not add another component system.
- Keep tracker pages, components, and client logic under `src/routes/<tracker>/`.
- Treat steps, sleep, screen time, fitness, nutrition, meditation, breathing, happiness, and period tracking as trackers.
- Register every tracker in `src/lib/trackers/registry.ts`; profile visibility and Android navigation are registry-driven.
- Keep Dexie state, local mutations, backup schemas, and native payload processing under `src/lib/local/`.
- Keep Android integrations under `src/native/` and native Java code under `android/app/src/main/java/com/zuncreative/selfimprovement/`.
- The app has no account, backend, analytics, ads, or AI service. Its only custom network request is the public GitHub release check used by the Android updater.
- Nutrition is manual-only. Do not add camera, photo-analysis, or AI correction flows.
- Backups are versioned JSON exports/restores. Optional daily Google Drive backups use a user-selected SAF tree and retain no more than five exact app backup files.
- Preserve Internet and package-install access only for signed GitHub updates. Never add camera, Health write, unrelated Health read, or exact-alarm permissions. Preserve notifications, Usage Access, and read-only Steps.
- Root scripts target the mobile app. Keep useful `mobile:*` and Capacitor aliases; do not add web deployment scripts.
- Use `.pi/skills/feature-development/SKILL.md` for feature work. Keep changes uncommitted until local approval, then use the signed GitHub Android release flow after a successful push.
- Run `npm run check`, `npm run lint`, and `npm run test` before handoff. Do not run `npm run build` before local approval.
