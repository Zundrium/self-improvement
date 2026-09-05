import type { ActionCandidate } from '$lib/actions/contracts';
import { buildActionEnvironment } from '$lib/actions/environment';
import { selectActionFeedItems } from '$lib/actions/selector';
import type {
	ActionFeedData,
	DaySummaryData,
	LocalOperationMap,
	NutritionEntryData,
	NutritionFastingStatusData,
	NutritionLogData,
	ProfileData
} from '$lib/app/model';
import type { BreathingData } from '$lib/local/breathing/model';
import type { ChoresData } from '$lib/local/chores/model';
import type { ExerciseData, FitnessData } from '$lib/local/fitness/model';
import type { Reward, RewardsData } from '$lib/local/gamification/model';
import type { HappinessData } from '$lib/local/happiness/model';
import type { MeditationData } from '$lib/local/meditation/model';
import type { PeriodData } from '$lib/local/period/model';
import type { ScreenTimeData } from '$lib/local/screen-time/model';
import type { SleepData, SleepSettingsData } from '$lib/local/sleep/model';
import type { StepsData } from '$lib/local/steps/model';
import type { StretchData } from '$lib/local/stretch/model';
import type { TrackerSettingsDataMap } from '$lib/trackers/model';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from '$lib/trackers/dates';
import { trackerProgressDays } from '$lib/trackers/progress';
import { appTrackers, isAppTrackerId } from '$lib/trackers/registry';
import { breathingDurationSeconds } from './breathing/model';
import { CHORES_DURATION_SECONDS } from './chores/model';
import { defaultWorkoutSets } from './fitness/model';
import {
	type HappinessRating,
	type HappinessReason,
	happinessRatings,
	isHappinessReasonForRating
} from './happiness/model';
import { type MenstruationFlow, cycleSummary, menstruationFlows } from './period/model';
import { summarizeUsage } from './screen-time/model';
import { isStretchScheduled } from './stretch/model';
import { buildActionSnapshot } from './action-snapshot';
import { recordAchievementUnlock } from './achievement-engine';
import { notifyNewTrackerCompletions } from './completion-events';
import { exercisePreferences, fitnessProgram, workoutDay } from './fitness-program';
import { buildGamification } from './gamification';
import * as nutritionMutations from './nutrition/mutations';
import * as nutritionQueries from './nutrition/queries';
import { estimatedTdee, nutritionProfile, sumEntries } from './nutrition';
import { type LocalAppState, type LocalAppStore, type LocalDomain, localAppStore } from './state';
import {
	STRETCH_ACTIVITY_IDS,
	STRETCH_DIFFICULTIES_BY_ACTIVITY,
	type StretchDifficulties,
	type StretchDifficulty
} from './tracker-settings';

export class LocalServiceError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

export class LocalAppService {
	private reconciliationDate: string | undefined;

	constructor(
		private readonly store: LocalAppStore = localAppStore,
		private readonly clock: () => Date = () => new Date(),
		private readonly actionCandidates: readonly ActionCandidate[] = []
	) {}

	resetCaches() {
		this.reconciliationDate = undefined;
	}

	async request<T>(path: string, init?: RequestInit): Promise<T> {
		const url = localUrl(path);
		const method = (init?.method ?? 'GET').toUpperCase();
		const body = requestBody(init?.body);
		return this.dispatch(url, method, body) as Promise<T>;
	}

	async execute<K extends keyof LocalOperationMap>(
		operation: K,
		input: LocalOperationMap[K]['input']
	): Promise<LocalOperationMap[K]['output']> {
		let result: unknown;
		if (operation === 'bootstrap') result = await this.bootstrap();
		else if (operation === 'gamification') result = await this.gamification();
		else if (operation === 'nutritionLog')
			result = await nutritionQueries.log(
				this.nutritionQueryContext(),
				(input as LocalOperationMap['nutritionLog']['input']).date
			);
		else if (operation === 'nutritionEntry')
			result = await nutritionQueries.entry(
				this.nutritionQueryContext(),
				(input as LocalOperationMap['nutritionEntry']['input']).entryId
			);
		else if (operation === 'nutritionFastingStatus')
			result = await nutritionQueries.fasting(
				this.nutritionQueryContext(),
				(input as LocalOperationMap['nutritionFastingStatus']['input']).date
			);
		else if (operation === 'createNutritionEntry')
			result = await nutritionMutations.createEntry(
				this.nutritionMutationContext(),
				input as unknown as Record<string, unknown>
			);
		else if (operation === 'updateNutritionEntry') {
			const value = input as LocalOperationMap['updateNutritionEntry']['input'];
			result = await nutritionMutations.updateEntry(
				this.nutritionMutationContext(),
				value.entryId,
				value.entry as unknown as Record<string, unknown>
			);
		} else if (operation === 'deleteNutritionEntry')
			result = await nutritionMutations.deleteEntry(
				this.nutritionMutationContext(),
				(input as LocalOperationMap['deleteNutritionEntry']['input']).entryId
			);
		else if (operation === 'markNutritionFasting')
			result = await nutritionMutations.markFasting(
				this.nutritionMutationContext(),
				input as unknown as Record<string, unknown>
			);
		else if (operation === 'cancelNutritionFasting')
			result = await nutritionMutations.cancelFasting(
				this.nutritionMutationContext(),
				(input as LocalOperationMap['cancelNutritionFasting']['input']).date
			);
		else if (operation === 'saveNutritionProfile') {
			const value = input as LocalOperationMap['saveNutritionProfile']['input'];
			result = await this.profile(
				value.mode === 'create' ? 'POST' : 'PATCH',
				value.profile as unknown as Record<string, unknown>
			);
		} else if (operation === 'unlockAchievements')
			result = await this.unlockAchievements('POST', {
				achievementIds: (input as LocalOperationMap['unlockAchievements']['input']).achievementIds
			});
		else throw new Error(`Unknown local operation: ${String(operation)}`);
		return result as LocalOperationMap[K]['output'];
	}

	private dispatch(url: URL, method: string, body: Record<string, unknown>) {
		const path = url.pathname;
		if (path === '/api/app/bootstrap' && method === 'GET') return this.bootstrap();
		if (path === '/api/app/gamification' && method === 'GET') return this.gamification();
		if (path === '/api/app/achievements/unlock') return this.unlockAchievements(method, body);
		if (path === '/api/app/profile') return this.profile(method, body);
		if (path === '/api/app/steps' && method === 'GET') return this.steps(url);
		if (path === '/api/app/sleep') return this.sleep(url, method, body);
		if (path === '/api/app/screen-time') return this.screenTime(url, method, body);
		if (path === '/api/app/fitness' && method === 'GET') return this.fitness(url);
		if (path === '/api/app/fitness/exercises' && method === 'GET') return this.exercises();
		if (path === '/api/app/meditation') return this.meditation(url, method, body);
		if (path === '/api/app/breathing') return this.breathing(url, method, body);
		if (path === '/api/app/stretch') return this.stretch(url, method, body);
		if (path === '/api/app/chores') return this.chores(url, method, body);
		if (path === '/api/app/happiness') return this.happiness(url, method, body);
		if (path === '/api/app/period') return this.period(url, method, body);
		if (path === '/api/app/rewards' && method === 'GET') return this.rewards();
		if (path === '/api/app/rewards' && method === 'POST') return this.createReward(body);
		if (path === '/api/app/day-summary' && method === 'GET') return this.daySummary(url);
		if (path === '/api/app/action-feed' && method === 'GET') return this.actionFeed(url);
		if (path === '/api/app/nutrition/entries' && method === 'POST')
			return this.createNutritionEntry(body);
		return this.dispatchParameterized(url, method, body);
	}

	private dispatchParameterized(url: URL, method: string, body: Record<string, unknown>) {
		const segments = url.pathname.split('/').filter(Boolean);
		if (
			segments.length === 4 &&
			segments.slice(0, 2).join('/') === 'api/app' &&
			segments[3] === 'settings'
		)
			return this.trackerSettings(segments[2], method, body);
		if (segments.slice(0, 4).join('/') === 'api/app/fitness/progress')
			return this.fitnessProgress(Number(segments[4]), url, method, body);
		if (segments.slice(0, 4).join('/') === 'api/app/fitness/exercises' && segments[5] === 'speed')
			return this.exerciseSpeed(Number(segments[4]), method, body);
		if (segments.slice(0, 4).join('/') === 'api/app/nutrition/log')
			return this.nutritionLog(segments[4]);
		if (segments.slice(0, 4).join('/') === 'api/app/nutrition/entry')
			return this.nutritionEntry(segments[4], method, body);
		if (segments.slice(0, 4).join('/') === 'api/app/nutrition/fasting')
			return this.fasting(segments[4], method, body);
		if (segments.slice(0, 3).join('/') === 'api/app/rewards')
			return this.rewardRoute(segments[3], segments[4], method, body);
		throw new LocalServiceError(404, `Local route not found: ${url.pathname}`);
	}

	private async bootstrap() {
		const today = this.today();
		const state =
			this.reconciliationDate === today
				? await this.store.readGamificationProjection()
				: await this.store.updateGamificationProjection(['gamification'], (state) => {
						buildGamification(state, this.clock());
					});
		this.reconciliationDate = today;
		return {
			profile: state.user,
			enabledTrackers: enabledTrackers(state),
			gamification: buildGamification(structuredClone(state), this.clock())
		};
	}

	private async gamification() {
		const state = await this.store.readGamificationProjection();
		return buildGamification(structuredClone(state), this.clock());
	}

	private async unlockAchievements(method: string, body: Record<string, unknown>) {
		if (method !== 'POST') throw methodNotAllowed();
		if (!Array.isArray(body.achievementIds)) throw badRequest('Expected achievement IDs.');
		const achievementIds = unique(body.achievementIds.map(String));
		const unlocked: string[] = [];
		await this.store.updateDomains(['gamification'], (state) => {
			for (const achievementId of achievementIds) {
				try {
					if (recordAchievementUnlock(state, achievementId, this.clock()))
						unlocked.push(achievementId);
				} catch {
					throw badRequest(`Unknown achievement: ${achievementId}`);
				}
			}
		});
		return { unlocked };
	}

	private async profile(method: string, body: Record<string, unknown>) {
		if (method === 'GET') return profileData(await this.store.readProfileOverview());
		if (method !== 'PATCH' && method !== 'POST') throw methodNotAllowed();
		const domain =
			Array.isArray(body.trackers) || typeof body.name === 'string' ? 'profile' : 'nutrition';
		await this.updateWithCompletionNotification([domain], (state) =>
			updateProfile(state, body, method)
		);
		return { message: method === 'POST' ? 'Nutrition profile created.' : 'Profile updated.' };
	}

	private async trackerSettings(trackerId: string, method: string, body: Record<string, unknown>) {
		if (!isSettingsTrackerId(trackerId))
			throw new LocalServiceError(404, 'Tracker settings not found.');
		const domain = settingsDomain(trackerId);
		if (method === 'GET')
			return settingsForTracker(await this.store.readTrackerSettings(domain), trackerId);
		if (method !== 'PATCH') throw methodNotAllowed();
		const state = await this.updateWithCompletionNotification([domain], (state) => {
			updateTrackerSettings(state, trackerId, body);
		});
		return settingsForTracker(state, trackerId);
	}

	private async steps(url: URL): Promise<StepsData> {
		const state = await this.store.readDomains(['steps']);
		const today = this.today();
		const date = selectedDate(url, today);
		const keys = dateKeysEndingAt(today, 7);
		const counts = new Map(state.steps.days.map((day) => [day.date, day.count]));
		return {
			settings: settingsForTracker(state, 'steps'),
			connection: { dailyGoal: state.steps.dailyGoal, lastReceivedAt: state.steps.lastReceivedAt },
			isSynced: Boolean(state.steps.lastReceivedAt),
			hasData: state.steps.days.some(({ count }) => count > 0),
			date,
			today,
			steps: counts.get(date) ?? 0,
			progressDays: trackerProgressDays(date, today, (day) => counts.get(day) ?? 0),
			days: keys.toReversed().map((date) => ({ date, count: counts.get(date) ?? 0 }))
		};
	}

	private async sleep(url: URL, method: string, body: Record<string, unknown>) {
		if (method === 'GET')
			return sleepData(
				await this.store.readDomains(['sleep', 'screenTime']),
				selectedDate(url, this.today()),
				this.today()
			);
		if (method !== 'PATCH') throw methodNotAllowed();
		let settings: SleepSettingsData | undefined;
		await this.updateWithCompletionNotification(['sleep'], (state) => {
			state.sleep.bedtime = bedtime(body.bedtime ?? state.sleep.bedtime);
			state.sleep.remindersEnabled = booleanSetting(
				body.remindersEnabled ?? state.sleep.remindersEnabled
			);
			state.sleep.days = state.sleep.days.filter(({ status }) => status !== 'pending');
			settings = { bedtime: state.sleep.bedtime, remindersEnabled: state.sleep.remindersEnabled };
		});
		return requiredResult(settings, 'Sleep settings were not updated.');
	}

	private async screenTime(url: URL, method: string, body: Record<string, unknown>) {
		if (method === 'GET')
			return screenTimeData(
				await this.store.readDomains(['screenTime']),
				selectedDate(url, this.today()),
				this.today()
			);
		if (method !== 'PATCH') throw methodNotAllowed();
		const packageName = cleanRequiredText(body.package, 'Choose an app package.');
		const tracked = booleanSetting(body.tracked);
		await this.updateWithCompletionNotification(['screenTime'], (state) =>
			setTrackedPackage(state, packageName, tracked)
		);
		return { package: packageName, tracked };
	}

	private async fitness(url: URL): Promise<FitnessData> {
		const state = await this.store.readDomains(['fitness']);
		const today = this.today();
		const date = selectedDate(url, today);
		const program = fitnessProgram(numberKeyRecord(state.fitness.exerciseSpeeds));
		const completedDates = new Set(state.fitness.completedDays.map(({ dateKey }) => dateKey));
		return {
			date,
			today,
			settings: settingsForTracker(state, 'fitness'),
			program: programWithRequestedSets(
				program,
				date,
				url.searchParams.get('sets'),
				state.fitness.defaultSets
			),
			completedDays: state.fitness.completedDays,
			progressDays: trackerProgressDays(date, today, (day) => {
				const scheduled = program.workouts.some(
					({ day: workoutDay }) => workoutDay === Number(day.slice(-2))
				);
				return scheduled ? Number(completedDates.has(day)) : null;
			})
		};
	}

	private async exercises(): Promise<ExerciseData> {
		const state = await this.store.readDomains(['fitness']);
		return { exercises: exercisePreferences(numberKeyRecord(state.fitness.exerciseSpeeds)) };
	}

	private async fitnessProgress(
		workoutId: number,
		url: URL,
		method: string,
		body: Record<string, unknown>
	) {
		const day = workoutDay(workoutId);
		if (!day) throw new LocalServiceError(404, 'Workout not found.');
		const completedDate = method === 'DELETE' ? url.searchParams.get('date') : body.completedDate;
		if (!validPastDate(completedDate, this.today()))
			throw badRequest('Expected a valid completion date.');
		if (Number(String(completedDate).slice(-2)) !== day)
			throw badRequest('The completion date does not match the workout day.');
		await this.updateWithCompletionNotification(['fitness'], (state) =>
			setFitnessCompletion(
				state,
				workoutId,
				String(completedDate),
				method !== 'DELETE',
				this.clock()
			)
		);
		return { completed: method !== 'DELETE', completedDate };
	}

	private async exerciseSpeed(exerciseId: number, method: string, body: Record<string, unknown>) {
		if (!Number.isInteger(exerciseId) || exerciseId < 1) throw badRequest('Exercise not found.');
		const speed = method === 'DELETE' ? 100 : Number(body.speedPercent);
		if (!Number.isInteger(speed) || speed < 25 || speed > 200)
			throw badRequest('Speed must be between 25 and 200.');
		await this.updateWithCompletionNotification(['fitness'], (state) => {
			if (method === 'DELETE') delete state.fitness.exerciseSpeeds[String(exerciseId)];
			else state.fitness.exerciseSpeeds[String(exerciseId)] = speed;
		});
		return { exerciseId, speedPercent: speed };
	}

	private async meditation(url: URL, method: string, body: Record<string, unknown>) {
		if (method === 'GET')
			return meditationData(
				await this.store.readDomains(['meditation']),
				selectedDate(url, this.today()),
				this.today(),
				url.searchParams.get('duration')
			);
		if (method !== 'POST') throw methodNotAllowed();
		const session = validMeditation(body, this.clock());
		await this.updateWithCompletionNotification(['meditation'], (state) => {
			if (!state.meditation.sessions.some(({ id }) => id === session.id))
				state.meditation.sessions.push(session);
		});
		return session;
	}

	private async breathing(url: URL, method: string, body: Record<string, unknown>) {
		if (method === 'GET')
			return breathingData(
				await this.store.readDomains(['breathing']),
				selectedDate(url, this.today()),
				this.today()
			);
		if (method !== 'POST') throw methodNotAllowed();
		let exercise: LocalAppState['breathing']['exercises'][number] | undefined;
		await this.updateWithCompletionNotification(['breathing'], (state) => {
			const completion = validBreathing(body, state.breathing, this.today(), this.clock());
			exercise = completion;
			if (!state.breathing.exercises.some(({ localDate }) => localDate === completion.localDate))
				state.breathing.exercises.push(completion);
		});
		if (!exercise) throw new Error('Breathing exercise was not created.');
		return { ...body, includeHold: exercise.technique === '4-7-8', ...exercise };
	}

	private async stretch(url: URL, method: string, body: Record<string, unknown>) {
		if (method === 'GET')
			return stretchData(
				await this.store.readDomains(['stretch']),
				selectedDate(url, this.today()),
				this.today()
			);
		if (method !== 'POST') throw methodNotAllowed();
		let session: LocalAppState['stretch']['sessions'][number] | null = null;
		await this.updateWithCompletionNotification(['stretch'], (state) => {
			const created = validStretch(
				body,
				state.stretch.holdSeconds,
				state.stretch.difficulties,
				this.today(),
				this.clock()
			);
			state.stretch.sessions.push(created);
			session = created;
		});
		if (!session) throw new Error('Stretch session was not created.');
		return session;
	}

	private async chores(url: URL, method: string, body: Record<string, unknown>) {
		if (method === 'GET')
			return choresData(
				await this.store.readDomains(['chores']),
				selectedDate(url, this.today()),
				this.today()
			);
		if (method !== 'POST') throw methodNotAllowed();
		let session: LocalAppState['chores']['sessions'][number] | undefined;
		await this.updateWithCompletionNotification(['chores'], (state) => {
			const completion = validChores(body, this.today(), this.clock());
			session =
				state.chores.sessions.find(({ localDate }) => localDate === completion.localDate) ??
				completion;
			if (!state.chores.sessions.some(({ localDate }) => localDate === completion.localDate))
				state.chores.sessions.push(completion);
		});
		return requiredResult(session, 'Chores session was not created.');
	}

	private async happiness(url: URL, method: string, body: Record<string, unknown>) {
		if (method === 'GET')
			return happinessData(
				await this.store.readDomains(['happiness']),
				selectedDate(url, this.today()),
				this.today()
			);
		if (method === 'DELETE')
			return this.deleteDatedEntry('happiness', url.searchParams.get('date'));
		if (method !== 'PUT') throw methodNotAllowed();
		let entry: LocalAppState['happiness']['entries'][number] | undefined;
		await this.updateWithCompletionNotification(['happiness'], (state) => {
			const existing = state.happiness.entries.find(
				({ localDate }) => localDate === body.localDate
			);
			entry = validHappiness(
				body,
				existing?.rating ?? state.happiness.defaultRating,
				this.today(),
				this.clock()
			);
			replaceByDate(state.happiness.entries, entry);
		});
		if (!entry) throw new Error('Happiness entry was not created.');
		return { entry };
	}

	private async period(url: URL, method: string, body: Record<string, unknown>) {
		if (method === 'GET')
			return periodData(
				await this.store.readDomains(['period']),
				selectedDate(url, this.today()),
				this.today()
			);
		if (method === 'DELETE') return this.deleteDatedEntry('period', url.searchParams.get('date'));
		if (method !== 'PUT') throw methodNotAllowed();
		let entry: LocalAppState['period']['entries'][number] | undefined;
		await this.updateWithCompletionNotification(['period'], (state) => {
			const existing = state.period.entries.find(({ localDate }) => localDate === body.localDate);
			entry = validPeriod(
				body,
				existing?.flow ?? state.period.defaultFlow,
				this.today(),
				this.clock()
			);
			replaceByDate(state.period.entries, entry);
		});
		if (!entry) throw new Error('Period entry was not created.');
		return { entry };
	}

	private async deleteDatedEntry(tracker: 'happiness' | 'period', date: string | null) {
		if (!isValidDateKey(date ?? '')) throw badRequest('Choose a valid date.');
		await this.store.updateDomains([tracker], (state) => {
			if (tracker === 'happiness')
				state.happiness.entries = state.happiness.entries.filter(
					(entry) => entry.localDate !== date
				);
			else state.period.entries = state.period.entries.filter((entry) => entry.localDate !== date);
		});
		return { deleted: true };
	}

	private async nutritionLog(requestedDate: string): Promise<NutritionLogData> {
		return nutritionQueries.log(this.nutritionQueryContext(), requestedDate);
	}

	private async nutritionEntry(entryId: string, method: string, body: Record<string, unknown>) {
		if (method === 'GET') return this.readNutritionEntry(entryId);
		if (method === 'DELETE') return this.deleteNutritionEntry(entryId);
		if (method !== 'PUT') throw methodNotAllowed();
		return nutritionMutations.updateEntry(this.nutritionMutationContext(), entryId, body);
	}

	private async readNutritionEntry(entryId: string): Promise<NutritionEntryData> {
		return nutritionQueries.entry(this.nutritionQueryContext(), entryId);
	}

	private async deleteNutritionEntry(entryId: string) {
		return nutritionMutations.deleteEntry(this.nutritionMutationContext(), entryId);
	}

	private async fasting(date: string | undefined, method: string, body: Record<string, unknown>) {
		if (date && method === 'GET') return this.fastingStatus(date);
		if (date && method === 'DELETE') return this.cancelFasting(date);
		if (!date && method === 'POST') return this.markFasting(body);
		throw methodNotAllowed();
	}

	private async fastingStatus(date: string): Promise<NutritionFastingStatusData> {
		return nutritionQueries.fasting(this.nutritionQueryContext(), date);
	}

	private async cancelFasting(date: string) {
		return nutritionMutations.cancelFasting(this.nutritionMutationContext(), date);
	}

	private async markFasting(body: Record<string, unknown>) {
		return nutritionMutations.markFasting(this.nutritionMutationContext(), body);
	}

	private async createNutritionEntry(body: Record<string, unknown>) {
		return nutritionMutations.createEntry(this.nutritionMutationContext(), body);
	}

	private nutritionMutationContext(): nutritionMutations.NutritionMutationContext {
		return {
			today: this.today(),
			fail: (status, message) => new LocalServiceError(status, message),
			update: (mutator) => this.updateWithCompletionNotification(['nutrition'], mutator),
			updatePlain: (mutator) => this.store.updateDomains(['nutrition'], mutator)
		};
	}

	private nutritionQueryContext(): nutritionQueries.NutritionQueryContext {
		return {
			store: this.store,
			today: this.today(),
			fail: (status, message) => new LocalServiceError(status, message)
		};
	}

	private async rewards(): Promise<RewardsData> {
		let result: RewardsData | undefined;
		await this.store.updateGamificationProjection(['gamification'], (state) => {
			result = {
				today: this.today(),
				glimmers: glimmers(state, this.clock()),
				rewards: sortedRewards(state.rewards),
				redemptions: state.redemptions.slice(-5).toReversed()
			};
		});
		return requiredResult(result, 'Rewards were not loaded.');
	}

	private async createReward(body: Record<string, unknown>) {
		const reward = validReward(body);
		await this.updateWithCompletionNotification(['rewards'], (state) => {
			state.rewards.push(reward);
		});
		return reward;
	}

	private async rewardRoute(
		rewardId: string,
		action: string | undefined,
		method: string,
		body: Record<string, unknown>
	) {
		if (action === 'redeem' && method === 'POST') return this.redeemReward(rewardId);
		if (method === 'PATCH') return this.updateReward(rewardId, body);
		if (method === 'DELETE') return this.deleteReward(rewardId);
		throw methodNotAllowed();
	}

	private async updateReward(rewardId: string, body: Record<string, unknown>) {
		let reward: Reward | undefined;
		await this.store.updateDomains(['rewards'], (state) => {
			if (!state.rewards.some(({ id }) => id === rewardId))
				throw new LocalServiceError(404, 'Reward not found.');
			const updatedReward = { ...validReward(body), id: rewardId };
			reward = updatedReward;
			state.rewards = state.rewards.map((item) => (item.id === rewardId ? updatedReward : item));
		});
		return requiredResult(reward, 'Reward was not updated.');
	}

	private async deleteReward(rewardId: string) {
		await this.store.updateDomains(['rewards'], (state) => {
			if (!state.rewards.some(({ id }) => id === rewardId))
				throw new LocalServiceError(404, 'Reward not found.');
			state.rewards = state.rewards.filter(({ id }) => id !== rewardId);
		});
	}

	private async redeemReward(rewardId: string) {
		let result: { reward: Reward; glimmers: number } | undefined;
		await this.store.updateGamificationProjection(['gamification', 'rewards'], (state) => {
			const reward = state.rewards.find(({ id }) => id === rewardId);
			if (!reward) throw new LocalServiceError(404, 'Reward not found.');
			const available = glimmers(state, this.clock());
			if (available < reward.price)
				throw new LocalServiceError(409, 'You need more Glimmers for this reward.');
			state.redemptions.push({ ...reward, redeemedAt: this.clock().toISOString() });
			result = { reward, glimmers: available - reward.price };
		});
		return requiredResult(result, 'Reward was not redeemed.');
	}

	private async daySummary(url: URL) {
		const state = await this.store.readDailyProjection(false);
		return daySummaryData(state, selectedDate(url, this.today()), this.today());
	}

	private async actionFeed(url: URL): Promise<ActionFeedData> {
		const state = await this.store.readDailyProjection(true);
		const environment = buildActionEnvironment(this.clock(), localTimeZone());
		const date = selectedDate(url, environment.localDate);
		const summary = daySummaryData(state, date, environment.localDate);
		const snapshot = buildActionSnapshot(state, date, environment.localDate);
		return {
			date,
			daySummary: summary,
			items: selectActionFeedItems(this.actionCandidates, snapshot, environment)
		};
	}

	private async updateWithCompletionNotification(
		domains: readonly LocalDomain[],
		mutator: (state: LocalAppState) => void | Promise<void>
	) {
		let before: LocalAppState | undefined;
		const after = await this.store.updateGamificationProjection(
			[...domains, 'gamification'],
			async (state) => {
				before = structuredClone(state);
				await mutator(state);
				buildGamification(state, this.clock());
			}
		);
		notifyNewTrackerCompletions(
			requiredResult(before, 'Completion baseline was not loaded.'),
			after,
			this.clock()
		);
		return after;
	}

	private today() {
		return localDateForInstant(this.clock(), localTimeZone());
	}
}

type SettingsTrackerId = keyof TrackerSettingsDataMap;

function isSettingsTrackerId(value: string): value is SettingsTrackerId {
	return [
		'steps',
		'screen-time',
		'fitness',
		'meditation',
		'breathing',
		'stretch',
		'happiness',
		'period'
	].includes(value);
}

function settingsDomain(trackerId: SettingsTrackerId): LocalDomain {
	return trackerId === 'screen-time' ? 'screenTime' : trackerId;
}

function settingsForTracker<T extends SettingsTrackerId>(
	state: LocalAppState,
	trackerId: T
): TrackerSettingsDataMap[T] {
	const settings = {
		steps: { dailyGoal: state.steps.dailyGoal },
		'screen-time': { dailyLimitMinutes: state.screenTime.dailyLimitMinutes },
		fitness: { defaultSets: state.fitness.defaultSets },
		meditation: { defaultDurationSeconds: state.meditation.defaultDurationSeconds },
		breathing: { rounds: state.breathing.rounds, includeHold: state.breathing.includeHold },
		stretch: {
			holdSeconds: state.stretch.holdSeconds,
			difficulties: state.stretch.difficulties
		},
		happiness: { defaultRating: state.happiness.defaultRating },
		period: {
			defaultFlow: state.period.defaultFlow,
			fallbackCycleDays: state.period.fallbackCycleDays
		}
	};
	return settings[trackerId] as TrackerSettingsDataMap[T];
}

function updateTrackerSettings(
	state: LocalAppState,
	trackerId: SettingsTrackerId,
	body: Record<string, unknown>
) {
	if (trackerId === 'steps')
		state.steps.dailyGoal = integerSetting(body.dailyGoal, state.steps.dailyGoal, 1_000, 100_000);
	if (trackerId === 'screen-time')
		state.screenTime.dailyLimitMinutes = integerSetting(
			body.dailyLimitMinutes,
			state.screenTime.dailyLimitMinutes,
			1,
			1_440
		);
	if (trackerId === 'fitness')
		state.fitness.defaultSets = integerSetting(body.defaultSets, state.fitness.defaultSets, 1, 10);
	if (trackerId === 'meditation')
		state.meditation.defaultDurationSeconds = integerSetting(
			body.defaultDurationSeconds,
			state.meditation.defaultDurationSeconds,
			60,
			7_200
		);
	if (trackerId === 'breathing') {
		state.breathing.rounds = integerSetting(body.rounds, state.breathing.rounds, 1, 20);
		state.breathing.includeHold = optionalBooleanSetting(
			body.includeHold,
			state.breathing.includeHold
		);
	}
	if (trackerId === 'stretch') {
		state.stretch.holdSeconds = integerSetting(body.holdSeconds, state.stretch.holdSeconds, 5, 600);
		state.stretch.difficulties = stretchDifficultiesSetting(
			body.difficulties,
			state.stretch.difficulties
		);
	}
	if (trackerId === 'happiness')
		state.happiness.defaultRating = happinessRatingSetting(
			body.defaultRating,
			state.happiness.defaultRating
		);
	if (trackerId === 'period') {
		state.period.defaultFlow = periodFlowSetting(body.defaultFlow, state.period.defaultFlow);
		state.period.fallbackCycleDays = integerSetting(
			body.fallbackCycleDays,
			state.period.fallbackCycleDays,
			15,
			60
		);
	}
}

function profileData(state: LocalAppState): ProfileData {
	return {
		profile: state.user,
		nutritionProfile: state.nutrition.profile,
		trackerPreferences: appTrackers.map((tracker) => ({
			...tracker,
			enabled: state.enabledTrackerIds.includes(tracker.id)
		})),
		estimatedTdee: estimatedTdee(state.nutrition.profile),
		rewards: sortedRewards(state.rewards)
	};
}

function updateProfile(state: LocalAppState, body: Record<string, unknown>, method: string) {
	if (Array.isArray(body.trackers)) return updateTrackerPreferences(state, body.trackers);
	if (typeof body.name === 'string') return updateUserName(state, body.name);
	state.nutrition.profile = nutritionProfile(
		body,
		method === 'PATCH' ? state.nutrition.profile : null
	);
}

function updateTrackerPreferences(state: LocalAppState, values: unknown[]) {
	state.enabledTrackerIds = [...new Set(values.map(String).filter(isAppTrackerId))];
}

function updateUserName(state: LocalAppState, value: string) {
	const name = value.trim();
	if (name.length < 2 || name.length > 120) throw badRequest('Enter a valid name.');
	state.user.name = name;
}

function sleepData(state: LocalAppState, date: string, today: string): SleepData {
	const keys = dateKeysEndingAt(today, 7);
	const summaries = new Map(
		state.sleep.days.map((day) => [day.localDate, publicSleepSummary(day)])
	);
	return {
		settings: { bedtime: state.sleep.bedtime, remindersEnabled: state.sleep.remindersEnabled },
		lastReceivedAt: state.sleep.lastReceivedAt,
		isSynced: Boolean(state.sleep.lastReceivedAt),
		hasData: state.sleep.days.length > 0,
		setupRequired: state.screenTime.trackedPackages.length === 0,
		date,
		today,
		markedDates: state.sleep.days.map(({ localDate }) => localDate),
		progressDays: trackerProgressDays(date, today, (day) => {
			const status = summaries.get(day)?.status ?? 'pending';
			return status === 'pending' ? null : Number(status === 'pass');
		}),
		summary: summaries.get(date) ?? pendingSleepSummary(date, state.sleep.bedtime),
		days: keys
			.toReversed()
			.map((date) => summaries.get(date) ?? pendingSleepSummary(date, state.sleep.bedtime))
	};
}

function screenTimeData(state: LocalAppState, date: string, today: string): ScreenTimeData {
	const keys = dateKeysEndingAt(today, 7);
	const tracked = new Set(state.screenTime.trackedPackages);
	const days = state.screenTime.days.map((day) => trackedScreenTimeDay(day, tracked));
	const selected = days.find((day) => day.date === date);
	const history = keys.map((date) => ({
		date,
		totalMinutes: days.find((day) => day.date === date)?.totalMinutes ?? 0
	}));
	const summary = summarizeUsage(history);
	return {
		settings: settingsForTracker(state, 'screen-time'),
		connection: { lastReceivedAt: state.screenTime.lastReceivedAt },
		isSynced: Boolean(state.screenTime.lastReceivedAt),
		hasData: state.screenTime.days.length > 0,
		date,
		today,
		markedDates: state.screenTime.days.map(({ date }) => date),
		usage: { totalMinutes: selected?.totalMinutes ?? 0, apps: selected?.apps ?? [] },
		progressDays: trackerProgressDays(
			date,
			today,
			(day) => days.find((entry) => entry.date === day)?.totalMinutes ?? 0
		),
		knownApps: knownApps(state),
		averageMinutes: summary.averageMinutes,
		historyMaxMinutes: summary.maxMinutes,
		days: history.toReversed()
	};
}

function meditationData(
	state: LocalAppState,
	date: string,
	today: string,
	requestedDuration: string | null
): MeditationData {
	const sessions = state.meditation.sessions.filter((session) => session.localDate === date);
	return {
		date,
		today,
		settings: settingsForTracker(state, 'meditation'),
		initialDurationSeconds: meditationDurationSetting(
			requestedDuration,
			state.meditation.defaultDurationSeconds
		),
		markedDates: unique(state.meditation.sessions.map(({ localDate }) => localDate)),
		progressDays: trackerProgressDays(date, today, (day) =>
			Number(state.meditation.sessions.some(({ localDate }) => localDate === day))
		),
		meditationHistory: sessions.length
			? [
					{
						localDate: date,
						totalSeconds: sessions.reduce((total, session) => total + session.durationSeconds, 0),
						sessionCount: sessions.length
					}
				]
			: []
	};
}

function breathingData(state: LocalAppState, date: string, today: string): BreathingData {
	return {
		date,
		today,
		settings: settingsForTracker(state, 'breathing'),
		markedDates: state.breathing.exercises.map(({ localDate }) => localDate),
		progressDays: trackerProgressDays(date, today, (day) =>
			Number(state.breathing.exercises.some(({ localDate }) => localDate === day))
		),
		exercise: state.breathing.exercises.find((exercise) => exercise.localDate === date) ?? null
	};
}

function stretchData(state: LocalAppState, date: string, today: string): StretchData {
	return {
		date,
		today,
		settings: settingsForTracker(state, 'stretch'),
		scheduled: isStretchScheduled(date),
		markedDates: unique(state.stretch.sessions.map(({ localDate }) => localDate)),
		progressDays: trackerProgressDays(date, today, (day) =>
			isStretchScheduled(day)
				? Number(state.stretch.sessions.some(({ localDate }) => localDate === day))
				: null
		),
		sessions: state.stretch.sessions.filter((session) => session.localDate === date)
	};
}

function choresData(state: LocalAppState, date: string, today: string): ChoresData {
	return {
		date,
		today,
		markedDates: state.chores.sessions.map(({ localDate }) => localDate),
		progressDays: trackerProgressDays(date, today, (day) =>
			Number(state.chores.sessions.some(({ localDate }) => localDate === day))
		),
		session: state.chores.sessions.find((session) => session.localDate === date) ?? null
	};
}

function happinessData(state: LocalAppState, date: string, today: string): HappinessData {
	const entries = [...state.happiness.entries].sort(byLocalDateDescending);
	const selected = entries.find((entry) => entry.localDate === date);
	return {
		date,
		today,
		settings: settingsForTracker(state, 'happiness'),
		entry: selected ? { ...selected, reasons: selected.reasons as HappinessReason[] } : null,
		markedDates: entries.map(({ localDate }) => localDate),
		progressDays: trackerProgressDays(
			date,
			today,
			(day) => entries.find(({ localDate }) => localDate === day)?.rating ?? null
		),
		recentEntries: entries.slice(0, 10).map(({ localDate, rating }) => ({ localDate, rating }))
	};
}

function periodData(state: LocalAppState, date: string, today: string): PeriodData {
	const entries = [...state.period.entries].sort(byLocalDateDescending);
	const markedDates = entries.map(({ localDate }) => localDate);
	return {
		date,
		today,
		settings: settingsForTracker(state, 'period'),
		entry: entries.find((entry) => entry.localDate === date) ?? null,
		markedDates,
		progressDays: trackerProgressDays(date, today, (day) => {
			const flow = entries.find(({ localDate }) => localDate === day)?.flow;
			return flow ? menstruationFlows.indexOf(flow) + 1 : null;
		}),
		recentEntries: entries.slice(0, 10).map(({ localDate, flow }) => ({ localDate, flow })),
		cycle: cycleSummary(markedDates, today, state.period.fallbackCycleDays)
	};
}

function programWithRequestedSets(
	program: FitnessData['program'],
	date: string,
	requestedValue: string | null,
	defaultSets: number
) {
	const workoutDay = Number(date.slice(-2));
	const workout = program.workouts.find(({ day }) => day === workoutDay);
	if (!workout) return program;
	const requestedSets = Number(requestedValue);
	const validOverride =
		requestedValue !== null &&
		Number.isInteger(requestedSets) &&
		requestedSets >= 1 &&
		requestedSets <= workout.sets;
	const sets = validOverride ? requestedSets : defaultWorkoutSets(workout.sets, defaultSets);
	return {
		...program,
		workouts: program.workouts.map((item) => (item.day === workoutDay ? { ...item, sets } : item))
	};
}

function daySummaryData(state: LocalAppState, date: string, today: string): DaySummaryData {
	const stepDay = state.steps.days.find((day) => day.date === date);
	const sleepDay = state.sleep.days.find((day) => day.localDate === date);
	const trackedDay = trackedScreenTimeDay(
		state.screenTime.days.find((day) => day.date === date),
		new Set(state.screenTime.trackedPackages)
	);
	const workout = fitnessProgram(numberKeyRecord(state.fitness.exerciseSpeeds)).workouts.find(
		({ day }) => day === Number(date.slice(-2))
	);
	const entries = state.nutrition.entries.filter((entry) => entry.date === date);
	const profile = state.nutrition.profile;
	return {
		date,
		today,
		timeZone: localTimeZone(),
		steps: stepDay?.count ?? 0,
		stepGoal: state.steps.dailyGoal,
		stepsHaveMeasurements: state.steps.days.length > 0,
		sleepStatus: sleepDay?.status ?? 'pending',
		sleepBedtime: sleepDay?.configuredBedtime ?? state.sleep.bedtime,
		sleepLateUsageSeconds: sleepDay?.lateUsageSeconds ?? 0,
		sleepSetupRequired: state.screenTime.trackedPackages.length === 0,
		screenTimeMinutes: trackedDay.totalMinutes,
		screenTimeLimitMinutes: state.screenTime.dailyLimitMinutes,
		screenTimeRecorded: Boolean(state.screenTime.days.find((day) => day.date === date)),
		screenTimeHasMeasurements: state.screenTime.days.length > 0,
		fitnessDone: state.fitness.completedDays.some(({ dateKey }) => dateKey === date),
		fitnessWorkoutTitle: workout ? `Day ${workout.day}` : 'Rest day',
		calories: sumEntries(entries).calories,
		calorieGoal: profile?.dailyCalorieGoal ?? null,
		nutritionFasting: state.nutrition.fastingDates.includes(date),
		nutritionEatingWindow: profile
			? {
					enabled: profile.eatingWindowEnabled,
					start: profile.eatingWindowStart,
					end: profile.eatingWindowEnd
				}
			: null,
		meditationDone: state.meditation.sessions.some((session) => session.localDate === date),
		breathingDone: state.breathing.exercises.some((exercise) => exercise.localDate === date),
		stretchDone: state.stretch.sessions.some((session) => session.localDate === date),
		stretchScheduled: isStretchScheduled(date),
		choresDone: state.chores.sessions.some((session) => session.localDate === date),
		happinessRating:
			state.happiness.entries.find((entry) => entry.localDate === date)?.rating ?? null,
		periodFlow: state.period.entries.find((entry) => entry.localDate === date)?.flow ?? null
	};
}

function validMeditation(body: Record<string, unknown>, now: Date) {
	const session = {
		id: String(body.id ?? ''),
		localDate: String(body.localDate ?? ''),
		durationSeconds: Number(body.durationSeconds),
		startedAt: Number(body.startedAt)
	};
	if (
		!session.id ||
		!isValidDateKey(session.localDate) ||
		!Number.isInteger(session.durationSeconds) ||
		session.durationSeconds < 60 ||
		session.durationSeconds > 7_200
	)
		throw badRequest('Invalid meditation session.');
	if (Math.abs(now.getTime() - session.startedAt) > 24 * 60 * 60 * 1_000)
		throw badRequest('Invalid start time.');
	return session;
}

function validBreathing(
	body: Record<string, unknown>,
	settings: Pick<LocalAppState['breathing'], 'rounds' | 'includeHold'>,
	today: string,
	now: Date
) {
	const localDate = String(body.localDate ?? '');
	const startedAt = Number(body.startedAt);
	const includeHold = optionalBooleanSetting(body.includeHold, settings.includeHold);
	if (
		localDate !== today ||
		!Number.isInteger(startedAt) ||
		Math.abs(now.getTime() - startedAt) > 60 * 60 * 1_000
	)
		throw badRequest('Invalid breathing exercise.');
	return {
		localDate,
		startedAt,
		technique: includeHold ? '4-7-8' : '4-8',
		durationSeconds: breathingDurationSeconds(includeHold, settings.rounds)
	};
}

function validStretch(
	body: Record<string, unknown>,
	defaultHoldSeconds: number,
	difficulties: StretchDifficulties,
	today: string,
	now: Date
) {
	const localDate = String(body.localDate ?? '');
	const scheduledOrToday = localDate === today || isStretchScheduled(localDate);
	if (!validPastDate(localDate, today) || !scheduledOrToday)
		throw badRequest('Stretch sessions can only be recorded today or on scheduled weekdays.');
	return {
		id: crypto.randomUUID(),
		localDate,
		holdSeconds: integerSetting(body.holdSeconds, defaultHoldSeconds, 5, 600),
		completedAt: now.toISOString(),
		hardVariationCompleted: Object.values(difficulties).includes('hard')
	};
}

function validChores(body: Record<string, unknown>, today: string, now: Date) {
	const localDate = String(body.localDate ?? '');
	const startedAt = Number(body.startedAt);
	if (
		localDate !== today ||
		!Number.isInteger(startedAt) ||
		Math.abs(now.getTime() - startedAt) > 24 * 60 * 60 * 1_000
	)
		throw badRequest('Invalid chores session.');
	return { localDate, durationSeconds: CHORES_DURATION_SECONDS, startedAt } as const;
}

function validHappiness(
	body: Record<string, unknown>,
	defaultRating: HappinessRating,
	today: string,
	now: Date
) {
	const localDate = String(body.localDate ?? '');
	const rating = Number(body.rating ?? defaultRating) as HappinessRating;
	const reasons = Array.isArray(body.reasons)
		? (unique(body.reasons.map(String)) as HappinessReason[])
		: [];
	if (!validPastDate(localDate, today) || !happinessRatings.includes(rating) || !reasons.length)
		throw badRequest('Invalid happiness entry.');
	if (reasons.some((reason) => !isHappinessReasonForRating(reason, rating)))
		throw badRequest('Choose reasons that match your happiness level.');
	return { localDate, rating, reasons, updatedAt: now.toISOString() };
}

function validPeriod(
	body: Record<string, unknown>,
	defaultFlow: MenstruationFlow,
	today: string,
	now: Date
) {
	const localDate = String(body.localDate ?? '');
	const flow = String(body.flow ?? defaultFlow) as MenstruationFlow;
	const notes = String(body.notes ?? '').trim();
	if (
		!validPastDate(localDate, today) ||
		!menstruationFlows.includes(flow as MenstruationFlow) ||
		notes.length > 1_000
	)
		throw badRequest('Invalid period entry.');
	return { localDate, flow, notes, updatedAt: now.toISOString() };
}

function validReward(body: Record<string, unknown>): Reward {
	const name = String(body.name ?? '').trim();
	const price = Number(body.price);
	if (!name || name.length > 80 || !Number.isInteger(price) || price < 1 || price > 1_000_000)
		throw badRequest('Enter a name and valid Glimmer price.');
	return { id: crypto.randomUUID(), name, emoji: '⭐', price };
}

function glimmers(state: LocalAppState, now: Date) {
	buildGamification(state, now);
	const score = state.gamification.awards.reduce((total, award) => total + award.points, 0);
	const spent = state.redemptions.reduce((total, reward) => total + reward.price, 0);
	return Math.max(0, score - spent);
}

function knownApps(state: LocalAppState) {
	const apps = new Map<string, string>();
	for (const day of state.screenTime.days)
		for (const app of day.apps) if (!apps.has(app.package)) apps.set(app.package, app.name);
	for (const packageName of state.screenTime.trackedPackages)
		if (!apps.has(packageName)) apps.set(packageName, packageName);
	return [...apps]
		.map(([packageName, name]) => ({
			package: packageName,
			name,
			tracked: state.screenTime.trackedPackages.includes(packageName)
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function trackedScreenTimeDay(
	day: LocalAppState['screenTime']['days'][number] | undefined,
	tracked: Set<string>
) {
	const apps = day?.apps.filter((app) => tracked.has(app.package)) ?? [];
	return {
		date: day?.date ?? '',
		totalMinutes: apps.reduce((total, app) => total + app.minutes, 0),
		apps
	};
}

function setTrackedPackage(state: LocalAppState, packageName: string, tracked: boolean) {
	const packages = new Set(state.screenTime.trackedPackages);
	if (tracked) packages.add(packageName);
	else packages.delete(packageName);
	state.screenTime.trackedPackages = [...packages].sort();
}

function setFitnessCompletion(
	state: LocalAppState,
	workoutId: number,
	dateKey: string,
	completed: boolean,
	now: Date
) {
	state.fitness.completedDays = state.fitness.completedDays.filter(
		(day) => day.dateKey !== dateKey
	);
	if (completed)
		state.fitness.completedDays.push({ workoutId, dateKey, completedAt: now.toISOString() });
}

function publicSleepSummary(day: LocalAppState['sleep']['days'][number]) {
	return {
		localDate: day.localDate,
		configuredBedtime: day.configuredBedtime,
		windowStartAt: day.windowStartAt,
		windowEndAt: day.windowEndAt,
		lateUsageSeconds: day.lateUsageSeconds,
		latestScreenActivityAt: day.latestScreenActivityAt,
		usedApps: day.usedApps,
		violatingApps: day.violatingApps,
		status: day.status
	};
}

function pendingSleepSummary(localDate: string, configuredBedtime: string) {
	return {
		localDate,
		configuredBedtime,
		windowStartAt: null,
		windowEndAt: null,
		lateUsageSeconds: 0,
		latestScreenActivityAt: null,
		usedApps: [],
		violatingApps: [],
		status: 'pending' as const
	};
}

function replaceByDate<T extends { localDate: string }>(entries: T[], replacement: T) {
	const index = entries.findIndex(({ localDate }) => localDate === replacement.localDate);
	if (index === -1) entries.push(replacement);
	else entries[index] = replacement;
}

function enabledTrackers(state: LocalAppState) {
	return appTrackers.filter(({ id }) => state.enabledTrackerIds.includes(id));
}

function sortedRewards(rewards: Reward[]) {
	return [...rewards].sort((left, right) => left.price - right.price);
}

function selectedDate(url: URL, today: string) {
	const date = url.searchParams.get('date') ?? today;
	if (!validPastDate(date, today)) throw badRequest('Choose today or an earlier valid date.');
	return date;
}

function validPastDate(value: unknown, today: string): value is string {
	return typeof value === 'string' && isValidDateKey(value) && value <= today;
}

function requestBody(body?: BodyInit | null): Record<string, unknown> {
	if (body === undefined || body === null) return {};
	if (typeof body !== 'string') throw badRequest('Expected a JSON request body.');
	try {
		const value = JSON.parse(body) as unknown;
		if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
		return value as Record<string, unknown>;
	} catch {
		throw badRequest('Invalid JSON request body.');
	}
}

function localUrl(path: string) {
	try {
		return new URL(path, 'https://local.self-improvement');
	} catch {
		throw badRequest('Invalid local route.');
	}
}

function bedtime(value: unknown) {
	const time = String(value ?? '');
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw badRequest('Choose a valid bedtime.');
	return time;
}

function booleanSetting(value: unknown) {
	if (typeof value !== 'boolean') throw badRequest('Expected a true or false value.');
	return value;
}

function optionalBooleanSetting(value: unknown, current: boolean) {
	return value === undefined ? current : booleanSetting(value);
}

function integerSetting(value: unknown, current: number, minimum: number, maximum: number) {
	if (value === undefined) return current;
	const setting = Number(value);
	if (!Number.isInteger(setting) || setting < minimum || setting > maximum)
		throw badRequest(`Choose a whole number between ${minimum} and ${maximum}.`);
	return setting;
}

function stretchDifficultiesSetting(value: unknown, current: StretchDifficulties) {
	if (value === undefined) return current;
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw badRequest('Choose valid stretch levels.');
	const updates = value as Record<string, unknown>;
	const difficulties = { ...current };
	for (const activityId of STRETCH_ACTIVITY_IDS) {
		const difficulty = updates[activityId];
		if (difficulty === undefined) continue;
		if (
			!(STRETCH_DIFFICULTIES_BY_ACTIVITY[activityId] as readonly StretchDifficulty[]).includes(
				difficulty as StretchDifficulty
			)
		)
			throw badRequest('Choose an available level for each stretch.');
		difficulties[activityId] = difficulty as StretchDifficulties[typeof activityId];
	}
	return difficulties;
}

function happinessRatingSetting(value: unknown, current: HappinessRating) {
	if (value === undefined) return current;
	const rating = Number(value) as HappinessRating;
	if (!happinessRatings.includes(rating)) throw badRequest('Choose a happiness level.');
	return rating;
}

function periodFlowSetting(value: unknown, current: MenstruationFlow) {
	if (value === undefined) return current;
	const flow = String(value) as MenstruationFlow;
	if (!menstruationFlows.includes(flow)) throw badRequest('Choose a valid flow.');
	return flow;
}

function meditationDurationSetting(value: string | null, defaultDurationSeconds: number) {
	if (value === null) return defaultDurationSeconds;
	const durationSeconds = Number(value);
	if (!Number.isInteger(durationSeconds) || durationSeconds < 60 || durationSeconds > 7_200)
		return defaultDurationSeconds;
	return durationSeconds;
}

function cleanRequiredText(value: unknown, message: string) {
	const text = String(value ?? '').trim();
	if (!text) throw badRequest(message);
	return text;
}

function numberKeyRecord(values: Record<string, number>) {
	return Object.fromEntries(Object.entries(values).map(([key, value]) => [Number(key), value]));
}

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function byLocalDateDescending(left: { localDate: string }, right: { localDate: string }) {
	return right.localDate.localeCompare(left.localDate);
}

function localTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function requiredResult<T>(value: T | undefined, message: string): T {
	if (value === undefined) throw new Error(message);
	return value;
}

function badRequest(message: string) {
	return new LocalServiceError(400, message);
}

function methodNotAllowed() {
	return new LocalServiceError(405, 'Method not allowed.');
}
