import type { HappinessRating, HappinessReason } from '../routes/happiness/happiness';
import { cycleSummary, type MenstruationFlow } from '../routes/period/period';
import type {
	CompletedWorkoutDay,
	ExercisePreference,
	WorkoutProgram
} from '../routes/fitness/fitness';
import type { AppTracker, AppTrackerId } from '$lib/trackers/registry';

export type AppUser = {
	id: string;
	name: string;
	email: string;
	image?: string | null;
	role?: string | null;
	banned?: boolean | null;
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
export type SessionData = {
	user: AppUser;
	enabledTrackers: AppTracker[];
	gamification: GamificationData;
};
export type DatedData = { date: string; today: string; markedDates?: string[] };

export type DaySummaryData = {
	date: string;
	today: string;
	steps: number;
	stepGoal: number;
	stepsHaveMeasurements: boolean;
	sleepMinutes: number;
	sleepGoalMinutes: number;
	sleepHasMeasurements: boolean;
	screenTimeMinutes: number;
	screenTimeLimitMinutes: number;
	screenTimeRecorded: boolean;
	screenTimeHasMeasurements: boolean;
	fitnessDone: boolean;
	fitnessWorkoutTitle: string;
	calories: number;
	calorieGoal: number | null;
	meditationDone: boolean;
	breathingDone: boolean;
	happinessRating: HappinessRating | null;
	periodFlow: MenstruationFlow | null;
};

export type ActionPriority = 'blocking' | 'warning' | 'activity';
export type ActionFeedCommand =
	| { type: 'navigate'; href: string }
	| { type: 'request-health-access'; trackerIds: Array<'steps' | 'sleep'> }
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

export type SleepData = DatedData & {
	connection: { dailyGoalMinutes: number; lastReceivedAt: string | null } | null;
	isSynced: boolean;
	hasData: boolean;
	durationSeconds: number;
	days: Array<{ date: string; durationSeconds: number; sessionCount: number }>;
	averageMinutes: number;
};

export type ScreenTimeData = DatedData & {
	connection: { lastReceivedAt: string | null } | null;
	isSynced: boolean;
	hasData: boolean;
	usage: {
		totalMinutes: number;
		apps: Array<{ package: string; name: string; minutes: number; last_used: string }>;
	};
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
	trackedDates: string[];
};
export type NutritionEntryData = { entry: NutritionEntry };
export type NutritionProfile = {
	weightKg: number;
	heightCm: number;
	age: number;
	gender: 'male' | 'female';
	activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
	dailyCalorieGoal: number;
	goalMode: 'estimated' | 'custom';
};
export type ProfileData = {
	profileUser: AppUser;
	nutritionProfile: NutritionProfile | null;
	trackerPreferences: Array<AppTracker & { enabled: boolean }>;
	sleepGoalMinutes: number;
	estimatedTdee: number | null;
	rewards: Reward[];
};
export type AdminData = {
	currentUser: AppUser;
	users: { users: AppUser[]; total: number };
	page: number;
	pageSize: number;
	search: string;
};

export type LayoutData = {
	user: AppUser | null;
	enabledTrackers: AppTracker[];
	gamification: GamificationData | null;
};

export type TrackerPreferencesPayload = { trackers: AppTrackerId[] };
