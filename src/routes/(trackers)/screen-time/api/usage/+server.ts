import { json } from '@sveltejs/kit';
import { requireDb } from '$lib/server/guards';
import {
	parseScreenTimePayload,
	SCREEN_TIME_TOKEN_HEADER,
	type ScreenTimePayload
} from '../../screen-time';
import {
	findScreenTimeConnectionByCompanionToken,
	findScreenTimeConnectionByToken,
	recordScreenTimePayload
} from '../../server/screen-time';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 256 * 1024;
const TOKEN_PATTERN = /^scr_[0-9a-f]{64}$/;

export const POST: RequestHandler = async ({ request, locals }) => {
	const token = request.headers.get(SCREEN_TIME_TOKEN_HEADER)?.trim();
	if (!token) return response({ error: `Missing ${SCREEN_TIME_TOKEN_HEADER} header.` }, 401);
	if (!TOKEN_PATTERN.test(token)) return response({ error: 'Invalid webhook token.' }, 401);
	if (bodyIsTooLarge(request)) return response({ error: 'Payload too large.' }, 413);

	let connection;
	try {
		connection = await findAuthorizedConnection(requireDb(locals), token);
	} catch {
		console.error('Failed to authenticate screen-time webhook.');
		return response({ error: 'Screen-time webhook unavailable.' }, 503);
	}
	if (!connection) return response({ error: 'Invalid webhook token.' }, 401);

	let payload: ScreenTimePayload;
	try {
		payload = parseScreenTimePayload(await readBody(request));
	} catch (cause) {
		if (cause instanceof PayloadTooLargeError) {
			return response({ error: 'Payload too large.' }, 413);
		}
		return response({ error: 'Invalid Life Dashboard Companion payload.' }, 400);
	}

	try {
		const accepted = await recordScreenTimePayload(requireDb(locals), connection, payload);
		return response({ accepted });
	} catch {
		console.error('Failed to store screen-time usage.');
		return response({ error: 'Could not store screen-time usage.' }, 500);
	}
};

async function findAuthorizedConnection(db: ReturnType<typeof requireDb>, token: string) {
	return (
		(await findScreenTimeConnectionByToken(db, token)) ??
		(await findScreenTimeConnectionByCompanionToken(db, token))
	);
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

class PayloadTooLargeError extends Error {}

function response(body: Record<string, unknown>, status = 200) {
	return json(body, { status, headers: { 'cache-control': 'no-store' } });
}
