import type { ScreenTimeData } from '$lib/api-types';
import {
	resolveAndroidApplicationIdentities,
	type AndroidApplicationIdentity
} from '../../native/application-identity';

type IdentifiedApp = { package: string; name: string };
export type ScreenTimeAppWithIcon<T extends IdentifiedApp = IdentifiedApp> = T & { icon?: string };

export async function screenTimeDataWithAppIdentities(data: ScreenTimeData) {
	const packageNames = [
		...data.knownApps.map((app) => app.package),
		...data.usage.apps.map((app) => app.package)
	];
	const applications = await resolveAndroidApplicationIdentities(packageNames);
	return {
		...data,
		knownApps: addScreenTimeAppIdentities(data.knownApps, applications),
		usage: {
			...data.usage,
			apps: addScreenTimeAppIdentities(data.usage.apps, applications)
		}
	};
}

export function addScreenTimeAppIdentities<T extends IdentifiedApp>(
	apps: T[],
	applications: Record<string, AndroidApplicationIdentity>
): ScreenTimeAppWithIcon<T>[] {
	return apps.map((app) => identifiedApp(app, applications[app.package]));
}

function identifiedApp<T extends IdentifiedApp>(app: T, identity?: AndroidApplicationIdentity) {
	return {
		...app,
		name: identity?.label?.trim() || app.name,
		icon: identity?.icon
	};
}
