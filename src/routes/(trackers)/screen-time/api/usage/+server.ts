import { json } from '@sveltejs/kit';
import { requireDb } from '$lib/server/guards';
import {
	parseScreenTimePayload,
	SCREEN_TIME_TOKEN_HEADER,
	type ScreenTimePayload
} from '../../screen-time';
import {
	ensureScreenTimeConnection,
	findScreenTimeConnectionByCompanionToken,
	findScreenTimeConnectionByToken,
	recordScreenTimePayload
} from '../../server/screen-time';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 256 * 1024;
const TOKEN_PATTERN = /^scr_[0-9a-f]{64}$/;

export const POST: RequestHandler = async ({ request, locals }) => {
	const token = request.headers.get(SCREEN_TIME_TOKEN_HEADER)?.trim() ?? '';
	if (!locals.user && (!token || !TOKEN_PATTERN.test(token))) {
		return response({ error: 'Authentication required.' }, 401);
	}
	if (bodyIsTooLarge(request)) return response({ error: 'Payload too large.' }, 413);

	const db = requireDb(locals);
	let connection;
	try {
		connection = locals.user
			? await ensureScreenTimeConnection(db, locals.user.id, requestTimeZone(request))
			: await findAuthorizedConnection(db, token);
	} catch {
		console.error('Failed to authenticate screen-time ingestion.');
		return response({ error: 'Screen-time ingestion unavailable.' }, 503);
	}
	if (!connection) return response({ error: 'Authentication required.' }, 401);

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
		const accepted = await recordScreenTimePayload(db, connection, payload);
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

class PayloadTooLargeError extends Error {}

function response(body: Record<string, unknown>, status = 200) {
	return json(body, { status, headers: { 'cache-control': 'no-store' } });
}
