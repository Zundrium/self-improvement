import type { StretchDifficulties } from '$lib/local/tracker-settings';
import type { DatedData } from '$lib/trackers/model';

export type StretchSettingsData = { holdSeconds: number; difficulties: StretchDifficulties };
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

export function isStretchScheduled(date: string) {
	const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
	return day >= 1 && day <= 5;
}
