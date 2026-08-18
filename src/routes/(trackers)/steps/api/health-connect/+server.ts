import { json } from '@sveltejs/kit';
import { requireDb } from '$lib/server/guards';
import { parseHealthConnectPayload, STEP_TOKEN_HEADER } from '../../steps';
import {
	ensureStepConnection,
	findConnectionByCompanionToken,
	findConnectionByToken,
	recordHealthConnectPayload
} from '../../server/steps';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 128 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (bodyIsTooLarge(request)) return response({ error: 'Payload too large.' }, 413);

	const db = requireDb(locals);
	let connection;
	try {
		connection = locals.user
			? await ensureStepConnection(db, locals.user.id, requestTimeZone(request))
			: await findAuthorizedConnection(db, request.headers.get(STEP_TOKEN_HEADER)?.trim() ?? '');
	} catch {
		return response({ error: 'Steps ingestion unavailable.' }, 503);
	}
	if (!connection) return response({ error: 'Authentication required.' }, 401);

	let payload;
	try {
		payload = parseHealthConnectPayload(await readBody(request));
	} catch (cause) {
		return payloadFailure(cause);
	}

	try {
		return response({ accepted: await recordHealthConnectPayload(db, connection, payload) });
	} catch (cause) {
		if (cause instanceof Error && cause.message.includes('resolution to Daily')) {
			return response({ error: cause.message }, 422);
		}
		console.error('Failed to store Health Connect steps.');
		return response({ error: 'Could not store Health Connect steps.' }, 500);
	}
};

async function findAuthorizedConnection(db: ReturnType<typeof requireDb>, token: string) {
	if (!token) return null;
	return (
		(await findConnectionByToken(db, token)) ?? (await findConnectionByCompanionToken(db, token))
	);
}

function requestTimeZone(request: Request) {
	return request.headers.get('X-Time-Zone')?.trim() ?? 'UTC';
}

function payloadFailure(cause: unknown) {
	if (cause instanceof PayloadTooLargeError) {
		return response({ error: 'Payload too large.' }, 413);
	}
	if (cause instanceof SyntaxError) return response({ error: 'Invalid JSON payload.' }, 400);
	return response({ error: 'Invalid Health Connect payload.' }, 400);
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
