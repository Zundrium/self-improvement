# Architecture

The repository is one SvelteKit/Svelte 5 application packaged for Android. URLs and tracker ownership stay under `src/routes/<tracker>/`; the tracker registry controls discovery, visibility, and navigation. Lily remains the only UI component system.

```text
src/
  routes/
    +layout.svelte                 App composition, startup recovery, theme and lifecycle
    +page.svelte                   Home composition
    components/                    Home-only ActionFeed and ActionFeedItem
    <tracker>/                     Tracker screens, forms, action rules and client workflows
      actions.ts
      components/                  Reusable, route-owned tracker sections
      settings/
    nutrition/
      draft.ts                     Editable draft and immutable save snapshots
      workflow.ts                  Request lifetime, cancellation and deadlines
      ai/                          Optional OpenRouter adapter
  lib/
    app/                           Aggregate contracts, candidate composition, refresh and restore
    components/
      ui/                          Existing Lily primitives
      app/                         Navigation, drawer, theme, audio controls, PageActionBar
      tracker/                     TrackerPage, section shells, history and date presentation
      forms/                       SettingsSaveBar and WorkflowHeader presentation
      metrics/                     Metric rows, stats and progress
      routines/                    Guided routine composition and presentation
      gamification/                Celebration overlays and progress icons
    forms/                         Reused draft comparison and navigation guard
    routines/                      Routine model, controller, timing and paused recovery
    audio/                         Audio resource ownership
    motion/                        Animation actions and cleanup
    styles/                        Tokens, base rules and shared utilities
    trackers/                      Registry and shared date/progress contracts
    local/
      database/                    Dexie/relational mapping, transactions, migrations
        fixtures/                  Immutable historical schema fixtures
      <tracker>/model.ts           Durable tracker contracts and pure business rules
      nutrition/                   Typed nutrition queries and mutations
      native/                      Incoming payload validation and record parsing
      state.ts                     Store serialization and export conversion
      service.ts                   Compatibility dispatcher and remaining orchestration
  domain/                          Provider sample/transport contracts and transformations
  native/                          Android SQLite, health, usage, back, notifications and SAF
android/app/src/main/java/com/zuncreative/selfimprovement/
                                   Native Java integrations
```

## Dependency and ownership rules

- Tracker-specific UI stays in its route. Promote a component only when unrelated routes need the same presentation contract.
- Every main tracker screen uses `TrackerPage`. Its content body contains only reusable `*Section` components, with `TrackerSections` as the only layout container. Raw HTML and Lily primitives stay inside those section components. `tracker-page-structure.test.ts` enforces this for every `AppTrackerId`.
- Date navigation keeps registered tracker pages mounted, including nutrition's dated log route. The root key changes only for a different screen or nested workflow identity; restore still deliberately remounts the shell. Date links and calendar selections preserve scroll and focus.
- `TrackerPage` applies an opacity-only GSAP fade to top-level section shells when the selected progress date changes and when conditional sections appear. Section motion never changes or clears transforms, so content such as circular progress stays in place. `TrackerDailyProgress` retains date-keyed points/cells, slides earlier dates right and later dates left, and retargets from current positions. Large calendar jumps use bounded travel; null days remain gaps. `AnimatedValue` animates metric updates without changing their accessible final text. Pass numeric values with a formatter for localized numbers or duration-unit changes. Reduced-motion changes finish active date animations, and unmounting releases their resources.
- Persistent date-bound forms and completion callbacks use `DateBoundRequestLifetime`. Changing dates or disposing a page invalidates pending UI continuations without cancelling an already committed local write. Date effects reset drafts, dialogs and timer state; only genuinely date-bound child runners retain their own reset key.
- Shared presentation receives data and callbacks. `SettingsSaveBar` renders controls without context. Routes opt into the shell outlet using `PageActionBar`; a nested registration temporarily owns the outlet and disposal restores its parent.
- Button delegates native interaction behavior to Pressable. Link and button inputs have separate contracts; disabled activation is enforced centrally.
- Local persistence does not import route modules. Incoming native payload processing belongs under `local/native`; Android plugin calls belong under `native`. Application candidate composition sits above persistence and is injected into the service.
- Route-owned action rules use `defineActionCandidate`. Eligibility belongs in composable `conditions`; attributed trackers use `trackerIds`; extra enabled-tracker dependencies use `requires`. The factory owns required-tracker merging, the default tracker icon, and stable instance IDs. `trackerActionCandidates` explicitly registers every app tracker, including trackers with no candidates, so registry additions cannot be omitted silently.
- Durable tracker contracts live in local domain models. `lib/app/model.ts` composes projections. `api-types.ts` remains a deprecated compatibility export, and `apiRequest<T>` remains a migration adapter. Nutrition uses typed local operations, with query/mutation orchestration in its domain folder.
- Root layout owns the active palette on the document element so portals inherit the same tokens. Heading colors require an explicit component class. Decorative tracker colors are separate from opaque, contrast-safe action and status surfaces.
- Local-data loaders register resource dependencies. Mutation refreshes coalesce into one application refresh owner, including a trailing pass when another mutation finishes during an in-flight read. Shared gamification views consume refreshed props.
- Restore enters maintenance, drains native collection, mutations and backup work, replaces state, resets reconciliation/session caches, updates reminders and refreshes the UI. Post-commit navigation or reminder failures must not be reported as a failed database mutation.
- Timed sessions pause on background and recover as paused sessions. Recovery never grants a completion by itself. Route adapters own durable completion; the routine controller owns transient execution resources.

## Validation and compatibility

`npm run check`, `npm run lint`, `npm run format:check`, `npm run test`, and `npm run test:browser` validate the app. Browser tests mount actual components in Chromium. Biome checks unused TypeScript/JavaScript imports and variables; those rules remain disabled specifically for Svelte templates, which are checked by Svelte. CSS and JSON formatting are included; Markdown is reviewed as documentation.

The native connection, Dexie fallback and backup envelope remain compatible with existing records. Backup JSON is version two, with the same 25 MiB import/export boundary and five exact app files retained in an optional SAF Drive folder. The historical SQLite v2 fixture comes from commit `1d04f43`; it must not be regenerated from the current schema.

## Adding a tracker

1. Register its navigation and colors in `src/lib/trackers/registry.ts`.
2. Add its local model, persistence, backup representation and `TrackerActionStates` projection.
3. Add `src/routes/<tracker>/actions.ts` with `defineActionCandidate` rules, or an explicit empty list, then register it in `trackerActionCandidates`.
4. Build the main route with `TrackerPage` and reusable route-owned `*Section.svelte` components. Use shared tracker sections and `TrackerSections` before creating another layout pattern.
5. Add loader, mutation, action-rule and section-composition coverage. The registry-linked type and structure checks identify missing integration points.

Further service decomposition and targeted row mutations across every tracker remain incremental work. A physical Android smoke test is required for the platform cases in [android-smoke-test.md](android-smoke-test.md). Building or running scripts that invoke the production build requires local approval under the root project instructions.
