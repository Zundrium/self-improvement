import { error } from '@sveltejs/kit';

export function requireOpenRouterApiKey(platform: App.Platform | undefined) {
	const apiKey = platform?.env.OPENROUTER_API_KEY;
	if (!apiKey) error(500, 'AI analysis is not configured.');
	return apiKey;
}
