import { describe, expect, it } from 'vitest';
import {
	BREATHING_CYCLE_SECONDS,
	BREATHING_DURATION_SECONDS,
	breathingDurationSeconds,
	breathingStep,
	formatTimer,
	isValidLocalDate
} from './breathing';

describe('4-7-8 breathing sequence', () => {
	it('runs six 19-second rounds for a nearly two-minute exercise', () => {
		expect(BREATHING_CYCLE_SECONDS).toBe(19);
		expect(BREATHING_DURATION_SECONDS).toBe(114);
	});

	it('moves through inhale, hold, and exhale phases', () => {
		expect(breathingStep(0)).toMatchObject({ phase: { id: 'inhale' }, remainingSeconds: 4 });
		expect(breathingStep(4_000)).toMatchObject({ phase: { id: 'hold' }, remainingSeconds: 7 });
		expect(breathingStep(11_000)).toMatchObject({ phase: { id: 'exhale' }, remainingSeconds: 8 });
	});

	it('starts the next round after 19 seconds', () => {
		expect(breathingStep(19_000)).toMatchObject({ phase: { id: 'inhale' }, round: 2 });
	});

	it('skips the hold phase when disabled', () => {
		expect(breathingDurationSeconds(false)).toBe(72);
		expect(breathingStep(4_000, false)).toMatchObject({
			phase: { id: 'exhale' },
			remainingSeconds: 8
		});
		expect(breathingStep(12_000, false)).toMatchObject({ phase: { id: 'inhale' }, round: 2 });
	});
});

describe('breathing formatting and dates', () => {
	it('formats the exercise duration', () => {
		expect(formatTimer(BREATHING_DURATION_SECONDS)).toBe('01:54');
	});

	it('rejects impossible dates', () => {
		expect(isValidLocalDate('2026-02-29')).toBe(false);
		expect(isValidLocalDate('2028-02-29')).toBe(true);
	});
});
