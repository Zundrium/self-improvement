import { error, json } from '@sveltejs/kit';

import { requireDb } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import {
	isNutritionFastingConflict,
	markFastingDays,
	NutritionFastingInputError
} from '../../../../(trackers)/nutrition/server/fasting';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Authentication required.');
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid fasting request.');
	try {
		const dates = await markFastingDays(
			requireDb(locals),
			locals.user.id,
			body.date,
			body.days,
			todayIso()
		);
		return json({ dates }, { status: 201 });
	} catch (cause) {
		if (cause instanceof NutritionFastingInputError) error(400, cause.message);
		if (isNutritionFastingConflict(cause)) {
			error(409, cause instanceof Error ? cause.message : 'The fasting days conflict.');
		}
		throw cause;
	}
};
