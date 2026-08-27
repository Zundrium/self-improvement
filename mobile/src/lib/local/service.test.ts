import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type {
	AppBootstrapData,
	GamificationData,
	HappinessData,
	NutritionEntryData
} from '$lib/api-types';
import { LocalAppService } from './service';
import { LocalAppDatabase, LocalAppStore, createDefaultAppState } from './state';

const stores: LocalAppStore[] = [];

afterEach(async () => {
	await Promise.all(stores.splice(0).map((store) => store.deleteDatabase()));
});

describe('local app service', () => {
	it('returns local app data and persists endpoint-compatible mutations', async () => {
		const now = new Date('2026-03-20T12:00:00.000Z');
		const store = trackedStore();
		await store.replaceState(createDefaultAppState(now));
		const service = new LocalAppService(store, () => now);

		const app = await service.request<AppBootstrapData>('/api/app/bootstrap');
		await service.request('/api/app/happiness', {
			method: 'PUT',
			body: JSON.stringify({
				localDate: app.gamification.today,
				rating: 4,
				reasons: ['gratitude']
			})
		});
		const happiness = await service.request<HappinessData>('/api/app/happiness');
		const firstGamification = await service.request<GamificationData>('/api/app/gamification');
		const secondGamification = await service.request<GamificationData>('/api/app/gamification');

		expect(app.profile.id).toBe('local-profile');
		expect(app.enabledTrackers).toHaveLength(9);
		expect(happiness.entry).toMatchObject({ rating: 4, reasons: ['gratitude'] });
		expect(firstGamification).toMatchObject({ score: 10, glimmers: 10, earnedNow: 10 });
		expect(secondGamification.earnedNow).toBe(0);
	});

	it('updates tracker preferences without authentication state', async () => {
		const store = trackedStore();
		const service = new LocalAppService(store);
		await service.request('/api/app/profile', {
			method: 'PATCH',
			body: JSON.stringify({ trackers: ['steps', 'meditation'] })
		});

		const app = await service.request<AppBootstrapData>('/api/app/bootstrap');

		expect(app.enabledTrackers.map(({ id }) => id)).toEqual(['steps', 'meditation']);
	});

	it('creates a manual nutrition entry without photo or AI fields', async () => {
		const now = new Date('2026-03-20T12:00:00.000Z');
		const store = trackedStore();
		const state = createDefaultAppState(now);
		state.nutrition.profile = nutritionProfile();
		await store.replaceState(state);
		const service = new LocalAppService(store, () => now);

		const result = await service.request<NutritionEntryData>('/api/app/nutrition/entries', {
			method: 'POST',
			body: JSON.stringify({
				date: '2026-03-20',
				time: '12:00',
				timeZoneOffset: 0,
				name: 'Lunch',
				notes: 'At home',
				meals: [{ name: 'Lunch', ingredients: [{ name: 'Rice', calories: 300 }] }]
			})
		});

		expect(result.entry).toMatchObject({ name: 'Lunch', notes: 'At home' });
		expect(result.entry.totals.calories).toBe(300);
		expect(result.entry).not.toHaveProperty('thumbnail');
	});

	it('rejects empty nutrition entries and future entry edits', async () => {
		const now = new Date('2026-03-20T12:00:00.000Z');
		const store = trackedStore();
		const state = createDefaultAppState(now);
		state.nutrition.profile = nutritionProfile();
		await store.replaceState(state);
		const service = new LocalAppService(store, () => now);
		const request = {
			method: 'POST',
			body: JSON.stringify({
				date: '2026-03-20',
				time: '12:00',
				timeZoneOffset: 0,
				name: 'Lunch',
				meals: []
			})
		};

		await expect(service.request('/api/app/nutrition/entries', request)).rejects.toThrow(
			'Add at least one named ingredient.'
		);
		const created = await service.request<NutritionEntryData>('/api/app/nutrition/entries', {
			...request,
			body: JSON.stringify({
				date: '2026-03-20',
				time: '12:00',
				timeZoneOffset: 0,
				name: 'Lunch',
				meals: [{ name: 'Lunch', ingredients: [{ name: 'Rice' }] }]
			})
		});
		await expect(
			service.request(`/api/app/nutrition/entry/${created.entry.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					date: '2026-03-21',
					time: '12:00',
					timeZoneOffset: 0,
					name: 'Future lunch',
					meals: created.entry.meals
				})
			})
		).rejects.toThrow('Choose a valid date.');
	});

	it('switches a custom nutrition goal back to the estimate', async () => {
		const now = new Date('2026-03-20T12:00:00.000Z');
		const store = trackedStore();
		const state = createDefaultAppState(now);
		state.nutrition.profile = nutritionProfile();
		await store.replaceState(state);
		const service = new LocalAppService(store, () => now);

		await service.request('/api/app/profile', {
			method: 'PATCH',
			body: JSON.stringify({ ...nutritionProfile(), goalMode: 'estimated' })
		});

		expect((await store.read()).nutrition.profile?.goalMode).toBe('estimated');
	});
});

function nutritionProfile() {
	return {
		weightKg: 70,
		heightCm: 175,
		age: 30,
		gender: 'male' as const,
		activityLevel: 'moderate' as const,
		dailyCalorieGoal: 2200,
		goalMode: 'custom' as const,
		eatingWindowEnabled: false,
		eatingWindowStart: '12:00',
		eatingWindowEnd: '20:00'
	};
}

function trackedStore() {
	const store = new LocalAppStore(
		new LocalAppDatabase(`local-service-test-${crypto.randomUUID()}`)
	);
	stores.push(store);
	return store;
}
