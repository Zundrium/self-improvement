import { defineActionCandidate } from '$lib/actions/candidate';
import {
	localMinuteIsAtLeast,
	localMinuteIsBefore,
	trackerDateIsLocalDate,
	trackerStateCondition
} from '$lib/actions/conditions';
import type {
	ActionEnvironment,
	ActionResolution,
	FitnessActionState
} from '$lib/actions/contracts';

const MORNING_START = 5 * 60;
const MORNING_END = 12 * 60;
const QUICK_EVENING_START = 20 * 60;
const workoutIsAvailable = trackerStateCondition(
	'fitness',
	(fitness) =>
		fitness.scheduled &&
		!fitness.completed &&
		fitness.workoutId !== null &&
		fitness.sets !== null &&
		fitness.firstSetDurationSeconds !== null &&
		fitness.additionalSetDurationSeconds !== null
);

export const fitnessActionCandidates = [
	defineActionCandidate({
		id: 'fitness.morning-workout',
		trackerIds: ['fitness'],
		conditions: [
			trackerDateIsLocalDate('fitness'),
			workoutIsAvailable,
			localMinuteIsAtLeast(MORNING_START),
			localMinuteIsBefore(MORNING_END)
		],
		resolve(snapshot, environment) {
			const fitness = eligibleWorkout(snapshot.trackers.fitness, environment);
			if (!fitness) return null;
			return workoutResolution(fitness, 75, 'Start with a morning workout');
		}
	}),
	defineActionCandidate({
		id: 'fitness.scheduled-workout',
		trackerIds: ['fitness'],
		conditions: [trackerDateIsLocalDate('fitness'), workoutIsAvailable],
		resolve(snapshot, environment) {
			const fitness = eligibleWorkout(snapshot.trackers.fitness, environment);
			if (!fitness) return null;
			return workoutResolution(fitness, 60, "Let's do today's workout");
		}
	}),
	defineActionCandidate({
		id: 'fitness.quick-evening-workout',
		trackerIds: ['fitness'],
		conditions: [
			trackerDateIsLocalDate('fitness'),
			workoutIsAvailable,
			localMinuteIsAtLeast(QUICK_EVENING_START)
		],
		resolve(snapshot, environment) {
			const fitness = eligibleWorkout(snapshot.trackers.fitness, environment);
			if (!fitness) return null;
			return workoutResolution(
				fitness,
				80,
				'Fit in a quick evening workout',
				Math.max(1, Math.ceil(fitness.sets / 2))
			);
		}
	})
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
	score: number,
	title: string,
	sets = fitness.sets
): Omit<ActionResolution, 'id' | 'icon'> & { instanceId: string } {
	return {
		instanceId: fitness.date,
		goalId: `fitness.daily-workout:${fitness.date}`,
		conflictKeys: ['physical-effort-now'],
		priority: 'activity',
		score,
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
	const seconds =
		fitness.firstSetDurationSeconds + (sets - 1) * fitness.additionalSetDurationSeconds;
	const minutes = Math.max(1, Math.ceil(seconds / 60));
	return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
