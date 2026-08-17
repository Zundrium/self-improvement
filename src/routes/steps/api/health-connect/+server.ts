import { json } from '@sveltejs/kit';
import { requireDb } from '$lib/server/guards';
import { parseHealthConnectPayload, STEP_TOKEN_HEADER } from '../../steps';
import { findConnectionByToken, recordHealthConnectPayload } from '../../server/steps';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 128 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	const token = request.headers.get(STEP_TOKEN_HEADER)?.trim();
	if (!token) return response({ error: `Missing ${STEP_TOKEN_HEADER} header.` }, 401);
	if (bodyIsTooLarge(request)) return response({ error: 'Payload too large.' }, 413);

	try {
		const connection = await findConnectionByToken(requireDb(locals), token);
		if (!connection) return response({ error: 'Invalid webhook token.' }, 401);
		const payload = parseHealthConnectPayload(await readBody(request));
		const accepted = await recordHealthConnectPayload(requireDb(locals), connection, payload);
		return response({ accepted });
	} catch (cause) {
		if (cause instanceof SyntaxError) return response({ error: 'Invalid JSON payload.' }, 400);
		if (cause instanceof Error && cause.message.includes('resolution to Daily')) {
			return response({ error: cause.message }, 422);
		}
		console.error('Failed to receive Health Connect steps:', cause);
		return response({ error: 'Invalid Health Connect payload.' }, 400);
	}
};

function bodyIsTooLarge(request: Request) {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

async function readBody(request: Request) {
	const body = await request.text();
	if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
		throw new SyntaxError('Payload too large.');
	}
	return JSON.parse(body) as unknown;
}

function response(body: Record<string, unknown>, status = 200) {
	return json(body, { status, headers: { 'cache-control': 'no-store' } });
}
