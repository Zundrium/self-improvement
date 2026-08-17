import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	token: url.searchParams.get('token') ?? '',
	tokenError: url.searchParams.has('error') ? 'The reset link is invalid or expired.' : ''
});
