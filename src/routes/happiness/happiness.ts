const lowReasonOptions = [
	{ value: 'sad_event', label: 'Sad event' },
	{ value: 'self_esteem', label: 'Self-esteem' },
	{ value: 'stress', label: 'Stress or overwhelm' },
	{ value: 'anxiety', label: 'Anxiety or worry' },
	{ value: 'loneliness', label: 'Loneliness' },
	{ value: 'conflict', label: 'Conflict' },
	{ value: 'health', label: 'Health' },
	{ value: 'poor_sleep', label: 'Poor sleep' }
] as const;

const middleReasonOptions = [
	{ value: 'peaceful_moment', label: 'Peaceful moment' },
	{ value: 'small_win', label: 'Small win' },
	{ value: 'supportive_conversation', label: 'Supportive conversation' },
	{ value: 'self_care', label: 'Took care of myself' },
	{ value: 'steady_progress', label: 'Made progress' },
	{ value: 'good_sleep', label: 'Slept well' },
	{ value: 'fresh_air', label: 'Fresh air' },
	{ value: 'enjoyable_activity', label: 'Enjoyable activity' }
] as const;

const highReasonOptions = [
	{ value: 'great_event', label: 'Great news or event' },
	{ value: 'achievement', label: 'Proud achievement' },
	{ value: 'meaningful_connection', label: 'Meaningful connection' },
	{ value: 'exciting_experience', label: 'Exciting experience' },
	{ value: 'purpose', label: 'Sense of purpose' },
	{ value: 'gratitude', label: 'Gratitude' },
	{ value: 'energy', label: 'Felt energetic' },
	{ value: 'excellent_sleep', label: 'Excellent sleep' }
] as const;

export const happinessRatings = [1, 2, 3, 4, 5] as const;
export type HappinessRating = (typeof happinessRatings)[number];
export type HappinessReason =
	| (typeof lowReasonOptions)[number]['value']
	| (typeof middleReasonOptions)[number]['value']
	| (typeof highReasonOptions)[number]['value'];

export function reasonOptionsForRating(rating: HappinessRating) {
	if (rating <= 2) return lowReasonOptions;
	if (rating === 3) return middleReasonOptions;
	return highReasonOptions;
}

export function happinessInputFromForm(form: FormData) {
	const localDate = String(form.get('localDate') ?? '');
	const rating = Number(form.get('rating'));
	const reasons = [...new Set(form.getAll('reasons').map(String))];
	if (!isValidDate(localDate)) throw new Error('Choose a valid date.');
	if (!isHappinessRating(rating)) throw new Error('Choose a happiness level.');
	if (!reasons.length) throw new Error('Choose at least one reason.');
	if (!reasons.every((reason) => isReasonForRating(reason, rating))) {
		throw new Error('Choose reasons that match your happiness level.');
	}
	return { localDate, rating, reasons: reasons as HappinessReason[] };
}

export function isValidDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const parsed = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function happinessLabel(rating: HappinessRating) {
	return ['Very unhappy', 'Unhappy', 'Okay', 'Happy', 'Very happy'][rating - 1];
}

function isHappinessRating(value: number): value is HappinessRating {
	return happinessRatings.includes(value as HappinessRating);
}

function isReasonForRating(value: string, rating: HappinessRating): value is HappinessReason {
	return reasonOptionsForRating(rating).some((option) => option.value === value);
}
