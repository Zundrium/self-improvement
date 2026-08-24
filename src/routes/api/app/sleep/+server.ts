import { error, json } from '@sveltejs/kit';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from '$lib/trackers/dates';
import { getTrackedScreenTimePackages } from '../../../(trackers)/screen-time/server/screen-time';
import {
	ensureSleepSettings,
	getSleepAdherence,
	pendingSleepSummary,
	updateSleepSettings
} from '../../../(trackers)/sleep/server/sleep';
import { parseBedtime, parseRemindersEnabled } from '../../../(trackers)/sleep/sleep';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const timeZone = url.searchParams.get('timeZone') ?? 'UTC';
	const settings = await ensureSleepSettings(locals.db, locals.user.id, timeZone);
	const today = localDateForInstant(new Date(), settings.timeZone);
	const date = selectedDate(url.searchParams.get('date'), today);
	const dateKeys = dateKeysEndingAt(today, 7);
	const [history, trackedPackages] = await Promise.all([
		getSleepAdherence(locals.db, locals.user.id, dateKeys[0], today),
		getTrackedScreenTimePackages(locals.db, locals.user.id)
	]);
	const selected =
		date >= dateKeys[0]
			? history.find((summary) => summary.localDate === date)
			: (await getSleepAdherence(locals.db, locals.user.id, date, date))[0];
	const summaries = new Map(history.map((summary) => [summary.localDate, summary]));
	const days = dateKeys
		.map((day) => summaries.get(day) ?? pendingSleepSummary(day, settings.bedtime))
		.map(publicSleepSummary)
		.toReversed();
	return json({
		settings: {
			bedtime: settings.bedtime,
			remindersEnabled: settings.remindersEnabled
		},
		lastReceivedAt: settings.lastReceivedAt,
		isSynced: Boolean(settings.lastReceivedAt),
		hasData: history.length > 0,
		setupRequired: trackedPackages.length === 0,
		date,
		today,
		markedDates: history.map((summary) => summary.localDate),
		summary: publicSleepSummary(selected ?? pendingSleepSummary(date, settings.bedtime)),
		days
	});
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid sleep settings.');
	const current = await ensureSleepSettings(
		locals.db,
		locals.user.id,
		String(body.timeZone ?? 'UTC')
	);
	try {
		const settings = await updateSleepSettings(locals.db, locals.user.id, {
			bedtime: Object.hasOwn(body, 'bedtime') ? parseBedtime(body.bedtime) : current.bedtime,
			remindersEnabled: Object.hasOwn(body, 'remindersEnabled')
				? parseRemindersEnabled(body.remindersEnabled)
				: current.remindersEnabled,
			timeZone: current.timeZone
		});
		return json(settings);
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'Could not update sleep settings.');
	}
};

function publicSleepSummary(
	summary:
		Awaited<ReturnType<typeof getSleepAdherence>>[number] | ReturnType<typeof pendingSleepSummary>
) {
	return {
		localDate: summary.localDate,
		configuredBedtime: summary.configuredBedtime,
		windowStartAt: summary.windowStartAt,
		windowEndAt: summary.windowEndAt,
		lateUsageSeconds: summary.lateUsageSeconds,
		latestScreenActivityAt: summary.latestScreenActivityAt,
		usedApps: summary.usedApps,
		violatingApps: summary.violatingApps,
		status: summary.status
	};
}

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidDateKey(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}
