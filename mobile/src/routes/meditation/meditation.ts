export const MINIMUM_DURATION_SECONDS = 60;
export const MAXIMUM_DURATION_SECONDS = 120 * 60;
export const DEFAULT_DURATION_SECONDS = 5 * 60;

export type MeditationCompletion = {
	id: string;
	localDate: string;
	durationSeconds: number;
	startedAt: number;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function formatTimer(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number) {
	const totalMinutes = Math.round(totalSeconds / 60);
	if (totalMinutes < 60) return `${totalMinutes} min`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

export function getLocalDate(date = new Date()) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function isValidLocalDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return getUtcDate(date) === value;
}

function getUtcDate(date: Date) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
