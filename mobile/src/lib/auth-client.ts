import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';
import { API_BASE_URL, mobileRepository, saveAuthToken } from '$lib/api';

export const authClient = createAuthClient({
	baseURL: API_BASE_URL,
	basePath: '/api/auth',
	plugins: [adminClient()],
	fetchOptions: {
		auth: {
			type: 'Bearer',
			token: async () => (await mobileRepository.loadCredentials())?.token
		},
		onResponse: async ({ response }) => {
			const token = response.headers.get('set-auth-token');
			if (token) await saveAuthToken(token);
		}
	}
});

export async function signOut() {
	await authClient.signOut();
	await mobileRepository.disconnect();
}
