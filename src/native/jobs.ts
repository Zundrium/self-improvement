import { rollingLocalDayRanges } from '../domain/day-ranges';
import type { SyncContext, TrackerId } from '../domain/model';
import { buildScreenTimePayload } from '../domain/screen-time';
import { buildSleepPayload } from '../domain/sleep';
import { buildStepsPayload, rollingStepDayRanges } from '../domain/steps';
import type { TrackerJob } from '../domain/sync-coordinator';
import { ingestNativePayload } from '$lib/local/native-processing';
import { getAppVersion } from './app';
import { AndroidHealthAdapter } from './health';
import { AndroidUsageAdapter } from './usage';

export function createNativeTrackerJobs(
	health = new AndroidHealthAdapter(),
	usage = new AndroidUsageAdapter(),
	process = ingestNativePayload
): Record<TrackerId, TrackerJob> {
	return {
		steps: trackerJob(
			'steps',
			() => health.checkPermission(),
			(context, now) => collectSteps(health, context, now),
			process
		),
		sleep: trackerJob(
			'sleep',
			() => usage.checkPermission(),
			(context, now) => collectSleep(usage, context, now),
			process
		),
		screenTime: trackerJob(
			'screenTime',
			() => usage.checkPermission(),
			(context, now) => collectScreenTime(usage, context, now),
			process
		)
	};
}

async function collectSteps(health: AndroidHealthAdapter, context: SyncContext, now: Date) {
	const days = rollingStepDayRanges(now, context.timeZone);
	const [samples, version] = await Promise.all([health.aggregateSteps(days), getAppVersion()]);
	return buildStepsPayload(samples, now, version);
}

async function collectSleep(usage: AndroidUsageAdapter, context: SyncContext, now: Date) {
	const days = rollingLocalDayRanges(now, context.timeZone, 2);
	const [events, version] = await Promise.all([
		usage.readActivityEvents(days, now),
		getAppVersion()
	]);
	return buildSleepPayload(events, days, now, version);
}

async function collectScreenTime(usage: AndroidUsageAdapter, context: SyncContext, now: Date) {
	const days = rollingLocalDayRanges(now, context.timeZone);
	const [stats, version] = await Promise.all([usage.readDailyUsage(days, now), getAppVersion()]);
	return buildScreenTimePayload(stats, now, version);
}

function trackerJob(
	tracker: TrackerId,
	checkPermission: TrackerJob['checkPermission'],
	collect: TrackerJob['collect'],
	process: (tracker: TrackerId, context: SyncContext, payload: unknown) => Promise<void>
): TrackerJob {
	return {
		checkPermission,
		collect,
		process: (context, payload) => process(tracker, context, payload)
	};
}
