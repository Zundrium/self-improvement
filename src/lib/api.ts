import { localAppService, LocalServiceError } from '$lib/local/service';
import { SecureMobileRepository } from '$native/secure-repository';

export const mobileRepository = new SecureMobileRepository();
export const GAMIFICATION_CHANGED_EVENT = 'gamification:changed';

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
	try {
		const result = await localAppService.request<T>(path, init);
		if ((init?.method ?? 'GET').toUpperCase() !== 'GET') notifyGamificationChanged();
		return result;
	} catch (cause) {
		if (cause instanceof LocalServiceError) throw new ApiError(cause.status, cause.message);
		throw cause;
	}
}

export async function recordAchievementEvents(...achievementIds: string[]) {
	if (!achievementIds.length) return;
	try {
		await apiRequest('/api/app/achievements/unlock', {
			method: 'POST',
			body: JSON.stringify({ achievementIds })
		});
	} catch {
		return;
	}
}

function notifyGamificationChanged() {
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(GAMIFICATION_CHANGED_EVENT));
}

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
	}
}
