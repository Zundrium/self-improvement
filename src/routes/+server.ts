import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const fallback: RequestHandler = () =>
	json({ error: 'Self Improvement is an API service.' }, { status: 404 });
