import {
	CapacitorUsageStatsManager,
	type UsageStats
} from '@capgo/capacitor-android-usagestatsmanager';
import type { LocalDayRange } from '../domain/day-ranges';
import { validationFailure } from '../domain/errors';
import type { PermissionCheck } from '../domain/model';
import { usageProviderFailure } from '../domain/native-failures';
import type { NativeUsageDay } from '../domain/screen-time';
import { resolveAndroidApplicationIdentities } from './application-identity';
import { requireNativeAndroid } from './platform';

export class AndroidUsageAdapter {
	async checkPermission(): Promise<PermissionCheck> {
		requireNativeAndroid();
		try {
			const { granted } = await CapacitorUsageStatsManager.isUsageStatsPermissionGranted();
			return { state: granted ? 'granted' : 'denied' };
		} catch (cause) {
			throw usageProviderFailure(cause);
		}
	}

	async readDailyUsage(days: LocalDayRange[], now: Date): Promise<NativeUsageDay[]> {
		requireNativeAndroid();
		const collectionMilliseconds = validCollectionTime(now);
		const results: NativeUsageDay[] = [];
		for (const range of days) {
			results.push(await this.readDay(range, collectionMilliseconds));
		}
		return withApplicationLabels(results);
	}

	async openSettings() {
		requireNativeAndroid();
		await CapacitorUsageStatsManager.openUsageStatsSettings();
	}

	private async readDay(range: LocalDayRange, collectionMilliseconds: number) {
		try {
			const stats = await CapacitorUsageStatsManager.queryAndAggregateUsageStats({
				beginTime: range.startMilliseconds,
				endTime: queryEnd(range, collectionMilliseconds)
			});
			return { range, stats: usageStats(stats) };
		} catch (cause) {
			throw usageProviderFailure(cause);
		}
	}
}

function usageStats(stats: Record<string, UsageStats>) {
	return stats;
}

async function withApplicationLabels(days: NativeUsageDay[]) {
	const packageNames = days.flatMap((day) => Object.keys(day.stats));
	const applications = await resolveAndroidApplicationIdentities(packageNames, false);
	const appLabels = applicationLabels(applications);
	return days.map((day) => ({ ...day, appLabels }));
}

function applicationLabels(applications: Record<string, { label?: string }>) {
	return Object.fromEntries(
		Object.entries(applications).flatMap(([packageName, application]) =>
			typeof application.label === 'string' ? [[packageName, application.label]] : []
		)
	);
}

function validCollectionTime(now: Date) {
	const milliseconds = now.getTime();
	if (!Number.isFinite(milliseconds)) throw validationFailure();
	return milliseconds;
}

function queryEnd(range: LocalDayRange, collectionMilliseconds: number) {
	const end = Math.min(range.endMilliseconds, collectionMilliseconds);
	if (end < range.startMilliseconds) throw validationFailure();
	return end;
}
