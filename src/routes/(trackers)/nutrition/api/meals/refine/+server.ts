import { error, json } from '@sveltejs/kit';

import {
	refineMealEstimate,
	validateAIRefinement,
	validateMealEstimate
} from '../../../server/meal-analysis';
import { requireOpenRouterApiKey } from '../../../server/openrouter';
import { parseMealSource } from '../../../server/meal-source';
import type { RequestHandler } from './$types';

const MAX_CORRECTION_LENGTH = 500;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const apiKey = requireOpenRouterApiKey(platform);

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid JSON body.');

	const correction =
		typeof body.correction === 'string'
			? body.correction.trim().slice(0, MAX_CORRECTION_LENGTH)
			: '';
	if (correction.length < 2) error(400, 'Tell us what should change in the estimate.');

	let source: ReturnType<typeof parseMealSource>;
	let estimate: ReturnType<typeof validateMealEstimate>;
	try {
		source = parseMealSource(body.image, body.description);
		estimate = validateMealEstimate(body.estimate);
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'The current meal estimate is invalid.');
	}

	try {
		const raw = await refineMealEstimate(
			source.image?.base64 ?? '',
			source.image?.mimeType ?? '',
			source.description,
			estimate,
			correction,
			apiKey
		);
		return json({ estimate: validateAIRefinement(raw) });
	} catch (cause) {
		error(502, cause instanceof Error ? cause.message : 'AI correction failed.');
	}
};
