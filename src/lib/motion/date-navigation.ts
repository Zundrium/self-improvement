import { trackers } from '$lib/trackers/registry';

export function dateNavigationKey(pathname: string, date: string | null) {
	const trackerPath = pathname.replace(/^\/nutrition\/log\/[^/]+$/, '/nutrition/log/today');
	if (pathname === '/' || trackers.some(({ href }) => href === trackerPath)) return trackerPath;
	return `${pathname}:${date ?? ''}`;
}

export function dateDistance(from: string, to: string) {
	const distance = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
	return Number.isFinite(distance) ? Math.round(distance) : 0;
}
