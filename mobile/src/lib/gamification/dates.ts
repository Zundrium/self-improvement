export function selectedGamificationDate(url: URL, today: string) {
	const requestedDate = url.searchParams.get('date');
	if (!requestedDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return today;
	return requestedDate <= today ? requestedDate : today;
}
