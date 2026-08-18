import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const target = new URL('selfimprovement://reset-password');
	for (const key of ['token', 'error']) {
		const value = url.searchParams.get(key);
		if (value) target.searchParams.set(key, value);
	}
	redirect(302, target.toString());
};
