import {
	Health,
	type AggregatedSample,
	type AvailabilityResult,
	type HealthSample
} from '@capgo/capacitor-health';
import type { LocalDayRange } from '../domain/day-ranges';
import { validationFailure } from '../domain/errors';
import type { PermissionCheck } from '../domain/model';
import { healthProviderFailure } from '../domain/native-failures';
import type { AggregatedStepDay } from '../domain/steps';
import { requireNativeAndroid } from './platform';

const HEALTH_TYPES = ['steps', 'sleep'] as const;
const MAX_SLEEP_SESSION_SECONDS = 36 * 60 * 60;
const SLEEP_READ_LIMIT = 201;
const AVAILABILITY_REASONS = new Set([
	'Health Connect needs an update.',
	'Health Connect is unavailable on this device.',
	'Health Connect availability unknown.'
]);

export class AndroidHealthAdapter {
	async isAvailable(): Promise<AvailabilityResult> {
		requireNativeAndroid();
		try {
			const availability = await Health.isAvailable();
			return availability.available ? availability : unavailableHealth(availability.reason);
		} catch {
			return unavailableHealth('Health Connect availability could not be checked.');
		}
	}

	async checkPermission(dataType: (typeof HEALTH_TYPES)[number]): Promise<PermissionCheck> {
		requireNativeAndroid();
		try {
			const availability = await Health.isAvailable();
			if (!availability.available) {
				return { state: 'unavailable', message: availabilityReason(availability.reason) };
			}
			const status = await Health.checkAuthorization({ read: [dataType], write: [] });
			return { state: status.readAuthorized.includes(dataType) ? 'granted' : 'denied' };
		} catch (cause) {
			throw healthProviderFailure(cause);
		}
	}

	async requestReadPermissions() {
		requireNativeAndroid();
		try {
			return await Health.requestAuthorization({ read: [...HEALTH_TYPES], write: [] });
		} catch (cause) {
			throw healthProviderFailure(cause);
		}
	}

	async aggregateSteps(days: LocalDayRange[]): Promise<AggregatedStepDay[]> {
		requireNativeAndroid();
		const results: AggregatedStepDay[] = [];
		for (const range of days) results.push(await this.aggregateStepDay(range));
		return results;
	}

	async readSleep(days: LocalDayRange[]): Promise<HealthSample[]> {
		requireNativeAndroid();
		const range = combinedRange(days);
		try {
			const result = await Health.readSamples({
				dataType: 'sleep',
				startDate: range.start,
				endDate: range.end,
				limit: SLEEP_READ_LIMIT,
				ascending: true
			});
			if (result.samples.length >= SLEEP_READ_LIMIT) throw validationFailure();
			return result.samples;
		} catch (cause) {
			throw healthProviderFailure(cause);
		}
	}

	async openSettings() {
		requireNativeAndroid();
		await Health.openHealthConnectSettings();
	}

	async showPrivacyPolicy() {
		requireNativeAndroid();
		await Health.showPrivacyPolicy();
	}

	private async aggregateStepDay(range: LocalDayRange) {
		try {
			const { samples } = await Health.queryAggregated({
				dataType: 'steps',
				startDate: range.start,
				endDate: range.end,
				bucket: 'day',
				aggregation: 'sum'
			});
			return { range, samples: stepSamples(samples) };
		} catch (cause) {
			throw healthProviderFailure(cause);
		}
	}
}

function combinedRange(days: LocalDayRange[]) {
	if (!days.length) throw validationFailure();
	const extendedStart = days[0].startMilliseconds - MAX_SLEEP_SESSION_SECONDS * 1000;
	return {
		start: new Date(extendedStart).toISOString(),
		end: days.at(-1)?.end ?? days[0].end
	};
}

function stepSamples(samples: AggregatedSample[]) {
	return samples.map(({ value, values }) => ({ value, values: { sum: values.sum } }));
}

function unavailableHealth(reason?: string): AvailabilityResult {
	return { available: false, platform: 'android', reason: availabilityReason(reason) };
}

function availabilityReason(reason?: string) {
	return reason && AVAILABILITY_REASONS.has(reason)
		? reason
		: 'Health Connect availability could not be checked.';
}
