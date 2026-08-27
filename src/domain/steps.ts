import { rollingLocalDayRanges, type LocalDayRange } from './day-ranges';
import { validationFailure } from './errors';
import { payloadAppVersion, payloadTimestamp } from './payload-validation';
import type { StepsPayload } from './payloads';

export type AggregatedStepSample = {
	value: number;
	values?: { sum?: number };
};

export type AggregatedStepDay = {
	range: LocalDayRange;
	samples: AggregatedStepSample[];
};

export function rollingStepDayRanges(now: Date, timeZone: string, totalDays = 7) {
	const days = rollingLocalDayRanges(now, timeZone, totalDays);
	const today = days.at(-1);
	const collectionMilliseconds = now.getTime();
	if (
		!today ||
		collectionMilliseconds < today.startMilliseconds ||
		collectionMilliseconds >= today.endMilliseconds
	) {
		throw validationFailure();
	}
	return [
		...days.slice(0, -1),
		{
			...today,
			end: payloadTimestamp(now),
			endMilliseconds: collectionMilliseconds
		}
	];
}

export function buildStepsPayload(
	days: AggregatedStepDay[],
	timestamp: Date,
	appVersion: string
): StepsPayload {
	validateDays(days);
	const collectedAt = payloadTimestamp(timestamp);
	return {
		timestamp: collectedAt,
		app_version: payloadAppVersion(appVersion),
		steps: [...days].sort(byDate).map((day) => toDailyStep(day, timestamp, collectedAt))
	};
}

function toDailyStep(day: AggregatedStepDay, timestamp: Date, collectedAt: string) {
	return {
		count: dailyCount(day.samples),
		start_time: day.range.start,
		end_time: stepEnd(day.range, timestamp, collectedAt)
	};
}

function stepEnd(range: LocalDayRange, timestamp: Date, collectedAt: string) {
	const collectionMilliseconds = timestamp.getTime();
	return collectionMilliseconds >= range.startMilliseconds &&
		collectionMilliseconds <= range.endMilliseconds
		? collectedAt
		: range.end;
}

function dailyCount(samples: AggregatedStepSample[]) {
	const count = samples.reduce((total, sample) => total + sampleValue(sample), 0);
	if (!Number.isSafeInteger(count) || count < 0 || count > 1_000_000) throw validationFailure();
	return count;
}

function sampleValue(sample: AggregatedStepSample) {
	const value = sample.values?.sum ?? sample.value;
	if (!Number.isSafeInteger(value) || value < 0) throw validationFailure();
	return value;
}

function validateDays(days: AggregatedStepDay[]) {
	if (days.length > 7) throw validationFailure();
	if (new Set(days.map(({ range }) => range.date)).size !== days.length) throw validationFailure();
}

function byDate(left: AggregatedStepDay, right: AggregatedStepDay) {
	return left.range.date < right.range.date ? -1 : left.range.date > right.range.date ? 1 : 0;
}
