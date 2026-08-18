import { describe, expect, it } from 'vitest';
import { calculateBmr, calculateTdee } from './nutrition';
import { parseMealImageDataUrl } from './server/meal-image';
import { validateAIResult, validateMealEstimate } from './server/meal-analysis';
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

		expect(profileInputFromForm(form)).toMatchObject({ goalMode: 'custom', customGoal: 2200 });
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

describe('meal inputs', () => {
	it('accepts supported image data URLs', () => {
		expect(parseMealImageDataUrl('data:image/jpg;base64,YQ==')).toEqual({
			mimeType: 'image/jpeg',
			base64: 'YQ==',
			dataUrl: 'data:image/jpeg;base64,YQ=='
		});
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
