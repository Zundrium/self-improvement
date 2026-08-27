export const TRACKER_DEFAULTS = {
	steps: { dailyGoal: 5_000 },
	screenTime: { dailyLimitMinutes: 240 },
	fitness: { defaultSets: 2 },
	meditation: { defaultDurationSeconds: 300 },
	breathing: { rounds: 6, includeHold: true },
	happiness: { defaultRating: 3 },
	period: { defaultFlow: 'medium', fallbackCycleDays: 28 }
} as const;
