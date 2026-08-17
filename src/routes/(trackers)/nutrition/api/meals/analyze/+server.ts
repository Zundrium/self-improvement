import { error, json } from '@sveltejs/kit';

import { parseMealImageDataUrl } from '../../../server/meal-image';
import { analyzePicture, validateAIResult } from '../../../server/meal-analysis';
import { requireOpenRouterApiKey } from '../../../server/openrouter';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const apiKey = requireOpenRouterApiKey(platform);

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid JSON body.');

	let image: ReturnType<typeof parseMealImageDataUrl>;
	try {
		image = parseMealImageDataUrl(body.image);
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'The meal photo is invalid.');
	}

	try {
		const raw = await analyzePicture(image.base64, image.mimeType, '', apiKey);
		return json({ estimate: validateAIResult(raw) });
	} catch (cause) {
		error(502, cause instanceof Error ? cause.message : 'AI analysis failed.');
	}
};
