import type { ActionFeedItem } from '$lib/actions/contracts';
import type { StretchDifficulties } from '$lib/local/tracker-settings';
import type { AppTracker, AppTrackerId } from '$lib/trackers/registry';
import type {
	CompletedWorkoutDay,
	ExercisePreference,
	WorkoutProgram
} from '../routes/fitness/fitness';
import type { HappinessRating, HappinessReason } from '../routes/happiness/happiness';
import type { cycleSummary, MenstruationFlow } from '../routes/period/period';

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
export type AchievementCategory =
	| 'tracker-milestone'
	| 'score'
	| 'streak'
	| 'overall'
	| 'tracker-special'
	| 'combination'
	| 'event';
export type AchievementSummary = {
	id: string;
	title: string;
	description: string;
	icon: string;
	category: AchievementCategory;
	trackerId?: AppTrackerId;
	unlocked: boolean;
	unlockedAt: string | null;
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

export type StepsSettingsData = { dailyGoal: number };
export type ScreenTimeSettingsData = { dailyLimitMinutes: number };
export type FitnessSettingsData = { defaultSets: number };
export type MeditationSettingsData = { defaultDurationSeconds: number };
export type BreathingSettingsData = { rounds: number; includeHold: boolean };
export type StretchSettingsData = {
	holdSeconds: number;
	difficulties: StretchDifficulties;
};
export type HappinessSettingsData = { defaultRating: HappinessRating };
export type PeriodSettingsData = {
	defaultFlow: MenstruationFlow;
	fallbackCycleDays: number;
};
export type TrackerSettingsDataMap = {
	steps: StepsSettingsData;
	'screen-time': ScreenTimeSettingsData;
	fitness: FitnessSettingsData;
	meditation: MeditationSettingsData;
	breathing: BreathingSettingsData;
	stretch: StretchSettingsData;
	happiness: HappinessSettingsData;
	period: PeriodSettingsData;
};

export type StepsData = DatedData & {
	settings: StepsSettingsData;
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
	settings: ScreenTimeSettingsData;
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
	settings: FitnessSettingsData;
	program: WorkoutProgram;
	completedDays: CompletedWorkoutDay[];
};

export type ExerciseData = { exercises: ExercisePreference[] };
export type MeditationData = DatedData & {
	settings: MeditationSettingsData;
	initialDurationSeconds: number;
	meditationHistory: Array<{ localDate: string; totalSeconds: number; sessionCount: number }>;
};
export type BreathingData = DatedData & {
	settings: BreathingSettingsData;
	exercise: { localDate: string; technique: string; durationSeconds: number } | null;
};
export type StretchSession = {
	id: string;
	localDate: string;
	holdSeconds: number;
	completedAt: string;
	hardVariationCompleted?: boolean;
};
export type StretchData = DatedData & {
	settings: StretchSettingsData;
	scheduled: boolean;
	sessions: StretchSession[];
};
export type ChoresSession = {
	localDate: string;
	durationSeconds: number;
	startedAt: number;
};
export type ChoresData = DatedData & {
	session: ChoresSession | null;
};
export type HappinessData = DatedData & {
	settings: HappinessSettingsData;
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
	settings: PeriodSettingsData;
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
