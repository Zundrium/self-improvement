import { validationFailure } from './errors';

export function payloadTimestamp(value: Date) {
	if (!Number.isFinite(value.getTime())) throw validationFailure();
	return value.toISOString();
}

export function payloadAppVersion(value: string) {
	const appVersion = value.trim();
	if (!appVersion || appVersion.length > 40) throw validationFailure();
	return appVersion;
}

export function normalizedInstant(value: string) {
	const milliseconds = Date.parse(value);
	if (!Number.isFinite(milliseconds)) throw validationFailure();
	return new Date(milliseconds).toISOString();
}

export function intervalSeconds(start: string, end: string) {
	const duration = Math.floor((Date.parse(end) - Date.parse(start)) / 1000);
	if (!Number.isSafeInteger(duration)) throw validationFailure();
	return duration;
}
