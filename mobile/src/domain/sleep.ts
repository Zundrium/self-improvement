import type { LocalDayRange } from './day-ranges';
import { validationFailure } from './errors';
import {
	intervalSeconds,
	normalizedInstant,
	payloadAppVersion,
	payloadTimestamp
} from './payload-validation';
import type { SleepPayload } from './payloads';

const MAX_SESSION_SECONDS = 36 * 60 * 60;
const MAX_SESSIONS = 100;
const MAX_STAGES = 200;

export type NativeSleepStage = {
	startDate: string;
	endDate: string;
	stage: string;
	durationMinutes?: number;
};

export type NativeSleepSample = {
	startDate: string;
	endDate: string;
	sourceName?: string;
	sourceId?: string;
	stages?: NativeSleepStage[];
	hasStageData?: boolean;
};

export function buildSleepPayload(
	samples: NativeSleepSample[],
	days: LocalDayRange[],
	timestamp: Date,
	appVersion: string
): SleepPayload {
	const sessions = uniqueSessions(samplesInRange(samples, days));
	if (sessions.length > MAX_SESSIONS) throw validationFailure('Too many sleep sessions to sync.');
	return {
		timestamp: payloadTimestamp(timestamp),
		app_version: payloadAppVersion(appVersion),
		sleep: sessions.map(toSleepSession)
	};
}

function toSleepSession(sample: NativeSleepSample): SleepPayload['sleep'][number] {
	const start = normalizedInstant(sample.startDate);
	const end = normalizedInstant(sample.endDate);
	const duration = intervalSeconds(start, end);
	if (duration < 1 || duration > MAX_SESSION_SECONDS) throw validationFailure();
	const session = {
		session_end_time: end,
		duration_seconds: duration,
		stages: sleepStages(sample, start, end)
	};
	const source = dataOrigin(sample);
	return source ? { ...session, metadata: { data_origin: source } } : session;
}

function sleepStages(sample: NativeSleepSample, sessionStart: string, sessionEnd: string) {
	if (sample.hasStageData === false) throw validationFailure('Sleep stage detail is unavailable.');
	if (!sample.stages?.length) throw validationFailure('Sleep stage detail is unavailable.');
	if (sample.stages.length > MAX_STAGES) throw validationFailure('Too many sleep stages to sync.');
	return [...sample.stages]
		.sort((left, right) => Date.parse(left.startDate) - Date.parse(right.startDate))
		.map((stage) => toSleepStage(stage, sessionStart, sessionEnd));
}

function toSleepStage(stage: NativeSleepStage, sessionStart: string, sessionEnd: string) {
	const start = normalizedInstant(stage.startDate);
	const end = normalizedInstant(stage.endDate);
	const duration = intervalSeconds(start, end);
	if (start < sessionStart || end > sessionEnd || duration < 0 || duration > MAX_SESSION_SECONDS) {
		throw validationFailure();
	}
	return {
		stage: stageName(stage.stage),
		start_time: start,
		end_time: end,
		duration_seconds: duration
	};
}

function samplesInRange(samples: NativeSleepSample[], days: LocalDayRange[]) {
	validateDays(days);
	const start = Math.min(...days.map((day) => day.startMilliseconds));
	const end = Math.max(...days.map((day) => day.endMilliseconds));
	return samples.filter((sample) => sessionBelongsInRange(sample, start, end));
}

function sessionBelongsInRange(sample: NativeSleepSample, start: number, end: number) {
	const sessionEnd = Date.parse(sample.endDate);
	if (!Number.isFinite(sessionEnd) || !Number.isFinite(Date.parse(sample.startDate))) {
		throw validationFailure();
	}
	return sessionEnd >= start && sessionEnd < end;
}

function validateDays(days: LocalDayRange[]) {
	if (!days.length || days.length > 7) throw validationFailure();
	if (new Set(days.map((day) => day.date)).size !== days.length) throw validationFailure();
}

function uniqueSessions(samples: NativeSleepSample[]) {
	const ordered = [...samples].sort(compareSessions);
	const sessions = new Map<number, NativeSleepSample>();
	for (const sample of ordered) sessions.set(Date.parse(sample.endDate), sample);
	return [...sessions.values()];
}

function compareSessions(left: NativeSleepSample, right: NativeSleepSample) {
	const endDifference = Date.parse(left.endDate) - Date.parse(right.endDate);
	return endDifference || Date.parse(left.startDate) - Date.parse(right.startDate);
}

function stageName(value: string) {
	const stage = value.trim();
	if (!stage || stage.length > 64) throw validationFailure();
	return stage === 'inBed' ? 'in_bed' : stage;
}

function dataOrigin(sample: NativeSleepSample) {
	const source = (sample.sourceId || sample.sourceName || '').trim();
	if (source.length > 255) throw validationFailure();
	return source;
}
