import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { createReward, loadRewardsData } from '$lib/server/gamification/rewards';
import { requireDb, requireUser } from '$lib/server/guards';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	return json(await loadRewardsData(requireDb(event.locals), user.id));
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	try {
		const reward = await createReward(requireDb(event.locals), user.id, await event.request.json());
		return json(reward, { status: 201 });
	} catch (cause) {
		if (cause instanceof ZodError) error(400, 'Enter a name, emoji, and valid Glimmer price.');
		throw cause;
	}
};
