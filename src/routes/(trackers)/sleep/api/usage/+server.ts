import { json } from '@sveltejs/kit';
import { requireDb } from '$lib/server/guards';
import { recordSleepUsagePayload } from '../../server/sleep';
import { parseSleepUsagePayload, SleepPayloadError, type SleepUsagePayload } from '../../sleep';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return response({ error: 'Authentication required.' }, 401);
	if (bodyIsTooLarge(request)) return response({ error: 'Payload too large.' }, 413);
	let payload: SleepUsagePayload;
	try {
		payload = parseSleepUsagePayload(await readBody(request));
	} catch (cause) {
		if (cause instanceof PayloadTooLargeError) {
			return response({ error: 'Payload too large.' }, 413);
		}
		return response({ error: 'Invalid sleep adherence payload.' }, 400);
	}
	try {
		const accepted = await recordSleepUsagePayload(
			requireDb(locals),
			locals.user.id,
			requestTimeZone(request),
			payload
		);
		return response({ accepted });
	} catch (cause) {
		if (cause instanceof SleepPayloadError) {
			return response({ error: cause.message }, 400);
		}
		console.error('Failed to store sleep adherence usage.');
		return response({ error: 'Could not store sleep adherence usage.' }, 500);
	}
};

function requestTimeZone(request: Request) {
	return request.headers.get('X-Time-Zone')?.trim() ?? 'UTC';
}

function bodyIsTooLarge(request: Request) {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

async function readBody(request: Request) {
	const body = await request.text();
	if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
		throw new PayloadTooLargeError();
	}
	return JSON.parse(body) as unknown;
}

function response(body: Record<string, unknown>, status = 200) {
	return json(body, { status, headers: { 'cache-control': 'no-store' } });
}

class PayloadTooLargeError extends Error {}
