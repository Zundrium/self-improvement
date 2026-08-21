import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

const TRACKERS = new Set(['steps', 'sleep', 'screen-time']);

export const load: PageLoad = ({ params }) => {
	if (!TRACKERS.has(params.tracker)) error(404, 'Android data guide not found.');
	return { tracker: params.tracker as 'steps' | 'sleep' | 'screen-time' };
};
