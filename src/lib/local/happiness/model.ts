export const happinessRatings = [1, 2, 3, 4, 5] as const;
export type HappinessRating = (typeof happinessRatings)[number];
export const happinessReasons = {
	low: [
		'sad_event',
		'self_esteem',
		'stress',
		'anxiety',
		'loneliness',
		'conflict',
		'health',
		'poor_sleep'
	],
	middle: [
		'peaceful_moment',
		'small_win',
		'supportive_conversation',
		'self_care',
		'steady_progress',
		'good_sleep',
		'fresh_air',
		'enjoyable_activity'
	],
	high: [
		'great_event',
		'achievement',
		'meaningful_connection',
		'exciting_experience',
		'purpose',
		'gratitude',
		'energy',
		'excellent_sleep'
	]
} as const;
export type HappinessReason = (typeof happinessReasons)[keyof typeof happinessReasons][number];
export type HappinessSettingsData = { defaultRating: HappinessRating };
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
export function isHappinessRating(value: number): value is HappinessRating {
	return happinessRatings.includes(value as HappinessRating);
}

export function isHappinessReasonForRating(value: string, rating: HappinessRating) {
	const reasons =
		rating <= 2
			? happinessReasons.low
			: rating === 3
				? happinessReasons.middle
				: happinessReasons.high;
	return (reasons as readonly string[]).includes(value);
}
import type { DatedData } from '$lib/trackers/model';
