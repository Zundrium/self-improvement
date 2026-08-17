import { error, redirect, type RequestEvent } from '@sveltejs/kit';

export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>) {
	if (!event.locals.user) {
		const destination = `${event.url.pathname}${event.url.search}`;
		redirect(303, `/sign-in?redirect=${encodeURIComponent(destination)}`);
	}
	return event.locals.user;
}

export function requireAdmin(event: Pick<RequestEvent, 'locals' | 'url'>) {
	const user = requireUser(event);
	if (user.role !== 'admin') redirect(303, '/profile');
	return user;
}

export function requireDb(locals: App.Locals) {
	if (!locals.db) error(503, 'Database unavailable');
	return locals.db;
}
