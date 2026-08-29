export const STRETCH_ACTIVITY_IDS = [
	'pancake',
	'figure-four-left',
	'figure-four-right',
	'lunge-left',
	'lunge-right',
	'chest',
	'lat',
	'wall-angels'
] as const;
export const STRETCH_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type StretchActivityId = (typeof STRETCH_ACTIVITY_IDS)[number];
export type StretchDifficulty = (typeof STRETCH_DIFFICULTIES)[number];
export type StretchDifficulties = Record<StretchActivityId, StretchDifficulty>;

export const STRETCH_DIFFICULTIES_BY_ACTIVITY = {
	pancake: STRETCH_DIFFICULTIES,
	'figure-four-left': STRETCH_DIFFICULTIES,
	'figure-four-right': STRETCH_DIFFICULTIES,
	'lunge-left': ['easy', 'medium'],
	'lunge-right': ['easy', 'medium'],
	chest: ['medium'],
	lat: STRETCH_DIFFICULTIES,
	'wall-angels': ['medium']
} as const satisfies Record<StretchActivityId, readonly StretchDifficulty[]>;

export const DEFAULT_STRETCH_DIFFICULTIES: StretchDifficulties = {
	pancake: 'medium',
	'figure-four-left': 'medium',
	'figure-four-right': 'medium',
	'lunge-left': 'medium',
	'lunge-right': 'medium',
	chest: 'medium',
	lat: 'medium',
	'wall-angels': 'medium'
};

export const TRACKER_DEFAULTS = {
	steps: { dailyGoal: 5_000 },
	screenTime: { dailyLimitMinutes: 240 },
	fitness: { defaultSets: 2 },
	meditation: { defaultDurationSeconds: 300 },
	breathing: { rounds: 6, includeHold: true },
	stretch: { holdSeconds: 30, difficulties: DEFAULT_STRETCH_DIFFICULTIES },
	happiness: { defaultRating: 3 },
	period: { defaultFlow: 'medium', fallbackCycleDays: 28 }
} as const;
