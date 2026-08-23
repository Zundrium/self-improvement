import { describe, expect, it } from 'vitest';
import { calculateBmr, calculateTdee } from './nutrition';
import {
	eatingWindowLabel,
	formatHumanDuration,
	validateEatingWindow
} from './server/eating-window';
import { consecutiveFastingDates } from './server/fasting';
import { parseMealImageDataUrl } from './server/meal-image';
import { validateAIResult, validateMealEstimate } from './server/meal-analysis';
import { parseMealSource } from './server/meal-source';
import { localDateTime, validDate } from './server/nutrition';
import { profileInputFromForm } from './server/profiles';

describe('calorie estimates', () => {
	it('calculates BMR and TDEE with Mifflin-St Jeor', () => {
		expect(calculateBmr(70, 175, 30, 'male')).toBe(1649);
		expect(calculateBmr(70, 175, 30, 'female')).toBe(1483);
		expect(calculateTdee(70, 175, 30, 'male', 'moderate')).toBe(2556);
	});
});

describe('profile calorie goals', () => {
	it('accepts a manual calorie goal from profile settings', () => {
		const form = new FormData();
		form.set('weightKg', '70');
		form.set('heightCm', '175');
		form.set('age', '30');
		form.set('gender', 'male');
		form.set('activityLevel', 'moderate');
		form.set('goalMode', 'custom');
		form.set('customGoal', '2200');
		form.set('eatingWindowEnabled', 'true');
		form.set('eatingWindowStart', '11:30');
		form.set('eatingWindowEnd', '19:30');

		expect(profileInputFromForm(form)).toMatchObject({
			goalMode: 'custom',
			customGoal: 2200,
			eatingWindowEnabled: true,
			eatingWindowStart: '11:30',
			eatingWindowEnd: '19:30'
		});
		form.set('eatingWindowEnabled', 'sometimes');
		expect(() => profileInputFromForm(form)).toThrow('whether to use a daily eating window');
	});
});

describe('eating windows', () => {
	const window = { enabled: true, start: '12:00', end: '20:00' };

	it('validates complete same-day eating windows', () => {
		expect(validateEatingWindow('08:00', '17:30')).toEqual({ start: '08:00', end: '17:30' });
		expect(() => validateEatingWindow('8:00', '17:30')).toThrow('valid eating window times');
		expect(() => validateEatingWindow('20:00', '12:00')).toThrow('after its start time');
		expect(() => validateEatingWindow('12:00', '12:00')).toThrow('after its start time');
	});

	it('labels the exact start and end boundaries', () => {
		expect(eatingWindowLabel(window, new Date('2026-08-21T10:30:00Z'), 'UTC')).toBe(
			'Eating time starts in 1 hour 30 minutes'
		);
		expect(eatingWindowLabel(window, new Date('2026-08-21T12:00:00Z'), 'UTC')).toBe(
			'Eating time lasts 8 hours'
		);
		expect(eatingWindowLabel(window, new Date('2026-08-21T20:00:00Z'), 'UTC')).toBe(
			'Next eating time starts in 16 hours'
		);
	});

	it('uses IANA timezone transitions for the next window', () => {
		expect(eatingWindowLabel(window, new Date('2026-03-28T19:00:00Z'), 'Europe/Amsterdam')).toBe(
			'Next eating time starts in 15 hours'
		);
	});

	it('formats partial minutes and singular units', () => {
		expect(formatHumanDuration(30_000)).toBe('1 minute');
		expect(formatHumanDuration(60 * 60_000)).toBe('1 hour');
		expect(formatHumanDuration(61 * 60_000)).toBe('1 hour 1 minute');
	});
});

describe('meal validation', () => {
	it('normalizes AI nutrition output', () => {
		const estimate = validateAIResult(
			JSON.stringify({
				meal_name: 'Eggs on toast',
				ingredients: [
					{
						name: 'Eggs',
						quantity: 2,
						unit: 'piece',
						calories: 156,
						protein_g: 12.6,
						carbs_g: 1.1,
						fat_g: 10.6
					}
				]
			})
		);

		expect(estimate.mealName).toBe('Eggs on toast');
		expect(estimate.ingredients[0]).toMatchObject({
			name: 'Eggs',
			quantity: 2,
			unit: 'piece',
			calories: 156
		});
	});

	it('rejects an estimate without food', () => {
		expect(() => validateMealEstimate({ mealName: 'Empty', ingredients: [] })).toThrow(
			'No food was detected'
		);
	});
});

describe('full-day fasting dates', () => {
	it('builds consecutive completed dates from the selected day', () => {
		expect(consecutiveFastingDates('2028-02-28', 3, '2028-03-05')).toEqual([
			'2028-02-28',
			'2028-02-29',
			'2028-03-01'
		]);
	});

	it('rejects invalid, excessive, and future ranges', () => {
		expect(() => consecutiveFastingDates('2028-02-30', 1, '2028-03-05')).toThrow(
			'Choose a valid start date'
		);
		expect(() => consecutiveFastingDates('2028-02-28', 31, '2028-03-30')).toThrow(
			'Choose between 1 and 30'
		);
		expect(() => consecutiveFastingDates('2028-03-05', 2, '2028-03-05')).toThrow(
			'cannot be marked in the future'
		);
	});
});

describe('meal inputs', () => {
	it('accepts supported image data URLs', () => {
		expect(parseMealImageDataUrl('data:image/jpg;base64,YQ==')).toEqual({
			mimeType: 'image/jpeg',
			base64: 'YQ==',
			dataUrl: 'data:image/jpeg;base64,YQ=='
		});
	});

	it('accepts a trimmed description without a photo', () => {
		expect(parseMealSource(undefined, '  Two eggs and toast  ')).toEqual({
			image: null,
			description: 'Two eggs and toast'
		});
	});

	it('requires a valid photo or useful description', () => {
		expect(() => parseMealSource(undefined, ' ')).toThrow(
			'Add a meal photo or describe what you ate.'
		);
		expect(() => parseMealSource('not-an-image', 'Two eggs')).toThrow(
			'Use a JPG, PNG, or WebP image.'
		);
		expect(() => parseMealSource(undefined, 42)).toThrow('The meal description must be text.');
		expect(() => parseMealSource(undefined, 'x'.repeat(1001))).toThrow(
			'Keep the meal description under 1000 characters.'
		);
	});

	it('validates real calendar dates', () => {
		expect(validDate('2028-02-29')).toBe(true);
		expect(validDate('2027-02-29')).toBe(false);
		expect(validDate('2027-13-01')).toBe(false);
	});

	it('converts an editable local meal time to an instant', () => {
		expect(localDateTime('2027-06-15', '12:30', -120).toISOString()).toBe(
			'2027-06-15T10:30:00.000Z'
		);
		expect(() => localDateTime('2027-06-15', '25:00', -120)).toThrow(
			'A valid date and time are required.'
		);
	});
});
