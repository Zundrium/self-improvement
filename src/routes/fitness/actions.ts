import type {
	ActionCandidate,
	ActionEnvironment,
	ActionResolution,
	FitnessActionState
} from '$lib/actions/contracts';
import { defaultWorkoutSets } from './fitness';

const MORNING_START = 5 * 60;
const MORNING_END = 12 * 60;
const QUICK_EVENING_START = 20 * 60;

export const fitnessActionCandidates: ActionCandidate[] = [
	{
		id: 'fitness.morning-workout',
		trackerIds: ['fitness'],
		resolve(snapshot, environment) {
			const fitness = eligibleWorkout(snapshot.trackers.fitness, environment);
			if (!fitness) return null;
			if (environment.localMinuteOfDay < MORNING_START) return null;
			if (environment.localMinuteOfDay >= MORNING_END) return null;
			return workoutResolution(fitness, 'morning-workout', 75, 'Start with a morning workout');
		}
	},
	{
		id: 'fitness.scheduled-workout',
		trackerIds: ['fitness'],
		resolve(snapshot, environment) {
			const fitness = eligibleWorkout(snapshot.trackers.fitness, environment);
			if (!fitness) return null;
			return workoutResolution(fitness, 'scheduled-workout', 60, "Let's do today's workout");
		}
	},
	{
		id: 'fitness.quick-evening-workout',
		trackerIds: ['fitness'],
		resolve(snapshot, environment) {
			const fitness = eligibleWorkout(snapshot.trackers.fitness, environment);
			if (!fitness || environment.localMinuteOfDay < QUICK_EVENING_START) return null;
			const sets = Math.max(1, Math.ceil(defaultWorkoutSets(fitness.sets) / 2));
			return workoutResolution(
				fitness,
				'quick-evening-workout',
				80,
				'Fit in a quick evening workout',
				sets
			);
		}
	}
];

function eligibleWorkout(fitness: FitnessActionState, environment: ActionEnvironment) {
	if (fitness.date !== environment.localDate) return null;
	if (!fitness.scheduled || fitness.completed) return null;
	if (fitness.workoutId === null || fitness.sets === null) return null;
	if (fitness.firstSetDurationSeconds === null || fitness.additionalSetDurationSeconds === null)
		return null;
	return {
		...fitness,
		workoutId: fitness.workoutId,
		sets: fitness.sets,
		firstSetDurationSeconds: fitness.firstSetDurationSeconds,
		additionalSetDurationSeconds: fitness.additionalSetDurationSeconds
	};
}

function workoutResolution(
	fitness: FitnessActionState & {
		workoutId: number;
		sets: number;
		firstSetDurationSeconds: number;
		additionalSetDurationSeconds: number;
	},
	variant: string,
	score: number,
	title: string,
	sets = defaultWorkoutSets(fitness.sets)
): ActionResolution {
	return {
		id: `fitness.${variant}:${fitness.date}`,
		goalId: `fitness.daily-workout:${fitness.date}`,
		conflictKeys: ['physical-effort-now'],
		priority: 'activity',
		score,
		icon: 'tracker',
		title,
		reason: `${workoutDuration(sets, fitness)} to feel stronger`,
		action: {
			type: 'navigate',
			href: `/fitness?date=${fitness.date}&sets=${sets}`
		}
	};
}

function workoutDuration(
	sets: number,
	fitness: { firstSetDurationSeconds: number; additionalSetDurationSeconds: number }
) {
	const seconds = fitness.firstSetDurationSeconds + (sets - 1) * fitness.additionalSetDurationSeconds;
	const minutes = Math.max(1, Math.ceil(seconds / 60));
	return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
