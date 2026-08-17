import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, url }) => {
	const suffix = params.path ? `/${params.path}` : '';
	redirect(308, `/meditation${suffix}${url.search}`);
};
