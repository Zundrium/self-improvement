import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { deleteReward, RewardNotFoundError, updateReward } from '$lib/server/gamification/rewards';
import { requireDb, requireUser } from '$lib/server/guards';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async (event) => {
	const user = requireUser(event);
	try {
		return json(
			await updateReward(
				requireDb(event.locals),
				user.id,
				event.params.rewardId,
				await event.request.json()
			)
		);
	} catch (cause) {
		handleRewardError(cause);
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	try {
		await deleteReward(requireDb(event.locals), user.id, event.params.rewardId);
		return new Response(null, { status: 204 });
	} catch (cause) {
		handleRewardError(cause);
	}
};

function handleRewardError(cause: unknown): never {
	if (cause instanceof RewardNotFoundError) error(404, cause.message);
	if (cause instanceof ZodError) error(400, 'Enter a name, emoji, and valid Glimmer price.');
	throw cause;
}
