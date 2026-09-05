// Shared time presentation for tracker screens and the application drawer.

export function formatScreenTime(minutes: number) {
	const wholeMinutes = Math.max(0, Math.round(minutes));
	const hours = Math.floor(wholeMinutes / 60);
	const remainingMinutes = wholeMinutes % 60;
	if (!hours) return `${remainingMinutes}m`;
	if (!remainingMinutes) return `${hours}h`;
	return `${hours}h ${remainingMinutes}m`;
}

export function formatUsageSeconds(seconds: number) {
	const wholeSeconds = Math.max(0, Math.round(seconds));
	if (wholeSeconds < 60) return `${wholeSeconds}s`;
	const minutes = Math.floor(wholeSeconds / 60);
	const remainingSeconds = wholeSeconds % 60;
	return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function formatBedtime(bedtime: string) {
	const [hour, minute] = bedtime.split(':').map(Number);
	const date = new Date(2000, 0, 1, hour, minute);
	return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}
