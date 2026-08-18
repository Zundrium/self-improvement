# Project Notes

- The app is SvelteKit/Svelte 5 targeting Cloudflare Workers.
- The D1 binding is `DB`; the database name is `self-improvement-db`.
- Better Auth and Drizzle are created per request from `event.platform.env.DB`.
- Runtime secrets belong in `.dev.vars` locally and Cloudflare secrets remotely.
- Use Lily components under `src/lib/components/ui`; do not add another component system.
- Keep application schemas under `src/lib/server/db` and migrations under `drizzle/`.
- Treat steps, sleep, screen time, fitness, nutrition, meditation, breathing, happiness, and period tracking as trackers.
- Colocate each tracker's pages, APIs, components, and feature logic under `src/routes/(trackers)/<tracker>/`.
- Put each tracker's database schema in `src/lib/server/db/trackers/<tracker>.ts` and export it from `src/lib/server/db/schema.ts`.
- Register every tracker in `src/lib/trackers/registry.ts`; profile visibility and navigation are driven by this registry.
- Keep only genuinely shared logic and components under `src/lib`.
- Run `npm run check`, `npm run lint`, `npm run test`, and `npm run build` before handoff.
