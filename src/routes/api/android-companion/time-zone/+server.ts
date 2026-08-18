import { json } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import { androidCompanionTimeZoneSchema } from '$lib/android-companion/pairing';
import {
	InvalidCompanionTokenError,
	updateAndroidCompanionTimeZone
} from '$lib/server/android-companion/time-zone';
import { requireDb } from '$lib/server/guards';
import { STEP_TOKEN_HEADER } from '../../../(trackers)/steps/steps';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 256;
const TOKEN_PATTERN = /^stp_[0-9a-f]{64}$/;
const requestSchema = z.object({ timeZone: androidCompanionTimeZoneSchema }).strict();

export const POST: RequestHandler = async ({ request, locals }) => {
	const token = request.headers.get(STEP_TOKEN_HEADER)?.trim();
	if (!token) return response({ error: `Missing ${STEP_TOKEN_HEADER} header.` }, 401);
	if (!TOKEN_PATTERN.test(token)) return response({ error: 'Invalid companion token.' }, 401);
	if (bodyIsTooLarge(request)) return response({ error: 'Payload too large.' }, 413);
	return updateTimeZone(request, locals, token);
};

async function updateTimeZone(request: Request, locals: App.Locals, token: string) {
	try {
		const input = await readRequest(request);
		const timeZone = await updateAndroidCompanionTimeZone(requireDb(locals), token, input.timeZone);
		return response({ timeZone });
	} catch (cause) {
		return failureResponse(cause);
	}
}

function failureResponse(cause: unknown) {
	if (cause instanceof PayloadTooLargeError) {
		return response({ error: 'Payload too large.' }, 413);
	}
	if (cause instanceof SyntaxError || cause instanceof ZodError) {
		return response({ error: 'Invalid time-zone payload.' }, 400);
	}
	if (cause instanceof InvalidCompanionTokenError) {
		return response({ error: 'Invalid companion token.' }, 401);
	}
	console.error('Failed to update Android companion time zone.');
	return response({ error: 'Could not update the time zone.' }, 500);
}

function bodyIsTooLarge(request: Request) {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

async function readRequest(request: Request) {
	const body = await request.text();
	if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
		throw new PayloadTooLargeError();
	}
	return requestSchema.parse(JSON.parse(body) as unknown);
}

function response(body: Record<string, unknown>, status = 200) {
	return json(body, { status, headers: { 'cache-control': 'no-store' } });
}

class PayloadTooLargeError extends Error {}
