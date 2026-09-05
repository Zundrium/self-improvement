import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function safeRedirect(value: unknown, fallback = '/') {
	if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
	if (value.startsWith('//') || value.startsWith('/api/auth')) return fallback;
	return value;
}

export function todayIso(now = new Date()) {
	return localDateKey(now);
}

/** A calendar date in the device's local time zone, rather than a UTC instant. */
export function localDateKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
		date.getDate()
	).padStart(2, '0')}`;
}

export function isValidCalendarDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

export function millisecondsUntilNextLocalMidnight(now = new Date()) {
	const nextMidnight = new Date(now);
	nextMidnight.setHours(24, 0, 0, 0);
	return nextMidnight.getTime() - now.getTime();
}

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
