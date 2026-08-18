import { SyncFailure, validationFailure } from './errors';
import type { AppCredentials, TrackerId } from './model';

const ENDPOINTS: Record<TrackerId, string> = {
	steps: 'steps/api/health-connect',
	sleep: 'sleep/api/health-connect',
	screenTime: 'screen-time/api/usage'
};

const BODY_LIMITS: Record<TrackerId, number> = {
	steps: 128 * 1024,
	sleep: 128 * 1024,
	screenTime: 256 * 1024
};

export type FetchAdapter = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class TrackerUploader {
	constructor(private readonly request: FetchAdapter = fetch) {}

	async upload(tracker: TrackerId, credentials: AppCredentials, payload: unknown) {
		const body = payloadBody(tracker, payload);
		const response = await this.send(tracker, credentials, body);
		if (!response.ok) throw responseFailure(response.status);
	}

	private async send(tracker: TrackerId, credentials: AppCredentials, body: string) {
		try {
			return await this.request(endpointUrl(credentials.apiBaseUrl, tracker), {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${credentials.token}`,
					'Content-Type': 'application/json',
					'X-Time-Zone': credentials.timeZone
				},
				body
			});
		} catch {
			throw new SyncFailure('network');
		}
	}
}

function payloadBody(tracker: TrackerId, payload: unknown) {
	let body: string;
	try {
		body = JSON.stringify(payload);
	} catch {
		throw validationFailure();
	}
	if (new TextEncoder().encode(body).byteLength > BODY_LIMITS[tracker]) {
		throw validationFailure('The tracker batch is too large to upload safely.');
	}
	return body;
}

function endpointUrl(apiBaseUrl: string, tracker: TrackerId) {
	const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
	try {
		return new URL(ENDPOINTS[tracker], baseUrl).toString();
	} catch {
		throw new SyncFailure('session');
	}
}

function responseFailure(status: number) {
	if (status === 401 || status === 403) return new SyncFailure('auth');
	if (status === 400 || status === 413 || status === 422) return validationFailure();
	return new SyncFailure('server');
}
