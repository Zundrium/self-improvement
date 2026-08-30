import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appTrackers } from '$lib/trackers/registry';
import {
	achievementCatalog,
	eventAchievementIds,
	TRACKER_MILESTONE_TARGETS
} from './achievement-catalog';
import { recordAchievementUnlock } from './achievement-engine';
import { buildGamification } from './gamification';
import { createDefaultAppState, type LocalAppState } from './state';

const lucideIconTypings = readFileSync(
	new URL('../../../node_modules/@lucide/svelte/dist/icons/index.d.ts', import.meta.url),
	'utf8'
);

const milestoneTitleBounds = {
	steps: ['First Steps', 'Century Walker'],
	sleep: ['Good Night', 'Century of Rest'],
	'screen-time': ['First Boundary', 'Screen Sage'],
	fitness: ['First Rep', 'Fitness Centurion'],
	nutrition: ['First Bite', 'Century of Nourishment'],
	meditation: ['First Stillness', 'Hundred Moments of Calm'],
	breathing: ['First Breath', 'Breathe Easy'],
	stretch: ['First Reach', 'Century Stretch'],
	happiness: ['First Check-in', 'Hundred Honest Moments'],
	period: ['First Entry', 'Century of Care']
} as const;

describe('achievement catalog', () => {
	it('defines all sixty approved tracker milestones and titles', () => {
		const milestones = achievementCatalog.filter(
			({ category }) => category === 'tracker-milestone'
		);

		expect(milestones).toHaveLength(60);
		for (const tracker of appTrackers) {
			const trackerMilestones = milestones.filter(({ trackerId }) => trackerId === tracker.id);
			expect(trackerMilestones.map(({ target }) => target)).toEqual(TRACKER_MILESTONE_TARGETS);
			expect([trackerMilestones[0].title, trackerMilestones.at(-1)?.title]).toEqual(
				milestoneTitleBounds[tracker.id]
			);
		}
	});

	it('contains exactly the approved achievement families', () => {
		expect(achievementCatalog).toHaveLength(129);
		expect(achievementCatalog.filter(({ category }) => category === 'score')).toHaveLength(5);
		expect(achievementCatalog.filter(({ category }) => category === 'streak')).toHaveLength(5);
		expect(achievementCatalog.filter(({ category }) => category === 'overall')).toHaveLength(6);
		expect(
			achievementCatalog.filter(({ category }) => category === 'tracker-special')
		).toHaveLength(30);
		expect(achievementCatalog.filter(({ category }) => category === 'combination')).toHaveLength(
			10
		);
		expect(achievementCatalog.filter(({ category }) => category === 'event')).toHaveLength(13);
		expect(eventAchievementIds).toHaveLength(7);

		for (const tracker of appTrackers) {
			expect(
				achievementCatalog.filter(
					({ category, trackerId }) => category === 'tracker-special' && trackerId === tracker.id
				)
			).toHaveLength(3);
		}
	});

	it('uses globally unique IDs and real, globally unique Lucide icon exports', () => {
		const ids = achievementCatalog.map(({ id }) => id);
		const icons = achievementCatalog.map(({ icon }) => icon);

		expect(new Set(ids).size).toBe(ids.length);
		expect(new Set(icons).size).toBe(icons.length);
		for (const icon of icons) {
			expect(lucideIconTypings).toContain(`default as ${icon} }`);
		}
		expect(() => JSON.stringify(achievementCatalog)).not.toThrow();
	});
});

describe('achievement engine', () => {
	it('counts distinct tracker completion dates for milestones', () => {
		const state = achievementState();
		state.steps.days = [
			...Array.from({ length: 5 }, (_, index) => stepDay(`2026-03-${10 + index}`, 5_000)),
			stepDay('2026-03-10', 8_000)
		];

		const data = buildGamification(state, new Date('2026-03-20T12:00:00.000Z'));

		expect(achievement(data, 'steps-5')).toMatchObject({
			unlocked: true,
			progress: 5,
			trackerId: 'steps',
			category: 'tracker-milestone',
			unlockedAt: '2026-03-20T12:00:00.000Z'
		});
		expect(achievement(data, 'steps-10')).toMatchObject({ unlocked: false, progress: 5 });
	});

	it('keeps every definition visible when all trackers are disabled', () => {
		const state = achievementState();
		state.enabledTrackerIds = [];

		const data = buildGamification(state, new Date('2026-03-20T12:00:00.000Z'));

		expect(data.achievements).toHaveLength(achievementCatalog.length);
		expect(data.achievements.some(({ trackerId }) => trackerId === 'period')).toBe(true);
	});

	it('persists derived unlocks so removed data cannot relock them', () => {
		const state = achievementState();
		state.meditation.sessions = [10, 11, 12].map((day) => ({
			id: `meditation-${day}`,
			localDate: `2026-03-${day}`,
			durationSeconds: 300,
			startedAt: day
		}));
		const unlocked = buildGamification(state, new Date('2026-03-12T12:00:00.000Z'));
		state.meditation.sessions = [];

		const afterRemoval = buildGamification(state, new Date('2026-03-13T12:00:00.000Z'));

		expect(achievement(unlocked, 'streak-3')).toMatchObject({
			unlocked: true,
			unlockedAt: '2026-03-12T12:00:00.000Z'
		});
		expect(achievement(afterRemoval, 'streak-3')).toMatchObject({
			unlocked: true,
			unlockedAt: '2026-03-12T12:00:00.000Z'
		});
		expect(
			state.gamification.achievementUnlocks.filter(
				({ achievementId }) => achievementId === 'streak-3'
			)
		).toHaveLength(1);
	});

	it('derives overall achievements from tracker history', () => {
		const state = achievementState();
		state.screenTime.trackedPackages = ['tracked.app'];
		for (let index = 0; index < 5; index += 1) {
			addCompleteDate(state, `2026-03-${10 + index}`, index);
		}

		const data = buildGamification(state, new Date('2026-03-20T12:00:00.000Z'));

		expect(achievement(data, 'first-glimmer').unlocked).toBe(true);
		expect(achievement(data, 'score-500').unlocked).toBe(true);
		expect(achievement(data, 'all-trackers-ever').unlocked).toBe(true);
		expect(achievement(data, 'trackers-same-day-5').unlocked).toBe(true);
		expect(achievement(data, 'perfect-days-5').unlocked).toBe(true);
	});

	it('evaluates all thirty tracker specials from local state evidence', () => {
		const state = achievementState();
		state.gamification.startedLocalDate = '2026-01-01';
		state.screenTime.trackedPackages = ['tracked.app'];
		state.steps.days.push(stepDay('2026-01-01', 20_000));
		for (let index = 0; index < 30; index += 1) {
			const date = addDays('2026-01-01', index);
			state.sleep.days.push(sleepDay(date));
			state.screenTime.days.push(screenDay(date, 60));
			state.fitness.completedDays.push({
				workoutId: index + 1,
				dateKey: date,
				completedAt: `${date}T07:00:00.000Z`
			});
		}
		state.fitness.completedDays.push({
			workoutId: 1,
			dateKey: '2026-02-01',
			completedAt: '2026-02-01T07:00:00.000Z'
		});
		state.nutrition.profile = nutritionProfile();
		state.nutrition.entries.push(photoNutritionEntry('2026-01-01'));
		state.nutrition.fastingDates.push('2026-01-02');
		for (let index = 0; index < 20; index += 1) {
			state.meditation.sessions.push({
				id: `meditation-${index}`,
				localDate: addDays('2026-01-01', index),
				durationSeconds: 1_800,
				startedAt: Date.parse(`${addDays('2026-01-01', index)}T12:00:00.000Z`)
			});
		}
		for (let index = 0; index < 10; index += 1) {
			const date = addDays('2026-01-01', index);
			state.breathing.exercises.push({
				localDate: date,
				technique: index === 0 ? '4-7-8' : '4-8',
				durationSeconds: 360,
				startedAt: Date.parse(`${date}T13:00:00.000Z`)
			});
		}
		for (let index = 0; index < 5; index += 1) {
			const date = addDays('2026-01-05', index);
			state.stretch.sessions.push({
				id: `stretch-${index}`,
				localDate: date,
				holdSeconds: 60,
				completedAt: `${date}T06:00:00.000Z`,
				hardVariationCompleted: index === 0
			});
		}
		state.happiness.entries.push({
			localDate: '2026-01-01',
			rating: 5,
			reasons: ['gratitude', 'meaningful_connection'],
			updatedAt: '2026-01-01T08:00:00.000Z'
		});
		for (const [index, date] of ['2026-01-01', '2026-01-29', '2026-02-26'].entries()) {
			state.period.entries.push({
				localDate: date,
				flow: 'medium',
				notes: index === 0 ? 'Cycle notes' : '',
				updatedAt: `${date}T08:00:00.000Z`
			});
		}

		const data = buildGamification(state, new Date('2026-03-20T12:00:00.000Z'));
		const specials = data.achievements.filter(({ category }) => category === 'tracker-special');

		expect(specials).toHaveLength(30);
		expect(specials.filter(({ unlocked }) => !unlocked)).toEqual([]);
		expect(achievement(data, 'fitness-return-after-cycle').unlocked).toBe(true);
		expect(achievement(data, 'stretch-full-week').progress).toBe(5);
		expect(achievement(data, 'period-three-cycle-starts').progress).toBe(3);
	});

	it('requires ordered evidence for sequence combinations and derives all ten combinations', () => {
		const state = achievementState();
		state.screenTime.trackedPackages = ['tracked.app'];
		addCompleteDate(state, '2026-03-10', 0);
		state.stretch.sessions[0].completedAt = '2026-03-10T08:00:00.000Z';
		state.fitness.completedDays[0].completedAt = '2026-03-10T09:00:00.000Z';
		state.happiness.entries[0].rating = 4;
		state.happiness.entries.push({
			localDate: '2026-03-11',
			rating: 2,
			reasons: ['stress'],
			updatedAt: '2026-03-11T08:00:00.000Z'
		});
		state.breathing.exercises.push({
			localDate: '2026-03-11',
			technique: '4-7-8',
			durationSeconds: 60,
			startedAt: Date.parse('2026-03-11T09:00:00.000Z')
		});
		state.fitness.completedDays.push({
			workoutId: 12,
			dateKey: '2026-03-12',
			completedAt: '2026-03-12T10:00:00.000Z'
		});
		state.sleep.days.push(sleepDay('2026-03-13'));

		const data = buildGamification(state, new Date('2026-03-20T12:00:00.000Z'));

		expect(
			data.achievements
				.filter(({ category }) => category === 'combination')
				.filter(({ unlocked }) => !unlocked)
		).toEqual([]);
		expect(achievement(data, 'combination-stretch-then-fitness').unlocked).toBe(true);
		expect(achievement(data, 'combination-low-happiness-then-calm').unlocked).toBe(true);
		expect(achievement(data, 'combination-fitness-then-sleep').unlocked).toBe(true);
	});

	it('does not treat Fitness before Stretch as the ordered combination', () => {
		const state = achievementState();
		state.fitness.completedDays.push({
			workoutId: 10,
			dateKey: '2026-03-10',
			completedAt: '2026-03-10T08:00:00.000Z'
		});
		state.stretch.sessions.push({
			id: 'stretch',
			localDate: '2026-03-10',
			holdSeconds: 30,
			completedAt: '2026-03-10T09:00:00.000Z'
		});

		const data = buildGamification(state, new Date('2026-03-20T12:00:00.000Z'));

		expect(achievement(data, 'combination-stretch-then-fitness').unlocked).toBe(false);
	});

	it('derives state-backed setup items and records external event items', () => {
		const state = achievementState();
		state.user.name = 'Sem';
		state.steps.dailyGoal = 8_000;
		state.enabledTrackerIds = state.enabledTrackerIds.filter((id) => id !== 'period');
		state.rewards = Array.from({ length: 5 }, (_, index) => ({
			id: `reward-${index}`,
			name: `Reward ${index}`,
			emoji: '⭐',
			price: 10
		}));
		state.redemptions.push({ ...state.rewards[0], redeemedAt: '2026-03-18T09:00:00.000Z' });
		const unlockedAt = new Date('2026-03-18T09:30:00.000Z');

		expect(recordAchievementUnlock(state, 'event-first-backup', unlockedAt)).toBe(true);
		expect(recordAchievementUnlock(state, 'event-first-backup', unlockedAt)).toBe(false);
		const data = buildGamification(state, new Date('2026-03-20T12:00:00.000Z'));

		for (const id of [
			'setup-profile-name-customized',
			'setup-tracker-setting-customized',
			'setup-tracker-visibility-customized',
			'event-first-reward',
			'event-five-rewards',
			'event-first-reward-redemption'
		]) {
			expect(achievement(data, id).unlocked).toBe(true);
		}
		expect(achievement(data, 'event-first-backup')).toMatchObject({
			unlocked: true,
			progress: 1,
			unlockedAt: '2026-03-18T09:30:00.000Z'
		});
		expect(achievement(data, 'setup-openrouter-configured').unlocked).toBe(false);
		expect(() => recordAchievementUnlock(state, 'not-in-catalog')).toThrow(/Unknown achievement/);
	});
});

function achievement(data: ReturnType<typeof buildGamification>, id: string) {
	const item = data.achievements.find((achievement) => achievement.id === id);
	if (!item) throw new Error(`Missing achievement: ${id}`);
	return item;
}

function achievementState() {
	const state = createDefaultAppState(new Date('2026-03-01T12:00:00.000Z'));
	state.gamification.startedLocalDate = '2026-03-01';
	return state;
}

function addCompleteDate(state: LocalAppState, date: string, index: number) {
	state.steps.days.push(stepDay(date, state.steps.dailyGoal * 2));
	state.sleep.days.push(sleepDay(date));
	state.screenTime.days.push(screenDay(date, 10));
	state.fitness.completedDays.push({
		workoutId: index + 1,
		dateKey: date,
		completedAt: `${date}T09:00:00.000Z`
	});
	state.nutrition.fastingDates.push(date);
	state.meditation.sessions.push({
		id: `meditation-${index}`,
		localDate: date,
		durationSeconds: 600,
		startedAt: Date.parse(`${date}T10:00:00.000Z`)
	});
	state.breathing.exercises.push({
		localDate: date,
		technique: '4-7-8',
		durationSeconds: 60,
		startedAt: Date.parse(`${date}T11:00:00.000Z`)
	});
	state.stretch.sessions.push({
		id: `stretch-${index}`,
		localDate: date,
		holdSeconds: 60,
		completedAt: `${date}T08:00:00.000Z`,
		hardVariationCompleted: true
	});
	state.happiness.entries.push({
		localDate: date,
		rating: 5,
		reasons: ['gratitude', 'meaningful_connection'],
		updatedAt: `${date}T07:00:00.000Z`
	});
	state.period.entries.push({
		localDate: date,
		flow: 'medium',
		notes: 'A note',
		updatedAt: `${date}T12:00:00.000Z`
	});
}

function stepDay(date: string, count: number) {
	return { date, count, sourceEndAt: `${date}T12:00:00.000Z` };
}

function sleepDay(localDate: string): LocalAppState['sleep']['days'][number] {
	return {
		localDate,
		configuredBedtime: '22:30',
		windowStartAt: null,
		windowEndAt: null,
		lateUsageSeconds: 0,
		latestScreenActivityAt: null,
		usedApps: [],
		violatingApps: [],
		status: 'pass',
		sourceTimestamp: null
	};
}

function screenDay(date: string, minutes: number): LocalAppState['screenTime']['days'][number] {
	return {
		date,
		totalMinutes: minutes,
		apps: [
			{
				package: 'tracked.app',
				name: 'Tracked',
				minutes,
				last_used: `${date}T12:00:00.000Z`
			}
		],
		sourceTimestamp: `${date}T12:00:00.000Z`
	};
}

function nutritionProfile(): NonNullable<LocalAppState['nutrition']['profile']> {
	return {
		weightKg: 70,
		heightCm: 175,
		age: 30,
		gender: 'male',
		activityLevel: 'moderate',
		dailyCalorieGoal: 2_000,
		goalMode: 'estimated',
		eatingWindowEnabled: false,
		eatingWindowStart: '08:00',
		eatingWindowEnd: '20:00'
	};
}

function photoNutritionEntry(date: string): LocalAppState['nutrition']['entries'][number] {
	const totals = { calories: 100, proteinG: 5, carbsG: 10, fatG: 4, count: 1 };
	return {
		id: 'photo-entry',
		date,
		name: 'Photo meal',
		notes: '',
		createdAt: `${date}T12:00:00.000Z`,
		thumbnail: 'data:image/jpeg;base64,YQ==',
		meals: [
			{
				id: 'photo-meal',
				name: 'Meal',
				imageDataUrl: 'data:image/jpeg;base64,YQ==',
				ingredients: [],
				totals
			}
		],
		totals
	};
}

function addDays(value: string, days: number) {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}
