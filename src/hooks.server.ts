import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth';
import { createDb } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = null;
	event.locals.user = null;
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
	return appendSessionCookies(response, sessionResult.headers);
};

function appendSessionCookies(response: Response, headers: Headers) {
	for (const cookie of headers.getSetCookie()) response.headers.append('set-cookie', cookie);
	return response;
}
