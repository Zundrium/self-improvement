import type { TrackerId } from '$domain/model';

export function permissionsSettingsHref(tracker?: TrackerId) {
	const trackerId = tracker === 'screenTime' ? 'screen-time' : tracker;
	return trackerId ? `/profile?tab=permissions&tracker=${trackerId}` : '/profile?tab=permissions';
}
