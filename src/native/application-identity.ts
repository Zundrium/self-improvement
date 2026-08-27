import { registerPlugin } from '@capacitor/core';
import { isNativeAndroid } from './platform';

export type AndroidApplicationIdentity = {
	label?: string;
	icon?: string;
};

type AndroidAppIdentityPlugin = {
	resolve(options: { packageNames: string[]; includeIcons?: boolean }): Promise<{
		applications: Record<string, AndroidApplicationIdentity>;
	}>;
};

const AndroidAppIdentity = registerPlugin<AndroidAppIdentityPlugin>('AndroidAppIdentity');
const PACKAGES_PER_REQUEST = 25;

export async function resolveAndroidApplicationIdentities(
	packageNames: string[],
	includeIcons = true
) {
	const uniquePackages = uniquePackageNames(packageNames);
	if (!isNativeAndroid() || !uniquePackages.length) return {};
	const applications: Record<string, AndroidApplicationIdentity> = {};
	for (const packages of chunks(uniquePackages)) {
		Object.assign(applications, await resolveChunk(packages, includeIcons));
	}
	return applications;
}

async function resolveChunk(packageNames: string[], includeIcons: boolean) {
	try {
		return (await AndroidAppIdentity.resolve({ packageNames, includeIcons })).applications;
	} catch {
		return {};
	}
}

function uniquePackageNames(packageNames: string[]) {
	return [...new Set(packageNames.map((packageName) => packageName.trim()).filter(Boolean))];
}

function chunks(packageNames: string[]) {
	return Array.from({ length: Math.ceil(packageNames.length / PACKAGES_PER_REQUEST) }, (_, index) =>
		packageNames.slice(index * PACKAGES_PER_REQUEST, (index + 1) * PACKAGES_PER_REQUEST)
	);
}
