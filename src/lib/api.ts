import { appActionCandidates } from '$lib/app/action-candidates';
import { recordDiagnostic } from '$lib/app/diagnostics';
import { appMaintenance } from '$lib/app/maintenance';
import { LocalAppService, LocalServiceError } from '$lib/local/service';
import type { LocalOperationMap } from '$lib/app/model';
import { DatabaseMobileRepository } from '$native/secure-repository';

export const mobileRepository = new DatabaseMobileRepository();
const localAppService = new LocalAppService(undefined, undefined, appActionCandidates);
export const GAMIFICATION_CHANGED_EVENT = 'gamification:changed';

const operationMutates: Record<keyof LocalOperationMap, boolean> = {
	bootstrap: false,
	gamification: false,
	nutritionLog: false,
	nutritionEntry: false,
	nutritionFastingStatus: false,
	createNutritionEntry: true,
	updateNutritionEntry: true,
	deleteNutritionEntry: true,
	markNutritionFasting: true,
	cancelNutritionFasting: true,
	saveNutritionProfile: true,
	unlockAchievements: true
};

export function resetApplicationCaches() {
	localAppService.resetCaches();
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
	return appMaintenance.run(async () => {
		try {
			const result = await localAppService.request<T>(path, init);
			if ((init?.method ?? 'GET').toUpperCase() !== 'GET') notifyGamificationChanged();
			return result;
		} catch (cause) {
			if (cause instanceof LocalServiceError) throw new ApiError(cause.status, cause.message);
			throw cause;
		}
	});
}

export async function localOperation<K extends keyof LocalOperationMap>(
	operation: K,
	input: LocalOperationMap[K]['input']
): Promise<LocalOperationMap[K]['output']> {
	return appMaintenance.run(async () => {
		try {
			const result = await localAppService.execute(operation, input);
			if (operationMutates[operation]) notifyGamificationChanged();
			return result;
		} catch (cause) {
			if (cause instanceof LocalServiceError) throw new ApiError(cause.status, cause.message);
			throw cause;
		}
	});
}

export async function recordAchievementEvents(...achievementIds: string[]) {
	if (!achievementIds.length) return;
	try {
		await localOperation('unlockAchievements', { achievementIds });
	} catch {
		recordDiagnostic({
			operation: 'achievements',
			category: 'storage',
			committed: false,
			retryable: true
		});
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
