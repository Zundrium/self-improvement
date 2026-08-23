import { error, json } from '@sveltejs/kit';

import { analyzeMeal, validateAIResult } from '../../../server/meal-analysis';
import { requireOpenRouterApiKey } from '../../../server/openrouter';
import { parseMealSource } from '../../../server/meal-source';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const apiKey = requireOpenRouterApiKey(platform);

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid JSON body.');

	let source: ReturnType<typeof parseMealSource>;
	try {
		source = parseMealSource(body.image, body.description);
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'The meal details are invalid.');
	}

	try {
		const raw = await analyzeMeal(
			source.image?.base64 ?? '',
			source.image?.mimeType ?? '',
			source.description,
			apiKey
		);
		return json({ estimate: validateAIResult(raw) });
	} catch (cause) {
		error(502, cause instanceof Error ? cause.message : 'AI analysis failed.');
	}
};
