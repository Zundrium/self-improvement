import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const today = new Date().toISOString().slice(0, 10);
	const date = url.searchParams.get('date') ?? today;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) redirect(307, `/nutrition/log/${today}`);
	return { date };
};
