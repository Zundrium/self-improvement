import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => ({
	redirectTo: safeRedirect(url.searchParams.get('redirect'))
});

function safeRedirect(value: string | null) {
	return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}
