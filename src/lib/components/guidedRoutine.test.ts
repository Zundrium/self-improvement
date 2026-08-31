import { describe, expect, it } from 'vitest';
import {
	activityDurationMs,
	initialRoutinePosition,
	nextRoutinePosition,
	repDurationMs,
	shouldPlayRestCountdownTick,
	type GuidedRoutineActivity
} from './guidedRoutine';

const activities: GuidedRoutineActivity[] = [
	{
		id: 'hold',
		name: 'Hold',
		imageUrl: '/hold.webp',
		type: 'timed',
		durationSeconds: 30,
		repeats: 2
	},
	{
		id: 'reps',
		name: 'Squat',
		imageUrl: '/squat.webp',
		type: 'cadenced-reps',
		reps: 10,
		cadencePercent: 100
	},
	{ id: 'manual', name: 'Wall angels', imageUrl: '/wall.webp', type: 'manual-reps', reps: 10 }
];

describe('guided routine sequencing', () => {
	it('repeats an activity before advancing to the next activity or set', () => {
		let position = initialRoutinePosition();
		const positions = [position];
		let nextPosition = nextRoutinePosition(activities, 2, position);

		while (nextPosition) {
			position = nextPosition;
			positions.push(position);
			nextPosition = nextRoutinePosition(activities, 2, position);
		}

		expect(positions).toEqual([
			{ setIndex: 0, activityIndex: 0, activityRepeatIndex: 0 },
			{ setIndex: 0, activityIndex: 0, activityRepeatIndex: 1 },
			{ setIndex: 0, activityIndex: 1, activityRepeatIndex: 0 },
			{ setIndex: 0, activityIndex: 2, activityRepeatIndex: 0 },
			{ setIndex: 1, activityIndex: 0, activityRepeatIndex: 0 },
			{ setIndex: 1, activityIndex: 0, activityRepeatIndex: 1 },
			{ setIndex: 1, activityIndex: 1, activityRepeatIndex: 0 },
			{ setIndex: 1, activityIndex: 2, activityRepeatIndex: 0 }
		]);
	});

	it('calculates timed and cadence-based durations without assigning a timer to manual reps', () => {
		expect(activityDurationMs(activities[0])).toBe(30_000);
		expect(repDurationMs(100)).toBe(2000);
		expect(repDurationMs(125)).toBe(1600);
		expect(activityDurationMs(activities[1])).toBe(20_000);
		expect(activityDurationMs(activities[1], 125)).toBe(16_000);
		expect(activityDurationMs(activities[2])).toBeNull();
	});

	it('ticks only during the configured final rest countdown', () => {
		expect(shouldPlayRestCountdownTick(10, 3)).toBe(false);
		expect(shouldPlayRestCountdownTick(4, 3)).toBe(false);
		expect(shouldPlayRestCountdownTick(3, 3)).toBe(true);
		expect(shouldPlayRestCountdownTick(2, 3)).toBe(true);
		expect(shouldPlayRestCountdownTick(1, 3)).toBe(true);
		expect(shouldPlayRestCountdownTick(0, 3)).toBe(false);
	});
});
