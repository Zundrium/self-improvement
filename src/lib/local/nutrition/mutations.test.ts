import { describe, expect, it } from 'vitest';
import { createDefaultAppState } from '../state';
import { createEntry, updateEntry, type NutritionMutationContext } from './mutations';

describe('typed nutrition mutations', () => {
	it.each([createEntry, (context, input) => updateEntry(context, 'entry', input)])(
		'rejects impossible calendar dates',
		async (mutation) => {
			const state = createDefaultAppState(new Date('2026-09-05T12:00:00.000Z'));
			const context: NutritionMutationContext = {
				today: '2026-09-05',
				fail: (_status, message) => new Error(message),
				update: async (mutator) => {
					mutator(state);
					return state;
				},
				updatePlain: async (mutator) => {
					mutator(state);
					return state;
				}
			};
			await expect(
				mutation(context, {
					date: '2026-02-31',
					time: '12:00',
					timeZoneOffset: 0,
					meals: []
				})
			).rejects.toThrow('Choose a valid date.');
		}
	);
});
