import { localDateForInstant } from '$lib/trackers/dates';
import { type AppTrackerId, appTrackers } from '$lib/trackers/registry';
import { completionDates } from './gamification';
import type { LocalAppState } from './state';

export const TRACKER_COMPLETED_EVENT = 'tracker:completed';
export type TrackerCompletionDetail = { trackerId: AppTrackerId };

export function notifyNewTrackerCompletions(
	before: LocalAppState,
	after: LocalAppState,
	now = new Date()
) {
	for (const trackerId of newlyCompletedTrackerIds(before, after, now)) {
		dispatchTrackerCompletion(trackerId);
	}
}

export function newlyCompletedTrackerIds(
	before: LocalAppState,
	after: LocalAppState,
	now = new Date()
): AppTrackerId[] {
	const today = localDateForInstant(now, localTimeZone());
	const previousDates = completionDates(before, today);
	const nextDates = completionDates(after, today);
	return appTrackers
		.filter(({ id }) => nextDates[id].some((date) => !previousDates[id].includes(date)))
		.map(({ id }) => id);
}

function dispatchTrackerCompletion(trackerId: AppTrackerId) {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(
		new CustomEvent<TrackerCompletionDetail>(TRACKER_COMPLETED_EVENT, { detail: { trackerId } })
	);
}

function localTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
