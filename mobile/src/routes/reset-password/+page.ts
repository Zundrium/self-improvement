import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => ({
	token: url.searchParams.get('token') ?? '',
	tokenError: url.searchParams.has('error') ? 'The reset link is invalid or expired.' : ''
});
