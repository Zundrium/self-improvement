# Action Candidate Implementation

## Goal

The action feed is the central page that turns local tracker state into a short list of useful actions.

The implementation has four parts:

1. Build one factual snapshot from `LocalAppState`.
2. Let tracker candidates resolve possible actions from that snapshot.
3. Order the proposals, remove duplicates and conflicts, and keep at most three.
4. Render the resulting items on the central page.

Tracker records remain the source of truth. The action system does not keep its own progress state.

## Flow

```text
Dexie LocalAppState
        ↓
ActionSnapshot
        ↓
ActionCandidate[]
        ↓
Resolve, order, deduplicate, limit
        ↓
ActionFeedItem[]
        ↓
Central page
```

The snapshot builder and candidate engine are synchronous, deterministic, and independent of Svelte components and Android plugins.

## Data structures

```ts
type ActionEnvironment = {
	now: Date;
	timeZone: string;
	localDate: string;
	localMinuteOfDay: number;
};

type ActionSnapshot = {
	date: string;
	today: string;
	enabledTrackerIds: AppTrackerId[];
	trackers: TrackerActionStates;
};

type TrackerActionStates = {
	steps: StepActionState;
	sleep: SleepActionState;
	'screen-time': ScreenTimeActionState;
	fitness: FitnessActionState;
	nutrition: NutritionActionState;
	meditation: MeditationActionState;
	breathing: BreathingActionState;
	happiness: HappinessActionState;
	period: PeriodActionState;
};

type ActionCandidate = {
	id: string;
	trackerIds: AppTrackerId[];
	resolve(snapshot: ActionSnapshot, environment: ActionEnvironment): ActionResolution | null;
};

type ActionResolution = {
	id: string;
	goalId?: string;
	conflictKeys?: string[];
	priority: ActionPriority;
	score: number;
	icon: ActionIcon;
	title: string;
	reason?: string;
	action: { type: 'navigate'; href: string };
};

type ActionProposal = ActionResolution & {
	candidateId: string;
	trackerIds: AppTrackerId[];
};

type ActionFeedItem = {
	id: string;
	trackerIds: AppTrackerId[];
	priority: ActionPriority;
	icon: ActionIcon;
	title: string;
	reason?: string;
	action: ActionFeedCommand;
};
```

`score` uses a `0–100` scale. Higher means more useful now. Priority remains the first ordering level: `blocking`, `warning`, then `activity`.

`goalId` groups alternatives that achieve the same result. `conflictKeys` prevent incompatible actions from appearing together.

## Tracker relationships

`ActionSnapshot` is built directly from one immutable `LocalAppState` read.

Tracker action state contains facts rather than recommendation decisions:

```ts
type FitnessActionState = {
	date: string;
	scheduled: boolean;
	completed: boolean;
	workoutId: number | null;
	sets: number | null;
};

type MeditationActionState = {
	date: string;
	completed: boolean;
	daysSinceLastSession: number | null;
};

type NutritionActionState = {
	date: string;
	hasEntries: boolean;
	calories: number;
	calorieGoal: number | null;
	fasting: boolean;
	eatingWindow: EatingWindow | null;
};
```

Each tracker exposes only the facts required by its current candidates. Rolling history is derived only when a real candidate needs it.

Missing Android measurements remain distinguishable from a measured zero. Manual tracker collections are authoritative because their complete state is already in Dexie.

Tracker-local candidates read one tracker state. Cross-tracker candidates read multiple states and list every tracker they depend on.

## Candidate evaluation

```ts
function evaluateCandidate(
	candidate: ActionCandidate,
	snapshot: ActionSnapshot,
	environment: ActionEnvironment
): ActionProposal | null {
	if (!candidate.trackerIds.every((id) => snapshot.enabledTrackerIds.includes(id))) return null;
	const resolution = candidate.resolve(snapshot, environment);
	if (!resolution) return null;
	return {
		...resolution,
		candidateId: candidate.id,
		trackerIds: candidate.trackerIds
	};
}
```

Time-sensitive candidates return `null` when `snapshot.date !== environment.localDate`. Local time is derived once per feed build.

## Selection

Selection is one deterministic pass:

1. Evaluate candidates whose trackers are enabled.
2. Sort by priority, score descending, then candidate ID.
3. Walk the sorted proposals in order.
4. Skip a proposal when its `goalId` was already selected.
5. Skip a proposal when any conflict key was already selected.
6. Stop after three items.
7. Remove internal selection fields from the returned feed items.

Returning fewer than three items is valid.

## Example

```ts
const quickEveningWorkout: ActionCandidate = {
	id: 'fitness.quick-evening-workout',
	trackerIds: ['fitness'],

	resolve(snapshot, environment) {
		const fitness = snapshot.trackers.fitness;
		if (fitness.date !== environment.localDate) return null;
		if (environment.localMinuteOfDay < 20 * 60) return null;
		if (!fitness.scheduled || fitness.completed) return null;
		if (fitness.workoutId === null || fitness.sets === null) return null;

		const sets = Math.max(1, Math.ceil(fitness.sets / 2));
		return {
			id: `fitness.quick-evening-workout:${fitness.date}`,
			goalId: `fitness.daily-workout:${fitness.date}`,
			conflictKeys: ['physical-effort-now'],
			priority: 'activity',
			score: 80,
			icon: 'tracker',
			title: 'Do a shorter evening workout',
			reason: "Today's workout is still open.",
			action: {
				type: 'navigate',
				href: `/fitness?date=${fitness.date}&sets=${sets}`
			}
		};
	}
};
```

Morning and normal evening candidates use the same dated `goalId`, so only the best current variant appears.

## Native actions

Permission and synchronization actions remain in `src/native/action-feed.ts`, where their facts are available.

Before rendering, `src/routes/action-feed.ts`:

1. places native blocking actions before tracker actions;
2. removes tracker actions blocked by a native action;
3. orders the combined items by priority;
4. limits the visible list to three.

This is a small final merge, not a second candidate engine.

## Repository changes

- Add portable action contracts and selection helpers under `src/lib/actions/`.
- Build `ActionSnapshot` from `LocalAppState` under `src/lib/local/`.
- Move the current `actionItems` rules out of `src/lib/local/service.ts`.
- Colocate tracker candidates in `src/routes/<tracker>/actions.ts`.
- Keep cross-tracker candidates under `src/lib/actions/`.
- Add `reason` to `src/lib/api-types.ts` and render it in `src/routes/actionFeedItem.svelte`.
- Keep native permission and sync actions in `src/native/action-feed.ts`.
- Apply the final three-item limit in `src/routes/action-feed.ts`.

No new Dexie state is required for the first implementation.

## Tests

Candidate tests cover conditions, time boundaries, missing facts, and stable IDs.

Selector tests cover disabled trackers, ordering, goal deduplication, conflicts, stable ties, and the three-item limit.

Mobile tests cover native blockers, tracker-action suppression, ordering, and the final limit.

## Delivery

1. Add the snapshot, candidate contracts, and selector while preserving current behavior.
2. Convert the existing `actionItems` rules into tracker candidates.
3. Add fitness time variants and reason text.
4. Add meditation, nutrition, and cross-tracker candidates only when needed.

Feedback history, learned ranking, candidate preferences, and action lifecycle events are outside this implementation.
