import { z } from 'zod';
import type { StoredSleepStage } from '$lib/server/db/trackers/sleep';
import { localDateForInstant } from '$lib/trackers/dates';

export const DEFAULT_SLEEP_GOAL_MINUTES = 420;
export const SLEEP_TOKEN_HEADER = 'X-Sleep-Token';
export const MAX_SLEEP_SESSIONS = 100;
export const MAX_SLEEP_STAGES = 200;

const MAX_SLEEP_DURATION_SECONDS = 36 * 60 * 60;
const AWAKE_STAGE_TYPES = new Set(['1', '3', '7', 'awake', 'out_of_bed', 'awake_in_bed']);
const instantSchema = z.iso.datetime();
const metadataSchema = z
	.object({
		data_origin: z.string().trim().max(255).optional(),
		recording_method: z.string().trim().max(100).optional()
	})
	.passthrough();
const stageSchema = z
	.object({
		stage: z.string().trim().min(1).max(64),
		start_time: instantSchema,
		end_time: instantSchema,
		duration_seconds: z.number().int().min(0).max(MAX_SLEEP_DURATION_SECONDS)
	})
	.passthrough();
const sessionSchema = z
	.object({
		session_end_time: instantSchema,
		duration_seconds: z.number().int().min(1).max(MAX_SLEEP_DURATION_SECONDS),
		stages: z.array(stageSchema).max(MAX_SLEEP_STAGES),
		metadata: metadataSchema.optional()
	})
	.passthrough();
const payloadSchema = z
	.object({
		timestamp: instantSchema,
		app_version: z.string().trim().min(1).max(40),
		sleep: z.array(sessionSchema).max(MAX_SLEEP_SESSIONS).optional().default([])
	})
	.passthrough();

export type HealthConnectSleepPayload = z.infer<typeof payloadSchema>;
export type HealthConnectSleepRecord = HealthConnectSleepPayload['sleep'][number];
export class SleepPayloadError extends Error {}

export type CalculatedSleepSession = {
	sessionStartAt: Date;
	sessionEndAt: Date;
	localDate: string;
	sessionDurationSeconds: number;
	sleepDurationSeconds: number;
	stages: StoredSleepStage[];
	dataOrigin: string | null;
};

export function parseHealthConnectSleepPayload(input: unknown) {
	const payload = payloadSchema.parse(input);
	for (const session of payload.sleep) validateStages(session.stages);
	return payload;
}

export function parseSleepGoal(value: FormDataEntryValue | null) {
	const goal = Number(value);
	if (!Number.isInteger(goal) || goal < 60 || goal > 1_440) {
		throw new Error('Enter a daily goal between 60 and 1,440 minutes.');
	}
	return goal;
}

export function calculateSleepSession(
	record: HealthConnectSleepRecord,
	timeZone: string
): CalculatedSleepSession {
	const sessionEndAt = new Date(record.session_end_time);
	const sessionStartAt = new Date(sessionEndAt.getTime() - record.duration_seconds * 1000);
	return {
		sessionStartAt,
		sessionEndAt,
		localDate: localDateForInstant(sessionEndAt, timeZone),
		sessionDurationSeconds: record.duration_seconds,
		sleepDurationSeconds: measuredSleepSeconds(record),
		stages: record.stages.map(toStoredStage),
		dataOrigin: record.metadata?.data_origin ?? null
	};
}

export function measuredSleepSeconds(record: HealthConnectSleepRecord) {
	const awakeSeconds = record.stages
		.filter((stage) => isAwakeStage(stage.stage))
		.reduce((total, stage) => total + stage.duration_seconds, 0);
	return Math.max(0, record.duration_seconds - awakeSeconds);
}

export function averageSleepMinutes(days: Array<{ durationSeconds: number }>) {
	const recordedDays = days.filter((day) => day.durationSeconds > 0);
	if (!recordedDays.length) return 0;
	const totalSeconds = recordedDays.reduce((total, day) => total + day.durationSeconds, 0);
	return Math.round(totalSeconds / recordedDays.length / 60);
}

export function formatSleepMinutes(totalMinutes: number) {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (!hours) return `${minutes}m`;
	return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function validateStages(stages: HealthConnectSleepRecord['stages']) {
	let previousStart = -Infinity;
	for (const stage of stages) {
		const start = Date.parse(stage.start_time);
		const end = Date.parse(stage.end_time);
		if (end < start) throw new SleepPayloadError('A sleep stage ends before it starts.');
		if (Math.floor((end - start) / 1000) !== stage.duration_seconds) {
			throw new SleepPayloadError('A sleep stage duration does not match its interval.');
		}
		if (start < previousStart) {
			throw new SleepPayloadError('Sleep stages must be ordered by start time.');
		}
		previousStart = start;
	}
}

function isAwakeStage(stage: string) {
	return AWAKE_STAGE_TYPES.has(stage.toLowerCase().replace(/^stage_type_/, ''));
}

function toStoredStage(stage: HealthConnectSleepRecord['stages'][number]): StoredSleepStage {
	return {
		stage: stage.stage,
		startTime: stage.start_time,
		endTime: stage.end_time,
		durationSeconds: stage.duration_seconds
	};
}
