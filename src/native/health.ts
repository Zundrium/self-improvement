import { Health, type AggregatedSample, type AvailabilityResult } from '@capgo/capacitor-health';
import type { LocalDayRange } from '../domain/day-ranges';
import type { PermissionCheck } from '../domain/model';
import { healthProviderFailure } from '../domain/native-failures';
import type { AggregatedStepDay } from '../domain/steps';
import { mapWithConcurrency } from './bounded-concurrency';
import { requireNativeAndroid } from './platform';

const HEALTH_TYPE = 'steps' as const;
const DAY_QUERY_CONCURRENCY = 2;
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

	async checkPermission(): Promise<PermissionCheck> {
		requireNativeAndroid();
		try {
			const availability = await Health.isAvailable();
			if (!availability.available) {
				return { state: 'unavailable', message: availabilityReason(availability.reason) };
			}
			const status = await Health.checkAuthorization({ read: [HEALTH_TYPE], write: [] });
			return { state: status.readAuthorized.includes(HEALTH_TYPE) ? 'granted' : 'denied' };
		} catch (cause) {
			throw healthProviderFailure(cause);
		}
	}

	async requestReadPermissions() {
		requireNativeAndroid();
		try {
			return await Health.requestAuthorization({ read: [HEALTH_TYPE], write: [] });
		} catch (cause) {
			throw healthProviderFailure(cause);
		}
	}

	async aggregateSteps(days: LocalDayRange[]): Promise<AggregatedStepDay[]> {
		requireNativeAndroid();
		return mapWithConcurrency(days, DAY_QUERY_CONCURRENCY, (range) => this.aggregateStepDay(range));
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
				dataType: HEALTH_TYPE,
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
