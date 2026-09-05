import type { BreathingSettingsData } from '$lib/local/breathing/model';
import type { FitnessSettingsData } from '$lib/local/fitness/model';
import type { HappinessSettingsData } from '$lib/local/happiness/model';
import type { MeditationSettingsData } from '$lib/local/meditation/model';
import type { PeriodSettingsData } from '$lib/local/period/model';
import type { ScreenTimeSettingsData } from '$lib/local/screen-time/model';
import type { StepsSettingsData } from '$lib/local/steps/model';
import type { StretchSettingsData } from '$lib/local/stretch/model';

export type TrackerProgressDay = { date: string; value: number | null };
export type DatedData = {
	date: string;
	today: string;
	markedDates?: string[];
	progressDays: TrackerProgressDay[];
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
