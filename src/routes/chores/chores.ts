import { isValidDateKey } from '$lib/trackers/dates';

export const CHORES_DURATION_SECONDS = 600 as const;

export type ChoresCompletion = {
	localDate: string;
	startedAt: number;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function formatTimer(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isValidLocalDate(value: string) {
	return isValidDateKey(value);
}
