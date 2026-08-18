import {
	androidCompanionPairingPayloadSchema,
	parseAndroidCompanionPairingPayload,
	serializeAndroidCompanionPairingPayload
} from '$lib/android-companion/pairing';
import { SyncFailure, validationFailure } from './errors';
import type { PairingCredentials } from './model';
import type { FetchAdapter } from './uploader';

const TIME_ZONE_ENDPOINT = '/api/android-companion/time-zone';

export function parsePairingCode(serialized: string): PairingCredentials {
	try {
		return parseAndroidCompanionPairingPayload(serialized);
	} catch {
		throw new SyncFailure('pairing', 'That QR code is not a valid companion connection.', false);
	}
}

export function parseStoredPairing(serialized: string): PairingCredentials {
	try {
		return androidCompanionPairingPayloadSchema.parse(JSON.parse(serialized) as unknown);
	} catch {
		throw new SyncFailure(
			'pairing',
			'The saved connection is invalid. Reconnect the companion.',
			false
		);
	}
}

export function serializePairing(pairing: PairingCredentials) {
	return serializeAndroidCompanionPairingPayload(pairing);
}

export class DeviceTimeZoneHandshake {
	constructor(
		private readonly request: FetchAdapter = fetch,
		private readonly resolveTimeZone: () => string = runtimeTimeZone
	) {}

	async connect(pairing: PairingCredentials) {
		const devicePairing = withDeviceTimeZone(pairing, this.resolveTimeZone);
		await updateServerTimeZone(devicePairing, this.request);
		return devicePairing;
	}

	async refresh(pairing: PairingCredentials) {
		const devicePairing = withDeviceTimeZone(pairing, this.resolveTimeZone);
		await updateServerTimeZone(devicePairing, this.request);
		return devicePairing.timeZone === pairing.timeZone ? pairing : devicePairing;
	}
}

export function withDeviceTimeZone(
	pairing: PairingCredentials,
	resolveTimeZone: () => string = runtimeTimeZone
) {
	try {
		return androidCompanionPairingPayloadSchema.parse({
			...pairing,
			timeZone: resolveTimeZone()
		});
	} catch {
		throw new SyncFailure('pairing', 'The Android time zone could not be verified.', false);
	}
}

function runtimeTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

async function updateServerTimeZone(pairing: PairingCredentials, request: FetchAdapter) {
	let response: Response;
	try {
		response = await request(new URL(TIME_ZONE_ENDPOINT, pairing.apiBaseUrl), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Steps-Token': pairing.tokens.steps
			},
			body: JSON.stringify({ timeZone: pairing.timeZone })
		});
	} catch {
		throw new SyncFailure('network');
	}
	if (!response.ok) throw timeZoneResponseFailure(response.status);
}

function timeZoneResponseFailure(status: number) {
	if (status === 401 || status === 403) return new SyncFailure('auth');
	if (status === 400 || status === 413 || status === 422) return validationFailure();
	return new SyncFailure('server');
}
