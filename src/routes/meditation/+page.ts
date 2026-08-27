import { apiRequest } from '$lib/api';
import type { MeditationData } from '$lib/api-types';
import type { PageLoad } from './$types';
import {
	DEFAULT_DURATION_SECONDS,
	MAXIMUM_DURATION_SECONDS,
	MINIMUM_DURATION_SECONDS
} from './meditation';

export const load: PageLoad = async ({ url }) => ({
	...(await apiRequest<MeditationData>(`/api/app/meditation${url.search}`)),
	initialDurationSeconds: requestedDuration(url)
});

function requestedDuration(url: URL) {
	const duration = Number(url.searchParams.get('duration'));
	if (!Number.isInteger(duration)) return DEFAULT_DURATION_SECONDS;
	if (duration < MINIMUM_DURATION_SECONDS || duration > MAXIMUM_DURATION_SECONDS)
		return DEFAULT_DURATION_SECONDS;
	return duration;
}
