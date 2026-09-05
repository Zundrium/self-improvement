import { isValidCalendarDate } from '$lib/utils';

export function selectedGamificationDate(url: URL, today: string) {
	const requestedDate = url.searchParams.get('date');
	if (!requestedDate || !isValidCalendarDate(requestedDate)) return today;
	return requestedDate <= today ? requestedDate : today;
}
