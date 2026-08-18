import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth';
import { createDb } from '$lib/server/db';

const DEFAULT_MOBILE_ORIGINS = [
	'https://localhost',
	'http://localhost',
	'http://localhost:5173',
	'http://10.0.2.2:5173'
];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = null;
	event.locals.user = null;
	const allowedOrigin = mobileOrigin(event);
	if (event.request.method === 'OPTIONS' && allowedOrigin) return preflightResponse(allowedOrigin);
	if (building || !event.platform?.env.DB) return resolve(event);

	const auth = createAuth(event.platform.env, event.url.origin);
	event.locals.auth = auth;
	event.locals.db = createDb(event.platform.env.DB);
	const sessionResult = await auth.api.getSession({
		headers: event.request.headers,
		returnHeaders: true
	});
	event.locals.session = sessionResult.response;
	event.locals.user = sessionResult.response?.user ?? null;

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'cache-control' || name === 'vary'
	});
	appendSessionHeaders(response, sessionResult.headers);
	if (allowedOrigin) appendCorsHeaders(response, allowedOrigin);
	return response;
};

function mobileOrigin(event: Parameters<Handle>[0]['event']) {
	const origin = event.request.headers.get('origin');
	if (!origin) return '';
	const configured =
		event.platform?.env.MOBILE_APP_ORIGINS?.split(',').map((value) => value.trim()) ?? [];
	return [...DEFAULT_MOBILE_ORIGINS, ...configured].includes(origin) ? origin : '';
}

function preflightResponse(origin: string) {
	const response = new Response(null, { status: 204 });
	appendCorsHeaders(response, origin);
	return response;
}

function appendCorsHeaders(response: Response, origin: string) {
	response.headers.set('access-control-allow-origin', origin);
	response.headers.set('access-control-allow-credentials', 'true');
	response.headers.set(
		'access-control-allow-headers',
		'Authorization, Content-Type, X-Time-Zone, X-Steps-Token, X-Sleep-Token, X-Screen-Time-Token'
	);
	response.headers.set('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
	response.headers.set('access-control-expose-headers', 'set-auth-token');
	response.headers.append('vary', 'Origin');
}

function appendSessionHeaders(response: Response, headers: Headers) {
	for (const cookie of headers.getSetCookie()) response.headers.append('set-cookie', cookie);
	const token = headers.get('set-auth-token');
	if (token) response.headers.set('set-auth-token', token);
}
