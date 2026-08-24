import { rollingLocalDayRanges } from '../domain/day-ranges';
import type { AppCredentials, TrackerId } from '../domain/model';
import { buildScreenTimePayload } from '../domain/screen-time';
import { buildSleepPayload } from '../domain/sleep';
import { buildStepsPayload, rollingStepDayRanges } from '../domain/steps';
import type { TrackerJob } from '../domain/sync-coordinator';
import { TrackerUploader } from '../domain/uploader';
import { getAppVersion } from './app';
import { AndroidHealthAdapter } from './health';
import { capacitorRequest } from './http';
import { AndroidUsageAdapter } from './usage';

export function createNativeTrackerJobs(
	health = new AndroidHealthAdapter(),
	usage = new AndroidUsageAdapter(),
	uploader = new TrackerUploader(capacitorRequest)
): Record<TrackerId, TrackerJob> {
	return {
		steps: trackerJob(
			() => health.checkPermission(),
			(credentials, now) => collectSteps(health, credentials, now),
			(payload, credentials) => uploader.upload('steps', credentials, payload)
		),
		sleep: trackerJob(
			() => usage.checkPermission(),
			(credentials, now) => collectSleep(usage, credentials, now),
			(payload, credentials) => uploader.upload('sleep', credentials, payload)
		),
		screenTime: trackerJob(
			() => usage.checkPermission(),
			(credentials, now) => collectScreenTime(usage, credentials, now),
			(payload, credentials) => uploader.upload('screenTime', credentials, payload)
		)
	};
}

async function collectSteps(health: AndroidHealthAdapter, credentials: AppCredentials, now: Date) {
	const days = rollingStepDayRanges(now, credentials.timeZone);
	const [samples, version] = await Promise.all([health.aggregateSteps(days), getAppVersion()]);
	return buildStepsPayload(samples, now, version);
}

async function collectSleep(usage: AndroidUsageAdapter, credentials: AppCredentials, now: Date) {
	const days = rollingLocalDayRanges(now, credentials.timeZone, 2);
	const [events, version] = await Promise.all([
		usage.readActivityEvents(days, now),
		getAppVersion()
	]);
	return buildSleepPayload(events, days, now, version);
}

async function collectScreenTime(
	usage: AndroidUsageAdapter,
	credentials: AppCredentials,
	now: Date
) {
	const days = rollingLocalDayRanges(now, credentials.timeZone);
	const [stats, version] = await Promise.all([usage.readDailyUsage(days, now), getAppVersion()]);
	return buildScreenTimePayload(stats, now, version);
}

function trackerJob(
	checkPermission: TrackerJob['checkPermission'],
	collect: TrackerJob['collect'],
	upload: (payload: unknown, credentials: AppCredentials) => Promise<void>
): TrackerJob {
	return {
		checkPermission,
		collect,
		upload: (credentials, payload) => upload(payload, credentials)
	};
}
