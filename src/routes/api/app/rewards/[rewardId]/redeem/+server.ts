import { error, json } from '@sveltejs/kit';
import {
	InsufficientGlimmersError,
	redeemReward,
	RewardNotFoundError
} from '$lib/server/gamification/rewards';
import { requireDb, requireUser } from '$lib/server/guards';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	try {
		return json(await redeemReward(requireDb(event.locals), user.id, event.params.rewardId), {
			status: 201
		});
	} catch (cause) {
		if (cause instanceof RewardNotFoundError) error(404, cause.message);
		if (cause instanceof InsufficientGlimmersError) error(409, cause.message);
		throw cause;
	}
};
