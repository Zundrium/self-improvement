import { describe, expect, it } from 'vitest';
import { DEFAULT_STRETCH_DIFFICULTIES } from '$lib/local/tracker-settings';
import {
	formatStretchDuration,
	isStretchScheduled,
	STRETCH_SETS_PER_DAY,
	stretchDurationSeconds,
	stretchSteps,
	WALL_ANGEL_REPS
} from './stretch';

describe('stretch routine', () => {
	it('builds the video routine with bilateral hip stretches and wall angels', () => {
		const steps = stretchSteps(30);

		expect(steps.map(({ name }) => name)).toEqual([
			'Pancake stretch',
			'Figure-four stretch',
			'Figure-four stretch',
			'Hip-flexor stretch',
			'Hip-flexor stretch',
			'Jack stretch',
			'Lat stretch',
			'Wall angels'
		]);
		expect(steps.slice(0, -1).every(({ sets }) => sets === STRETCH_SETS_PER_DAY)).toBe(true);
		expect(steps.at(-1)).toMatchObject({
			position: `${WALL_ANGEL_REPS} slow reps`,
			durationSeconds: null,
			sets: 1
		});
		expect(steps.find(({ id }) => id === 'pancake')?.imageVariants).toHaveLength(3);
		expect(steps.find(({ id }) => id === 'lunge-left')?.imageVariants).toHaveLength(2);
		expect(steps.find(({ id }) => id === 'chest')?.imageVariants).toHaveLength(0);
		expect(steps.find(({ id }) => id === 'wall-angels')?.imageVariants).toHaveLength(0);
	});

	it('uses saved image levels for each stretch', () => {
		const steps = stretchSteps(30, {
			...DEFAULT_STRETCH_DIFFICULTIES,
			pancake: 'easy',
			'lunge-left': 'hard',
			chest: 'hard'
		});

		expect(steps.find(({ id }) => id === 'pancake')).toMatchObject({
			imageUrl: '/stretch/activities/pancake-easy.webp?v=2',
			selectedImageVariantId: 'easy'
		});
		expect(steps.find(({ id }) => id === 'lunge-left')).toMatchObject({
			imageUrl: '/stretch/activities/lunge-left-medium.webp?v=2',
			selectedImageVariantId: 'medium'
		});
		expect(steps.find(({ id }) => id === 'chest')).toMatchObject({
			imageUrl: '/stretch/activities/chest.webp?v=2',
			selectedImageVariantId: 'medium'
		});
		expect(steps.find(({ id }) => id === 'lat')).toMatchObject({
			imageUrl: '/stretch/activities/lat-medium.webp?v=2',
			selectedImageVariantId: 'medium'
		});
	});

	it('uses two configured holds for every timed position', () => {
		expect(stretchDurationSeconds(30)).toBe(420);
		expect(stretchDurationSeconds(45)).toBe(630);
		expect(formatStretchDuration(630)).toBe('10:30');
		expect(formatStretchDuration(420)).toBe('7 min');
	});

	it('schedules sessions from Monday through Friday', () => {
		expect(isStretchScheduled('2026-04-10')).toBe(true);
		expect(isStretchScheduled('2026-04-11')).toBe(false);
		expect(isStretchScheduled('2026-04-12')).toBe(false);
		expect(isStretchScheduled('2026-04-13')).toBe(true);
	});
});
