import type { ActionFeedItem } from '$lib/actions/contracts';
import type { AppTracker, AppTrackerId } from '$lib/trackers/registry';
import type { HappinessRating } from '$lib/local/happiness/model';
import type { MenstruationFlow } from '$lib/local/period/model';
import type { SleepAdherenceStatus } from '$lib/local/sleep/model';
import type { GamificationData, Reward } from '$lib/local/gamification/model';
import type { DatedData } from '$lib/trackers/model';

export type LocalProfile = {
	id: string;
	name: string;
	createdAt: string;
};

export type AppBootstrapData = {
	profile: LocalProfile;
	enabledTrackers: AppTracker[];
	gamification: GamificationData;
};

export type DaySummaryData = {
	date: string;
	today: string;
	timeZone: string;
	steps: number;
	stepGoal: number;
	stepsHaveMeasurements: boolean;
	sleepStatus: SleepAdherenceStatus;
	sleepBedtime: string;
	sleepLateUsageSeconds: number;
	sleepSetupRequired: boolean;
	screenTimeMinutes: number;
	screenTimeLimitMinutes: number;
	screenTimeRecorded: boolean;
	screenTimeHasMeasurements: boolean;
	fitnessDone: boolean;
	fitnessWorkoutTitle: string;
	calories: number;
	calorieGoal: number | null;
	nutritionFasting: boolean;
	nutritionEatingWindow: EatingWindowSettings | null;
	meditationDone: boolean;
	breathingDone: boolean;
	stretchDone: boolean;
	stretchScheduled: boolean;
	choresDone: boolean;
	happinessRating: HappinessRating | null;
	periodFlow: MenstruationFlow | null;
};

export type {
	ActionFeedCommand,
	ActionFeedItem,
	ActionPriority
} from '$lib/actions/contracts';
export type ActionFeedData = {
	date: string;
	daySummary: DaySummaryData;
	items: ActionFeedItem[];
};

export type * from '$lib/trackers/model';
export type * from '$lib/local/steps/model';
export type * from '$lib/local/sleep/model';
export type * from '$lib/local/screen-time/model';
export type * from '$lib/local/fitness/model';
export type * from '$lib/local/meditation/model';
export type * from '$lib/local/breathing/model';
export type * from '$lib/local/stretch/model';
export type * from '$lib/local/chores/model';
export type * from '$lib/local/happiness/model';
export type * from '$lib/local/period/model';
export type * from '$lib/local/gamification/model';

export type NutritionTotals = {
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	count: number;
};
export type NutritionIngredient = {
	id: string;
	name: string;
	quantity: number;
	unit: string;
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	notes: string;
};
export type NutritionMeal = {
	id: string;
	name: string;
	imageDataUrl: string;
	ingredients: NutritionIngredient[];
	totals: NutritionTotals;
};
export type NutritionEntry = {
	id: string;
	date: string;
	name: string;
	notes: string;
	createdAt: string;
	thumbnail: string;
	meals: NutritionMeal[];
	totals: NutritionTotals;
};
export type NutritionLogData = DatedData & {
	entries: NutritionEntry[];
	totals: NutritionTotals;
	calorieGoal: number;
	eatingWindow: Omit<EatingWindowSettings, 'enabled'> | null;
	fasting: boolean;
	trackedDates: string[];
};
export type NutritionFastingStatusData = { date: string; fasting: boolean };
export type NutritionEntryData = { entry: NutritionEntry };
export type EatingWindowSettings = { enabled: boolean; start: string; end: string };
export type NutritionProfile = {
	weightKg: number;
	heightCm: number;
	age: number;
	gender: 'male' | 'female';
	activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
	dailyCalorieGoal: number;
	goalMode: 'estimated' | 'custom';
	eatingWindowEnabled: boolean;
	eatingWindowStart: string;
	eatingWindowEnd: string;
};
export type ProfileData = {
	profile: LocalProfile;
	nutritionProfile: NutritionProfile | null;
	trackerPreferences: Array<AppTracker & { enabled: boolean }>;
	estimatedTdee: number | null;
	rewards: Reward[];
};

export type TrackerPreferencesPayload = { trackers: AppTrackerId[] };

export type NutritionEntryInput = {
	date: string;
	time: string;
	timeZoneOffset: number;
	name?: string;
	notes?: string;
	meals: unknown[];
};
export type NutritionProfileInput = {
	weightKg: number | string;
	heightCm: number | string;
	age: number | string;
	gender: NutritionProfile['gender'] | string;
	activityLevel: NutritionProfile['activityLevel'] | string;
	goalMode?: NutritionProfile['goalMode'];
	customGoal?: number | string;
	eatingWindowEnabled?: boolean | string;
	eatingWindowStart?: string;
	eatingWindowEnd?: string;
};

export type LocalOperationMap = {
	bootstrap: { input: undefined; output: AppBootstrapData };
	gamification: { input: undefined; output: GamificationData };
	nutritionLog: { input: { date: string }; output: NutritionLogData };
	nutritionEntry: { input: { entryId: string }; output: NutritionEntryData };
	nutritionFastingStatus: {
		input: { date: string };
		output: NutritionFastingStatusData;
	};
	createNutritionEntry: { input: NutritionEntryInput; output: NutritionEntryData };
	updateNutritionEntry: {
		input: { entryId: string; entry: NutritionEntryInput };
		output: NutritionEntryData;
	};
	deleteNutritionEntry: { input: { entryId: string }; output: { date: string } };
	markNutritionFasting: { input: { date: string; days: number }; output: { dates: string[] } };
	cancelNutritionFasting: { input: { date: string }; output: { date: string } };
	saveNutritionProfile: {
		input: { mode: 'create' | 'update'; profile: NutritionProfileInput };
		output: { message: string };
	};
	unlockAchievements: {
		input: { achievementIds: string[] };
		output: { unlocked: string[] };
	};
};
