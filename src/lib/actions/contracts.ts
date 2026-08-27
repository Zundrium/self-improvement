import type { AppTrackerId } from '$lib/trackers/registry';

export type ActionPriority = 'blocking' | 'warning' | 'activity';
export type ActionIcon = 'tracker' | 'permission' | 'sync';
export type NavigateAction = { type: 'navigate'; href: string };
export type ActionFeedCommand =
	| NavigateAction
	| { type: 'request-health-access'; trackerIds: Array<'steps'> }
	| { type: 'open-usage-access' }
	| {
			type: 'sync-android-data';
			trackerIds: Array<'steps' | 'sleep' | 'screenTime'>;
	  };

export type ActionEnvironment = {
	now: Date;
	timeZone: string;
	localDate: string;
	localMinuteOfDay: number;
};

export type StepActionState = {
	date: string;
	steps: number;
	goal: number;
	hasMeasurements: boolean;
};

export type SleepActionState = {
	date: string;
	status: 'pending' | 'pass' | 'fail';
	bedtime: string;
	lateUsageSeconds: number;
	setupRequired: boolean;
};

export type ScreenTimeActionState = {
	date: string;
	minutes: number;
	limitMinutes: number;
	recorded: boolean;
	hasMeasurements: boolean;
};

export type FitnessActionState = {
	date: string;
	scheduled: boolean;
	completed: boolean;
	workoutId: number | null;
	sets: number | null;
	firstSetDurationSeconds: number | null;
	additionalSetDurationSeconds: number | null;
};

export type EatingWindow = {
	start: string;
	end: string;
};

export type NutritionActionState = {
	date: string;
	configured: boolean;
	hasEntries: boolean;
	calories: number;
	calorieGoal: number | null;
	fasting: boolean;
	eatingWindow: EatingWindow | null;
};

export type MeditationActionState = {
	date: string;
	completed: boolean;
	daysSinceLastSession: number | null;
};

export type BreathingActionState = {
	date: string;
	completed: boolean;
};

export type StretchActionState = {
	date: string;
	scheduled: boolean;
	completed: boolean;
};

export type HappinessActionState = {
	date: string;
	rating: 1 | 2 | 3 | 4 | 5 | null;
};

export type PeriodActionState = {
	date: string;
	flow: 'spotting' | 'light' | 'medium' | 'heavy' | null;
};

export type TrackerActionStates = {
	steps: StepActionState;
	sleep: SleepActionState;
	'screen-time': ScreenTimeActionState;
	fitness: FitnessActionState;
	nutrition: NutritionActionState;
	meditation: MeditationActionState;
	breathing: BreathingActionState;
	stretch: StretchActionState;
	happiness: HappinessActionState;
	period: PeriodActionState;
};

export type ActionSnapshot = {
	date: string;
	today: string;
	enabledTrackerIds: AppTrackerId[];
	trackers: TrackerActionStates;
};

export type ActionCandidate = {
	id: string;
	trackerIds: AppTrackerId[];
	resolve(snapshot: ActionSnapshot, environment: ActionEnvironment): ActionResolution | null;
};

export type ActionResolution = {
	id: string;
	goalId?: string;
	conflictKeys?: string[];
	priority: ActionPriority;
	score: number;
	icon: ActionIcon;
	title: string;
	reason: string;
	action: NavigateAction;
};

export type ActionProposal = ActionResolution & {
	candidateId: string;
	trackerIds: AppTrackerId[];
};

export type ActionFeedItem = {
	id: string;
	trackerIds: AppTrackerId[];
	priority: ActionPriority;
	icon: ActionIcon;
	title: string;
	reason?: string;
	action: ActionFeedCommand;
};
