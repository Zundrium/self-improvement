# Project Notes

- The app is SvelteKit/Svelte 5 targeting Cloudflare Workers.
- The D1 binding is `DB`; the database name is `self-improvement-db`.
- Better Auth and Drizzle are created per request from `event.platform.env.DB`.
- Runtime secrets belong in `.dev.vars` locally and Cloudflare secrets remotely.
- Use Lily components under `src/lib/components/ui`; do not add another component system.
- Keep application schemas under `src/lib/server/db` and migrations under `drizzle/`.
- Colocate each subproject's pages, components, and feature-specific logic in its route folder; keep only genuinely shared logic under `src/lib`.
- Run `npm run check`, `npm run lint`, `npm run test`, and `npm run build` before handoff.
