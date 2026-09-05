import { expect, it } from 'vitest';
import { LocalAppDatabase, LocalAppStore, createDefaultAppState } from '$lib/local/state';

it('reads nutrition photos through indexed day and entry snapshots', async () => {
	const store = new LocalAppStore(
		new LocalAppDatabase(`photo-review-${crypto.randomUUID()}`),
		null
	);
	const state = createDefaultAppState();
	const totals = { calories: 1, proteinG: 0, carbsG: 0, fatG: 0, count: 1 };
	const imageDataUrl = `data:image/jpeg;base64,${btoa('a'.repeat(500_000))}`;
	state.nutrition.entries.push({
		id: 'entry',
		date: '2026-03-20',
		name: 'Lunch',
		notes: '',
		createdAt: '2026-03-20T12:00:00.000Z',
		thumbnail: '',
		totals,
		meals: [
			{
				id: 'meal',
				name: 'Lunch',
				imageDataUrl,
				totals,
				ingredients: [
					{
						id: 'ingredient',
						name: 'Rice',
						quantity: 1,
						unit: 'serving',
						calories: 1,
						proteinG: 0,
						carbsG: 0,
						fatG: 0,
						notes: ''
					}
				]
			}
		]
	});
	try {
		await store.replaceState(state);
		const entry = await store.readNutritionEntry('entry');
		expect(entry.nutrition.entries[0].meals[0].imageDataUrl).toBe(imageDataUrl);
		const day = await store.readNutritionDay('2026-03-20', ['2026-03-20']);
		expect(day.nutrition.entries[0].meals[0].imageDataUrl).toBe(imageDataUrl);
	} finally {
		await store.deleteDatabase();
	}
});
