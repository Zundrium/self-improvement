import { invalidate } from '$app/navigation';

export const APP_RESOURCES = {
	bootstrap: 'app:bootstrap',
	local: 'app:local',
	actionFeed: 'app:action-feed',
	profile: 'app:profile',
	gamification: 'app:gamification',
	tracker: (id: string) => `app:tracker:${id}` as const
} as const;

type ResourceKey = `${string}:${string}`;

let refreshPromise: Promise<void> | undefined;
const queued = new Set<string>();

export function registerResources(
	depends: (...dependencies: ResourceKey[]) => void,
	...resources: ResourceKey[]
) {
	depends(...resources);
}

export function registerLocalData(
	depends: (...dependencies: ResourceKey[]) => void,
	tracker?: string
) {
	registerResources(
		depends,
		APP_RESOURCES.local,
		...(tracker ? [APP_RESOURCES.tracker(tracker)] : [])
	);
}

export function refreshAppData(...resources: ResourceKey[]) {
	// Bootstrap-affecting mutations can also change the active tracker projection.
	if (resources.includes(APP_RESOURCES.bootstrap)) queued.add(APP_RESOURCES.local);
	for (const resource of resources) queued.add(resource);
	if (!refreshPromise) {
		refreshPromise = new Promise<void>((resolve, reject) => {
			queueMicrotask(() => void runRefreshes({ resolve, reject }));
		});
	}
	return refreshPromise;
}

async function runRefreshes(completion: { resolve: () => void; reject: (cause: unknown) => void }) {
	try {
		while (queued.size) {
			const resources = [...queued];
			queued.clear();
			await invalidate((url) => resources.includes(url.href));
		}
		// Clear ownership in the same continuation as the final queue check.
		// A later request must start a new drain, never join an already-finished one.
		refreshPromise = undefined;
		completion.resolve();
	} catch (cause) {
		queued.clear();
		refreshPromise = undefined;
		completion.reject(cause);
	}
}
