import { error, redirect } from '@sveltejs/kit';
import { permissionsSettingsHref } from '$lib/permissions';
import type { TrackerId } from '$domain/model';
import type { PageLoad } from './$types';

const TRACKERS: Record<string, TrackerId> = {
	steps: 'steps',
	sleep: 'sleep',
	'screen-time': 'screenTime'
};

export const load: PageLoad = ({ params }) => {
	const tracker = TRACKERS[params.tracker];
	if (!tracker) error(404, 'Android data guide not found.');
	redirect(307, permissionsSettingsHref(tracker));
};
