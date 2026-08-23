import { isValidTimeZone } from '$lib/trackers/dates';
import { SecureMobileRepository } from '$native/secure-repository';

export const API_BASE_URL = (import.meta.env.PUBLIC_API_BASE_URL || 'https://self.zund.cc').replace(
	/\/$/,
	''
);
export const mobileRepository = new SecureMobileRepository();
export const GAMIFICATION_CHANGED_EVENT = 'gamification:changed';

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const credentials = await mobileRepository.loadCredentials();
	const headers = new Headers(init?.headers);
	if (credentials?.token) headers.set('authorization', `Bearer ${credentials.token}`);
	if (credentials && !headers.has('X-Time-Zone') && isValidTimeZone(credentials.timeZone)) {
		headers.set('X-Time-Zone', credentials.timeZone);
	}
	if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
	const response = await fetch(apiUrl(path), { ...init, headers });
	const refreshedToken = response.headers.get('set-auth-token');
	if (refreshedToken) await saveAuthToken(refreshedToken);
	if (response.status === 401) await mobileRepository.disconnect();
	if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
	const result = response.status === 204 ? (undefined as T) : ((await response.json()) as T);
	if (init?.method && init.method.toUpperCase() !== 'GET') notifyGamificationChanged();
	return result;
}

function notifyGamificationChanged() {
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(GAMIFICATION_CHANGED_EVENT));
}

export async function saveAuthToken(token: string) {
	await mobileRepository.saveCredentials({
		apiBaseUrl: API_BASE_URL,
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
		token
	});
}

export async function refreshCredentialsTimeZone() {
	const credentials = await mobileRepository.loadCredentials();
	if (!credentials) return;
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	if (credentials.timeZone !== timeZone) {
		await mobileRepository.saveCredentials({ ...credentials, timeZone });
	}
}

export function apiUrl(path: string) {
	return new URL(path.replace(/^\//, ''), `${API_BASE_URL}/`).toString();
}

async function errorMessage(response: Response) {
	const fallback = `Request failed (${response.status}).`;
	const text = await response.text();
	try {
		const body = JSON.parse(text) as { message?: string; error?: string };
		return body.message || body.error || fallback;
	} catch {
		return text || fallback;
	}
}

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
	}
}
