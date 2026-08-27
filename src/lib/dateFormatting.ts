export function fullDateLabel(dateKey: string) {
	return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});
}

export function shortDateLabel(dateKey: string) {
	return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
}

export function shortDayLabel(dateKey: string, today: string) {
	if (dateKey === today) return 'Today';
	return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
		new Date(`${dateKey}T12:00:00Z`)
	);
}
