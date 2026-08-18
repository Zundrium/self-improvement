# Project Notes

- The project has two SvelteKit/Svelte 5 applications: an API-only Cloudflare Worker under `src/` and the complete Android frontend under `mobile/`.
- The D1 binding is `DB`; the database name is `self-improvement-db`.
- Better Auth and Drizzle are created per request from `event.platform.env.DB`.
- Runtime secrets belong in `.dev.vars` locally and Cloudflare secrets remotely.
- Use Lily components under `src/lib/components/ui`; do not add another component system.
- Keep application schemas under `src/lib/server/db` and migrations under `drizzle/`.
- Treat steps, sleep, screen time, fitness, nutrition, meditation, breathing, happiness, and period tracking as trackers.
- Colocate each tracker's Android pages, components, and client logic under `mobile/src/routes/<tracker>/`.
- Expose authenticated frontend data and mutations under `src/routes/api/app/`; keep server-only tracker logic under `src/routes/(trackers)/<tracker>/`.
- Put each tracker's database schema in `src/lib/server/db/trackers/<tracker>.ts` and export it from `src/lib/server/db/schema.ts`.
- Register every tracker in `src/lib/trackers/registry.ts` and `mobile/src/lib/trackers/registry.ts`; profile visibility and Android navigation are driven by this registry.
- Keep Cloudflare code free of page components and static frontend assets; `self.zund.cc` exposes API responses only.
- Keep only genuinely shared frontend logic and components under `mobile/src/lib`.
- After each successful push of a new project commit, follow `.pi/skills/release-after-push/SKILL.md` to publish the next pre-1.0 signed Android release.
- Run `npm run check`, `npm run lint`, `npm run test`, and `npm run build` before handoff.
