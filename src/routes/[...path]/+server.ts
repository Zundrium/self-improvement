import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const fallback: RequestHandler = () =>
	json({ error: 'API endpoint not found.' }, { status: 404 });
