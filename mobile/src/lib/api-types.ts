import type { HappinessRating, HappinessReason } from '../routes/happiness/happiness';
import { cycleSummary, type MenstruationFlow } from '../routes/period/period';
import type {
	CompletedWorkoutDay,
	ExercisePreference,
	WorkoutProgram
} from '../routes/fitness/fitness';
import type { AppTracker, AppTrackerId } from '$lib/trackers/registry';

export type LocalProfile = {
	id: string;
	name: string;
	createdAt: string;
};

export type StreakSummary = {
	trackerId: AppTrackerId;
	label: string;
	points: number;
	current: number;
	best: number;
	total: number;
};
export type DayStreakSummary = {
	label: string;
	current: number;
	best: number;
	total: number;
};
export type AchievementSummary = {
	id: string;
	title: string;
	description: string;
	unlocked: boolean;
	progress: number;
	target: number;
};
export type GamificationData = {
	today: string;
	glimmers: number;
	score: number;
	earnedNow: number;
	bestCurrentStreak: number;
	achievementCount: number;
	achievementTotal: number;
	dayStreak: DayStreakSummary;
	streaks: StreakSummary[];
	achievements: AchievementSummary[];
};
export type Reward = { id: string; name: string; emoji: string; price: number };
export type RewardRedemption = Reward & { redeemedAt: string };
export type RewardsData = {
	today: string;
	glimmers: number;
	rewards: Reward[];
	redemptions: RewardRedemption[];
};
export type AppBootstrapData = {
	profile: LocalProfile;
	enabledTrackers: AppTracker[];
	gamification: GamificationData;
};
export type DatedData = { date: string; today: string; markedDates?: string[] };

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
	happinessRating: HappinessRating | null;
	periodFlow: MenstruationFlow | null;
};

export type ActionPriority = 'blocking' | 'warning' | 'activity';
export type ActionFeedCommand =
	| { type: 'navigate'; href: string }
	| { type: 'request-health-access'; trackerIds: Array<'steps'> }
	| { type: 'open-usage-access' }
	| {
			type: 'sync-android-data';
			trackerIds: Array<'steps' | 'sleep' | 'screenTime'>;
	  };
export type ActionFeedItem = {
	id: string;
	trackerIds: AppTrackerId[];
	priority: ActionPriority;
	icon: 'tracker' | 'permission' | 'sync';
	title: string;
	action: ActionFeedCommand;
};
export type ActionFeedData = {
	date: string;
	daySummary: DaySummaryData;
	items: ActionFeedItem[];
};

export type StepsData = DatedData & {
	connection: { dailyGoal: number; lastReceivedAt: string | null } | null;
	isSynced: boolean;
	hasData: boolean;
	steps: number;
	days: Array<{ date: string; count: number }>;
};

export type SleepAdherenceStatus = 'pending' | 'pass' | 'fail';
export type SleepSettingsData = { bedtime: string; remindersEnabled: boolean };
export type SleepUsageApp = { package: string; name: string; seconds: number };
export type SleepAdherenceSummary = {
	localDate: string;
	configuredBedtime: string;
	windowStartAt: string | null;
	windowEndAt: string | null;
	lateUsageSeconds: number;
	latestScreenActivityAt: string | null;
	usedApps: SleepUsageApp[];
	violatingApps: SleepUsageApp[];
	status: SleepAdherenceStatus;
};
export type SleepData = DatedData & {
	settings: SleepSettingsData;
	lastReceivedAt: string | null;
	isSynced: boolean;
	hasData: boolean;
	setupRequired: boolean;
	summary: SleepAdherenceSummary;
	days: SleepAdherenceSummary[];
};

export type ScreenTimeData = DatedData & {
	connection: { lastReceivedAt: string | null } | null;
	isSynced: boolean;
	hasData: boolean;
	usage: {
		totalMinutes: number;
		apps: Array<{ package: string; name: string; minutes: number; last_used: string }>;
	};
	knownApps: Array<{ package: string; name: string; tracked: boolean }>;
	averageMinutes: number;
	historyMaxMinutes: number;
	days: Array<{ date: string; totalMinutes: number }>;
};

export type FitnessData = DatedData & {
	program: WorkoutProgram;
	completedDays: CompletedWorkoutDay[];
};

export type ExerciseData = { exercises: ExercisePreference[] };
export type MeditationData = DatedData & {
	meditationHistory: Array<{ localDate: string; totalSeconds: number; sessionCount: number }>;
};
export type BreathingData = DatedData & {
	exercise: { localDate: string; technique: string; durationSeconds: number } | null;
};
export type HappinessData = DatedData & {
	entry: {
		localDate: string;
		rating: HappinessRating;
		reasons: HappinessReason[];
		updatedAt: string;
	} | null;
	recentEntries: Array<{ localDate: string; rating: HappinessRating }>;
};
type CycleSummary = NonNullable<ReturnType<typeof cycleSummary>>;

export type PeriodData = DatedData & {
	entry: { localDate: string; flow: MenstruationFlow; notes: string; updatedAt: string } | null;
	recentEntries: Array<{ localDate: string; flow: MenstruationFlow }>;
	cycle: CycleSummary | null;
};

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
	ingredients: NutritionIngredient[];
	totals: NutritionTotals;
};
export type NutritionEntry = {
	id: string;
	date: string;
	name: string;
	notes: string;
	createdAt: string;
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
