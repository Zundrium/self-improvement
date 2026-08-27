import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type {
	ActionFeedData,
	AppBootstrapData,
	BreathingData,
	DaySummaryData,
	FitnessData,
	GamificationData,
	HappinessData,
	MeditationData,
	NutritionEntryData,
	PeriodData,
	ScreenTimeData,
	TrackerSettingsDataMap
} from '$lib/api-types';
import { LocalAppService } from './service';
import { createDefaultAppState, LocalAppDatabase, LocalAppStore } from './state';

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

	it('serves and persists typed tracker settings endpoints', async () => {
		const store = trackedStore();
		const service = new LocalAppService(store);

		expect(
			await service.request<TrackerSettingsDataMap['steps']>('/api/app/steps/settings')
		).toEqual({ dailyGoal: 5_000 });
		expect(
			await service.request<TrackerSettingsDataMap['screen-time']>('/api/app/screen-time/settings')
		).toEqual({ dailyLimitMinutes: 240 });
		expect(
			await service.request<TrackerSettingsDataMap['fitness']>('/api/app/fitness/settings')
		).toEqual({ defaultSets: 2 });
		expect(
			await service.request<TrackerSettingsDataMap['meditation']>('/api/app/meditation/settings')
		).toEqual({ defaultDurationSeconds: 300 });
		expect(
			await service.request<TrackerSettingsDataMap['breathing']>('/api/app/breathing/settings')
		).toEqual({ rounds: 6, includeHold: true });
		expect(
			await service.request<TrackerSettingsDataMap['happiness']>('/api/app/happiness/settings')
		).toEqual({ defaultRating: 3 });
		expect(
			await service.request<TrackerSettingsDataMap['period']>('/api/app/period/settings')
		).toEqual({ defaultFlow: 'medium', fallbackCycleDays: 28 });

		await service.request('/api/app/steps/settings', patch({ dailyGoal: 8_000 }));
		await service.request('/api/app/screen-time/settings', patch({ dailyLimitMinutes: 90 }));
		await service.request('/api/app/fitness/settings', patch({ defaultSets: 4 }));
		await service.request('/api/app/meditation/settings', patch({ defaultDurationSeconds: 600 }));
		await service.request('/api/app/breathing/settings', patch({ rounds: 2, includeHold: false }));
		await service.request('/api/app/happiness/settings', patch({ defaultRating: 4 }));
		await service.request(
			'/api/app/period/settings',
			patch({ defaultFlow: 'heavy', fallbackCycleDays: 35 })
		);

		const state = await store.read();
		expect(state.steps.dailyGoal).toBe(8_000);
		expect(state.screenTime.dailyLimitMinutes).toBe(90);
		expect(state.fitness.defaultSets).toBe(4);
		expect(state.meditation.defaultDurationSeconds).toBe(600);
		expect(state.breathing).toMatchObject({ rounds: 2, includeHold: false });
		expect(state.happiness.defaultRating).toBe(4);
		expect(state.period).toMatchObject({ defaultFlow: 'heavy', fallbackCycleDays: 35 });
	});

	it('applies persisted defaults to tracker data and new entries', async () => {
		const now = new Date('2026-03-20T12:00:00.000Z');
		const store = trackedStore();
		const service = new LocalAppService(store, () => now);
		await service.request('/api/app/fitness/settings', patch({ defaultSets: 4 }));
		await service.request('/api/app/meditation/settings', patch({ defaultDurationSeconds: 600 }));
		await service.request('/api/app/breathing/settings', patch({ rounds: 2, includeHold: false }));
		await service.request('/api/app/happiness/settings', patch({ defaultRating: 4 }));
		await service.request(
			'/api/app/period/settings',
			patch({ defaultFlow: 'heavy', fallbackCycleDays: 35 })
		);

		const fitness = await service.request<FitnessData>('/api/app/fitness?date=2026-03-10');
		const overriddenFitness = await service.request<FitnessData>(
			'/api/app/fitness?date=2026-03-10&sets=6'
		);
		const meditation = await service.request<MeditationData>('/api/app/meditation');
		const requestedMeditation = await service.request<MeditationData>(
			'/api/app/meditation?duration=60'
		);
		const breathing = await service.request<BreathingData>('/api/app/breathing');
		const exercise = await service.request<{ durationSeconds: number; technique: string }>(
			'/api/app/breathing',
			{
				method: 'POST',
				body: JSON.stringify({ localDate: '2026-03-20', startedAt: now.getTime() })
			}
		);
		await service.request('/api/app/happiness', {
			method: 'PUT',
			body: JSON.stringify({ localDate: '2026-03-20', reasons: ['gratitude'] })
		});
		await service.request('/api/app/period', {
			method: 'PUT',
			body: JSON.stringify({ localDate: '2026-03-20', notes: '' })
		});
		const happiness = await service.request<HappinessData>('/api/app/happiness');
		const period = await service.request<PeriodData>('/api/app/period');

		expect(fitness.program.workouts.find(({ day }) => day === 10)?.sets).toBe(4);
		expect(overriddenFitness.program.workouts.find(({ day }) => day === 10)?.sets).toBe(6);
		expect(meditation.initialDurationSeconds).toBe(600);
		expect(requestedMeditation.initialDurationSeconds).toBe(60);
		expect(breathing.settings).toEqual({ rounds: 2, includeHold: false });
		expect(exercise).toMatchObject({ technique: '4-8', durationSeconds: 24 });
		expect(happiness.entry?.rating).toBe(4);
		expect(period.entry?.flow).toBe('heavy');
		expect(period.cycle).toMatchObject({ averageCycleDays: 35, averageFromHistory: false });
	});

	it('uses the screen-time limit in data, actions, and gamification', async () => {
		const now = new Date('2026-03-20T12:00:00.000Z');
		const store = trackedStore();
		const state = createDefaultAppState(now);
		state.enabledTrackerIds = ['screen-time'];
		state.gamification.startedLocalDate = '2026-03-19';
		state.screenTime.dailyLimitMinutes = 30;
		state.screenTime.trackedPackages = ['app.focus'];
		state.screenTime.days = ['2026-03-19', '2026-03-20'].map((date) => ({
			date,
			totalMinutes: 40,
			apps: [
				{
					package: 'app.focus',
					name: 'Focus',
					minutes: 40,
					last_used: `${date}T11:00:00.000Z`
				}
			],
			sourceTimestamp: `${date}T12:00:00.000Z`
		}));
		await store.replaceState(state);
		const service = new LocalAppService(store, () => now);

		const screenTime = await service.request<ScreenTimeData>('/api/app/screen-time');
		const summary = await service.request<DaySummaryData>('/api/app/day-summary');
		const feed = await service.request<ActionFeedData>('/api/app/action-feed');
		const belowLimitGamification = await service.request<GamificationData>('/api/app/gamification');

		expect(screenTime.settings.dailyLimitMinutes).toBe(30);
		expect(summary.screenTimeLimitMinutes).toBe(30);
		expect(feed.items[0]?.title).toBe('Screen-time limit exceeded by 10m');
		expect(belowLimitGamification.score).toBe(0);

		await service.request('/api/app/screen-time/settings', patch({ dailyLimitMinutes: 50 }));
		const aboveLimitGamification = await service.request<GamificationData>('/api/app/gamification');
		expect(aboveLimitGamification.score).toBe(20);
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

	it('shows nutrition setup until the nutrition profile is configured', async () => {
		const now = new Date('2026-03-10T12:00:00.000Z');
		const store = trackedStore();
		const state = createDefaultAppState(now);
		state.enabledTrackerIds = ['nutrition'];
		await store.replaceState(state);
		const service = new LocalAppService(store, () => now);

		const feed = await service.request<ActionFeedData>('/api/app/action-feed');

		expect(feed.items).toEqual([
			expect.objectContaining({
				id: 'nutrition.setup',
				title: 'Set up your nutrition goals',
				action: { type: 'navigate', href: '/nutrition/onboarding' }
			})
		]);
		await store.update((current) => {
			current.nutrition.profile = nutritionProfile();
		});
		const configuredFeed = await service.request<ActionFeedData>('/api/app/action-feed');
		expect(configuredFeed.items).toEqual([]);
	});

	it('builds the action feed from local tracker candidates', async () => {
		const now = new Date('2026-03-10T20:00:00.000Z');
		const store = trackedStore();
		const state = createDefaultAppState(now);
		state.enabledTrackerIds = ['fitness'];
		await store.replaceState(state);
		const service = new LocalAppService(store, () => now);

		const feed = await service.request<ActionFeedData>('/api/app/action-feed');

		expect(feed.items).toEqual([
			expect.objectContaining({
				id: 'fitness.quick-evening-workout:2026-03-10',
				reason: '3 minutes to feel stronger',
				action: { type: 'navigate', href: '/fitness?date=2026-03-10&sets=1' }
			})
		]);
	});

	it('describes the short duration of wellbeing actions', async () => {
		const now = new Date('2026-03-10T12:00:00.000Z');
		const store = trackedStore();
		const state = createDefaultAppState(now);
		state.enabledTrackerIds = ['meditation', 'breathing', 'happiness'];
		await store.replaceState(state);
		const service = new LocalAppService(store, () => now);

		const feed = await service.request<ActionFeedData>('/api/app/action-feed');

		expect(feed.items).toEqual([
			expect.objectContaining({
				id: 'happiness.daily-check-in:2026-03-10',
				title: 'How are you feeling today?',
				reason: '15 seconds to check in with yourself'
			}),
			expect.objectContaining({
				id: 'meditation.daily-session:2026-03-10',
				title: "Let's meditate now",
				reason: '5 minutes to feel rested'
			}),
			expect.objectContaining({
				id: 'breathing.daily-exercise:2026-03-10',
				title: "Let's breathe now",
				reason: 'A guided exercise to feel at ease'
			})
		]);
	});

	it('opens a fitness action with the requested lower set count', async () => {
		const now = new Date('2026-03-10T20:00:00.000Z');
		const service = new LocalAppService(trackedStore(), () => now);

		const fitness = await service.request<FitnessData>('/api/app/fitness?date=2026-03-10&sets=3');
		const workout = fitness.program.workouts.find(({ day }) => day === 10);

		expect(workout?.sets).toBe(3);
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

function patch(body: Record<string, unknown>): RequestInit {
	return { method: 'PATCH', body: JSON.stringify(body) };
}

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
