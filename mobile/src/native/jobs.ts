import { rollingLocalDayRanges } from '../domain/day-ranges';
import type { PairingCredentials, TrackerId } from '../domain/model';
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
			() => health.checkPermission('steps'),
			(pairing, now) => collectSteps(health, pairing, now),
			(payload, pairing) => uploader.upload('steps', pairing, payload)
		),
		sleep: trackerJob(
			() => health.checkPermission('sleep'),
			(pairing, now) => collectSleep(health, pairing, now),
			(payload, pairing) => uploader.upload('sleep', pairing, payload)
		),
		screenTime: trackerJob(
			() => usage.checkPermission(),
			(pairing, now) => collectScreenTime(usage, pairing, now),
			(payload, pairing) => uploader.upload('screenTime', pairing, payload)
		)
	};
}

async function collectSteps(health: AndroidHealthAdapter, pairing: PairingCredentials, now: Date) {
	const days = rollingStepDayRanges(now, pairing.timeZone);
	const [samples, version] = await Promise.all([health.aggregateSteps(days), getAppVersion()]);
	return buildStepsPayload(samples, now, version);
}

async function collectSleep(health: AndroidHealthAdapter, pairing: PairingCredentials, now: Date) {
	const days = rollingLocalDayRanges(now, pairing.timeZone);
	const [samples, version] = await Promise.all([health.readSleep(days), getAppVersion()]);
	return buildSleepPayload(samples, days, now, version);
}

async function collectScreenTime(
	usage: AndroidUsageAdapter,
	pairing: PairingCredentials,
	now: Date
) {
	const days = rollingLocalDayRanges(now, pairing.timeZone);
	const [stats, version] = await Promise.all([usage.readDailyUsage(days, now), getAppVersion()]);
	return buildScreenTimePayload(stats, now, version);
}

function trackerJob(
	checkPermission: TrackerJob['checkPermission'],
	collect: TrackerJob['collect'],
	upload: (payload: unknown, pairing: PairingCredentials) => Promise<void>
): TrackerJob {
	return {
		checkPermission,
		collect,
		upload: (pairing, payload) => upload(payload, pairing)
	};
}
