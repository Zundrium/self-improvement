import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;
const createSchema = z.object({
	name: z.string().trim().min(2).max(80),
	email: z.string().trim().toLowerCase().email(),
	password: z.string().min(8).max(128),
	role: z.enum(['user', 'admin'])
});

type AdminAuth = NonNullable<App.Locals['auth']>;

export const load: PageServerLoad = async (event) => {
	const currentUser = requireAdmin(event);
	const page = readPage(event.url.searchParams.get('page'));
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
	return { currentUser, users, page, pageSize: PAGE_SIZE, search };
};

export const actions: Actions = {
	create: async (event) => {
		requireAdmin(event);
		const parsed = createSchema.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success) return formError('create', parsed.error.issues[0]?.message);
		try {
			await getAuth(event.locals).api.createUser({
				body: parsed.data,
				headers: event.request.headers
			});
			return { form: 'create', message: 'User created.' };
		} catch (error) {
			return formError('create', errorMessage(error, 'Unable to create user.'));
		}
	},
	role: async (event) => {
		const currentUser = requireAdmin(event);
		const form = await event.request.formData();
		const userId = readForm(form, 'userId');
		const role = readForm(form, 'role') === 'admin' ? 'admin' : 'user';
		if (!userId || (userId === currentUser.id && role !== 'admin'))
			return formError(`role-${userId}`, 'You cannot remove your own administrator role.');
		try {
			await getAuth(event.locals).api.setRole({
				body: { userId, role },
				headers: event.request.headers
			});
			return { form: `role-${userId}`, message: 'Role updated.' };
		} catch (error) {
			return formError(`role-${userId}`, errorMessage(error, 'Unable to update role.'));
		}
	},
	password: async (event) => {
		requireAdmin(event);
		const form = await event.request.formData();
		const userId = readForm(form, 'userId');
		const newPassword = readForm(form, 'newPassword');
		if (!userId || newPassword.length < 8)
			return formError(`password-${userId}`, 'Use a password of at least 8 characters.');
		try {
			await getAuth(event.locals).api.setUserPassword({
				body: { userId, newPassword },
				headers: event.request.headers
			});
			return { form: `password-${userId}`, message: 'Password updated.' };
		} catch (error) {
			return formError(`password-${userId}`, errorMessage(error, 'Unable to update password.'));
		}
	},
	ban: async (event) => setBanState(event, true),
	unban: async (event) => setBanState(event, false),
	delete: async (event) => {
		const currentUser = requireAdmin(event);
		const userId = readForm(await event.request.formData(), 'userId');
		if (!userId || userId === currentUser.id)
			return formError('users', 'You cannot delete yourself.');
		try {
			await getAuth(event.locals).api.removeUser({
				body: { userId },
				headers: event.request.headers
			});
			return { form: 'users', message: 'User deleted.' };
		} catch (error) {
			return formError('users', errorMessage(error, 'Unable to delete user.'));
		}
	}
};

async function setBanState(event: Parameters<Actions[string]>[0], banned: boolean) {
	const currentUser = requireAdmin(event);
	const userId = readForm(await event.request.formData(), 'userId');
	if (!userId || userId === currentUser.id) return formError('users', 'You cannot ban yourself.');
	try {
		const auth = getAuth(event.locals);
		if (banned) await auth.api.banUser({ body: { userId }, headers: event.request.headers });
		else await auth.api.unbanUser({ body: { userId }, headers: event.request.headers });
		return { form: 'users', message: banned ? 'User banned.' : 'User restored.' };
	} catch (error) {
		return formError('users', errorMessage(error, 'Unable to update user.'));
	}
}

function getAuth(locals: App.Locals): AdminAuth {
	if (!locals.auth) throw new Error('Authentication is unavailable');
	return locals.auth;
}

function readPage(value: string | null) {
	return Math.max(0, Number.parseInt(value ?? '0', 10) || 0);
}

function readForm(form: FormData, key: string) {
	const value = form.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

function formError(form: string, message = 'Invalid input.') {
	return fail(400, { form, error: message });
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}
