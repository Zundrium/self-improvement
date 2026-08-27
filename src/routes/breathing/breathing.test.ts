import { describe, expect, it } from 'vitest';
import { breathingDurationSeconds, breathingStep } from './breathing';

describe('breathing settings', () => {
	it('uses configured rounds for duration and step progress', () => {
		expect(breathingDurationSeconds(false, 2)).toBe(24);
		expect(breathingStep(13_000, false, 2)).toMatchObject({ round: 2, phase: { id: 'inhale' } });
		expect(breathingStep(30_000, false, 2).round).toBe(2);
	});
});
