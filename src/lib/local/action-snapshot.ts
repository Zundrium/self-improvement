import type { ActionSnapshot, TrackerActionStates } from '$lib/actions/contracts';
import { workoutSetDurations } from '../../routes/fitness/fitness';
import { fitnessProgram } from './fitness-program';
import { sumEntries } from './nutrition';
import type { LocalAppState } from './state';

export function buildActionSnapshot(
	state: LocalAppState,
	date: string,
	today: string
): ActionSnapshot {
	return {
		date,
		today,
		enabledTrackerIds: [...state.enabledTrackerIds],
		trackers: {
			steps: stepState(state, date),
			sleep: sleepState(state, date),
			'screen-time': screenTimeState(state, date),
			fitness: fitnessState(state, date),
			nutrition: nutritionState(state, date),
			meditation: meditationState(state, date),
			breathing: breathingState(state, date),
			happiness: happinessState(state, date),
			period: periodState(state, date)
		}
	};
}

function stepState(state: LocalAppState, date: string): TrackerActionStates['steps'] {
	const day = state.steps.days.find((item) => item.date === date);
	return {
		date,
		steps: day?.count ?? 0,
		goal: state.steps.dailyGoal,
		hasMeasurements: day !== undefined
	};
}

function sleepState(state: LocalAppState, date: string): TrackerActionStates['sleep'] {
	const day = state.sleep.days.find((item) => item.localDate === date);
	return {
		date,
		status: day?.status ?? 'pending',
		bedtime: day?.configuredBedtime ?? state.sleep.bedtime,
		lateUsageSeconds: day?.lateUsageSeconds ?? 0,
		setupRequired: state.screenTime.trackedPackages.length === 0
	};
}

function screenTimeState(
	state: LocalAppState,
	date: string
): TrackerActionStates['screen-time'] {
	const day = state.screenTime.days.find((item) => item.date === date);
	return {
		date,
		minutes: trackedScreenTimeMinutes(day, state.screenTime.trackedPackages),
		limitMinutes: 240,
		recorded: day !== undefined,
		hasMeasurements: day !== undefined
	};
}

function fitnessState(state: LocalAppState, date: string): TrackerActionStates['fitness'] {
	const workout = fitnessProgram(state.fitness.exerciseSpeeds).workouts.find(
		({ day }) => day === Number(date.slice(-2))
	);
	const durations = workout ? workoutSetDurations(workout) : null;
	return {
		date,
		scheduled: workout !== undefined,
		completed: state.fitness.completedDays.some(({ dateKey }) => dateKey === date),
		workoutId: workout?.id ?? null,
		sets: workout?.sets ?? null,
		firstSetDurationSeconds: durations?.firstSetDurationSeconds ?? null,
		additionalSetDurationSeconds: durations?.additionalSetDurationSeconds ?? null
	};
}

function nutritionState(state: LocalAppState, date: string): TrackerActionStates['nutrition'] {
	const entries = state.nutrition.entries.filter((entry) => entry.date === date);
	const profile = state.nutrition.profile;
	return {
		date,
		configured: profile !== null,
		hasEntries: entries.length > 0,
		calories: sumEntries(entries).calories,
		calorieGoal: profile?.dailyCalorieGoal ?? null,
		fasting: state.nutrition.fastingDates.includes(date),
		eatingWindow: eatingWindow(profile)
	};
}

function eatingWindow(profile: LocalAppState['nutrition']['profile']) {
	if (!profile?.eatingWindowEnabled) return null;
	return { start: profile.eatingWindowStart, end: profile.eatingWindowEnd };
}

function meditationState(
	state: LocalAppState,
	date: string
): TrackerActionStates['meditation'] {
	return {
		date,
		completed: state.meditation.sessions.some((session) => session.localDate === date),
		daysSinceLastSession: daysSinceLastSession(state.meditation.sessions, date)
	};
}

function breathingState(state: LocalAppState, date: string): TrackerActionStates['breathing'] {
	return {
		date,
		completed: state.breathing.exercises.some((exercise) => exercise.localDate === date)
	};
}

function happinessState(state: LocalAppState, date: string): TrackerActionStates['happiness'] {
	return {
		date,
		rating: state.happiness.entries.find((entry) => entry.localDate === date)?.rating ?? null
	};
}

function periodState(state: LocalAppState, date: string): TrackerActionStates['period'] {
	return {
		date,
		flow: state.period.entries.find((entry) => entry.localDate === date)?.flow ?? null
	};
}

function trackedScreenTimeMinutes(
	day: LocalAppState['screenTime']['days'][number] | undefined,
	trackedPackages: string[]
) {
	if (!day) return 0;
	const tracked = new Set(trackedPackages);
	return day.apps
		.filter((app) => tracked.has(app.package))
		.reduce((total, app) => total + app.minutes, 0);
}

function daysSinceLastSession(sessions: LocalAppState['meditation']['sessions'], date: string) {
	const previousDates = sessions
		.map(({ localDate }) => localDate)
		.filter((localDate) => localDate < date)
		.toSorted()
		.toReversed();
	if (!previousDates[0]) return null;
	return daysBetween(previousDates[0], date);
}

function daysBetween(start: string, end: string) {
	return Math.round(
		(Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000
	);
}
