import { apiRequest } from '$lib/api';
import type { ScreenTimeData, SleepData, StepsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const query = `?timeZone=${encodeURIComponent(localTimeZone())}`;
	const [steps, sleep, screenTime] = await Promise.all([
		apiRequest<StepsData>(`/api/app/steps${query}`),
		apiRequest<SleepData>(`/api/app/sleep${query}`),
		apiRequest<ScreenTimeData>(`/api/app/screen-time${query}`)
	]);
	return {
		trackers: [
			trackerStatus('steps', 'Steps', 'Health Connect', steps),
			trackerStatus('sleep', 'Sleep', 'Health Connect', sleep),
			trackerStatus('screen-time', 'Screen time', 'Android Usage Access', screenTime)
		]
	};
};

function trackerStatus(
	id: 'steps' | 'sleep' | 'screen-time',
	label: string,
	provider: string,
	data: {
		isSynced: boolean;
		hasData: boolean;
		connection: { lastReceivedAt: string | null } | null;
	}
) {
	return {
		id,
		label,
		provider,
		isSynced: data.isSynced,
		hasData: data.hasData,
		lastReceivedAt: data.connection?.lastReceivedAt ?? null
	};
}

function localTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
