import { isHttpError, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { requireDb } from '$lib/server/guards';
import {
	ensureSleepConnection,
	findSleepConnectionByCompanionToken,
	findSleepConnectionByToken,
	recordHealthConnectSleepPayload
} from '../../server/sleep';
import { parseHealthConnectSleepPayload, SleepPayloadError, SLEEP_TOKEN_HEADER } from '../../sleep';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 128 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	const token = request.headers.get(SLEEP_TOKEN_HEADER)?.trim() ?? '';
	if (!locals.user && (!token || !isSleepToken(token))) {
		return response({ error: 'Authentication required.' }, 401);
	}
	if (bodyIsTooLarge(request)) return response({ error: 'Payload too large.' }, 413);

	try {
		const db = requireDb(locals);
		const connection = locals.user
			? await ensureSleepConnection(db, locals.user.id, requestTimeZone(request))
			: await findAuthorizedConnection(db, token);
		if (!connection) return response({ error: 'Authentication required.' }, 401);
		const payload = parseHealthConnectSleepPayload(await readJsonBody(request));
		const accepted = await recordHealthConnectSleepPayload(db, connection, payload);
		return response({ accepted });
	} catch (cause) {
		if (cause instanceof PayloadTooLargeError) {
			return response({ error: 'Payload too large.' }, 413);
		}
		if (cause instanceof SyntaxError) return response({ error: 'Invalid JSON payload.' }, 400);
		if (isHttpError(cause)) {
			return response({ error: 'Sleep webhook unavailable.' }, cause.status);
		}
		if (cause instanceof ZodError || cause instanceof SleepPayloadError) {
			return response({ error: 'Invalid Health Connect sleep payload.' }, 400);
		}
		console.error('Failed to receive Health Connect sleep.');
		return response({ error: 'Could not receive Health Connect sleep.' }, 500);
	}
};

async function findAuthorizedConnection(db: ReturnType<typeof requireDb>, token: string) {
	return (
		(await findSleepConnectionByToken(db, token)) ??
		(await findSleepConnectionByCompanionToken(db, token))
	);
}

function requestTimeZone(request: Request) {
	return request.headers.get('X-Time-Zone')?.trim() ?? 'UTC';
}

function isSleepToken(token: string) {
	return /^slp_[a-f0-9]{64}$/.test(token);
}

function bodyIsTooLarge(request: Request) {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

async function readJsonBody(request: Request) {
	const bytes = await readLimitedBytes(request.body);
	return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

async function readLimitedBytes(body: ReadableStream<Uint8Array> | null) {
	if (!body) return new Uint8Array();
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) return joinBytes(chunks, size);
		size += value.byteLength;
		if (size > MAX_BODY_BYTES) {
			await reader.cancel();
			throw new PayloadTooLargeError();
		}
		chunks.push(value);
	}
}

function joinBytes(chunks: Uint8Array[], size: number) {
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

function response(body: Record<string, unknown>, status = 200) {
	return json(body, { status, headers: { 'cache-control': 'no-store' } });
}

class PayloadTooLargeError extends Error {}
