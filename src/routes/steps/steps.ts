export const STEP_TOKEN_HEADER = 'X-Steps-Token';
export {
	parseHealthConnectPayload,
	type HealthConnectPayload,
	type HealthConnectStep
} from '$lib/local/native/steps';

export function parseStepGoal(value: FormDataEntryValue | null) {
	const goal = Number(value);
	if (!Number.isInteger(goal) || goal < 1_000 || goal > 100_000) {
		throw new Error('Enter a daily goal between 1,000 and 100,000 steps.');
	}
	return goal;
}

export {
	dateKeysEndingAt,
	isLocalDayStart,
	isValidDateKey,
	isValidTimeZone,
	localDateForInstant
} from '$lib/trackers/dates';
