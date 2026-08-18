import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/guards';
import type { RequestHandler } from './$types';

const PAGE_SIZE = 20;
const createSchema = z.object({
	name: z.string().trim().min(2).max(80),
	email: z.string().trim().toLowerCase().email(),
	password: z.string().min(8).max(128),
	role: z.enum(['user', 'admin'])
});
type AdminAuth = NonNullable<App.Locals['auth']>;

export const GET: RequestHandler = async (event) => {
	const currentUser = requireAdmin(event);
	const page = Math.max(0, Number.parseInt(event.url.searchParams.get('page') ?? '0', 10) || 0);
	const search = event.url.searchParams.get('search')?.trim() ?? '';
	const query: Record<string, string | number> = {
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
		sortBy: 'createdAt',
		sortDirection: 'desc'
	};
	if (search)
		Object.assign(query, { searchField: 'email', searchOperator: 'contains', searchValue: search });
	const users = await getAuth(event.locals).api.listUsers({
		query,
		headers: event.request.headers
	});
	return json({ currentUser, users, page, pageSize: PAGE_SIZE, search });
};

export const POST: RequestHandler = async (event) => {
	const currentUser = requireAdmin(event);
	const body = (await event.request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid request.');
	const action = String(body.action ?? '');
	const auth = getAuth(event.locals);
	try {
		if (action === 'create') {
			const parsed = createSchema.safeParse(body);
			if (!parsed.success) error(400, parsed.error.issues[0]?.message ?? 'Invalid user.');
			await auth.api.createUser({ body: parsed.data, headers: event.request.headers });
		}
		if (action === 'role') await updateRole(auth, event.request.headers, currentUser.id, body);
		if (action === 'password') await updatePassword(auth, event.request.headers, body);
		if (action === 'ban') await updateBan(auth, event.request.headers, currentUser.id, body, true);
		if (action === 'unban')
			await updateBan(auth, event.request.headers, currentUser.id, body, false);
		if (action === 'delete') await removeUser(auth, event.request.headers, currentUser.id, body);
		if (!['create', 'role', 'password', 'ban', 'unban', 'delete'].includes(action)) {
			error(400, 'Unknown administrator action.');
		}
		return json({ message: 'User updated.' });
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
		error(400, cause instanceof Error ? cause.message : 'Unable to update user.');
	}
};

async function updateRole(
	auth: AdminAuth,
	headers: Headers,
	currentUserId: string,
	body: Record<string, unknown>
) {
	const userId = readString(body.userId);
	const role = body.role === 'admin' ? 'admin' : 'user';
	if (!userId || (userId === currentUserId && role !== 'admin'))
		error(400, 'You cannot remove your own administrator role.');
	await auth.api.setRole({ body: { userId, role }, headers });
}

async function updatePassword(auth: AdminAuth, headers: Headers, body: Record<string, unknown>) {
	const userId = readString(body.userId);
	const newPassword = readString(body.newPassword);
	if (!userId || newPassword.length < 8) error(400, 'Use a password of at least 8 characters.');
	await auth.api.setUserPassword({ body: { userId, newPassword }, headers });
}

async function updateBan(
	auth: AdminAuth,
	headers: Headers,
	currentUserId: string,
	body: Record<string, unknown>,
	banned: boolean
) {
	const userId = readString(body.userId);
	if (!userId || userId === currentUserId) error(400, 'You cannot ban yourself.');
	if (banned) await auth.api.banUser({ body: { userId }, headers });
	else await auth.api.unbanUser({ body: { userId }, headers });
}

async function removeUser(
	auth: AdminAuth,
	headers: Headers,
	currentUserId: string,
	body: Record<string, unknown>
) {
	const userId = readString(body.userId);
	if (!userId || userId === currentUserId) error(400, 'You cannot delete yourself.');
	await auth.api.removeUser({ body: { userId }, headers });
}

function getAuth(locals: App.Locals) {
	if (!locals.auth) error(503, 'Authentication unavailable.');
	return locals.auth;
}

function readString(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}
