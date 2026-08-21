import type { HappinessRating, HappinessReason } from '../routes/happiness/happiness';
import { cycleSummary, type MenstruationFlow } from '../routes/period/period';
import type {
	CompletedWorkoutDay,
	ExercisePreference,
	WorkoutProgram
} from '../routes/fitness/fitness';
import type { Tracker, TrackerId } from '$lib/trackers/registry';

export type AppUser = {
	id: string;
	name: string;
	email: string;
	image?: string | null;
	role?: string | null;
	banned?: boolean | null;
	createdAt: string;
};

export type SessionData = { user: AppUser; enabledTrackers: Tracker[] };
export type DatedData = { date: string; today: string; markedDates?: string[] };

export type DashboardData = {
	date: string;
	today: string;
	steps: number;
	stepGoal: number;
	sleepMinutes: number;
	sleepGoalMinutes: number;
	screenTimeMinutes: number;
	screenTimeRecorded: boolean;
	fitnessDone: boolean;
	fitnessWorkoutTitle: string;
	calories: number;
	calorieGoal: number | null;
	meditationDone: boolean;
	breathingDone: boolean;
	happinessRating: HappinessRating | null;
	periodFlow: MenstruationFlow | null;
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
	trackerPreferences: Array<Tracker & { enabled: boolean }>;
	sleepGoalMinutes: number;
	estimatedTdee: number | null;
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
	enabledTrackers: Tracker[];
};

export type TrackerPreferencesPayload = { trackers: TrackerId[] };
