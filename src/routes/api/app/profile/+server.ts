import { error, json } from '@sveltejs/kit';
import { listRewards } from '$lib/server/gamification/rewards';
import { getTrackerPreferences, saveTrackerPreferences } from '$lib/server/trackers/preferences';
import { isAppTrackerId, type AppTrackerId } from '$lib/trackers/registry';
import { getSleepConnection } from '../../../(trackers)/sleep/server/sleep';
import { DEFAULT_SLEEP_GOAL_MINUTES } from '../../../(trackers)/sleep/sleep';
import {
	estimatedTdee,
	getProfile,
	profileInputFromForm,
	saveProfile
} from '../../../(trackers)/nutrition/server/profiles';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const [nutritionProfile, trackerPreferences, sleepConnection, rewards] = await Promise.all([
		getProfile(locals.db, locals.user.id),
		getTrackerPreferences(locals.db, locals.user.id),
		getSleepConnection(locals.db, locals.user.id),
		listRewards(locals.db, locals.user.id)
	]);
	return json({
		profileUser: locals.user,
		nutritionProfile,
		trackerPreferences,
		sleepGoalMinutes: sleepConnection?.dailyGoalMinutes ?? DEFAULT_SLEEP_GOAL_MINUTES,
		estimatedTdee: estimatedTdee(nutritionProfile),
		rewards
	});
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid profile.');
	if (Array.isArray(body.trackers)) {
		const enabledIds = new Set(
			body.trackers.map(String).filter((value): value is AppTrackerId => isAppTrackerId(value))
		);
		await saveTrackerPreferences(locals.db, locals.user.id, enabledIds);
		return json({ message: 'Tracker visibility updated.' });
	}
	try {
		const input = profileInputFromForm(profileForm(body));
		await saveProfile(locals.db, locals.user.id, input);
		return json({ message: 'Nutrition profile updated.' });
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'Could not save the nutrition profile.');
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const input = profileInputFromForm(profileForm(body));
		await saveProfile(locals.db, locals.user.id, { ...input, goalMode: 'estimated' });
		return json({ message: 'Nutrition profile created.' }, { status: 201 });
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'Could not create the nutrition profile.');
	}
};

function profileForm(body: Record<string, unknown>) {
	const form = new FormData();
	for (const key of [
		'weightKg',
		'heightCm',
		'age',
		'gender',
		'activityLevel',
		'goalMode',
		'customGoal'
	]) {
		form.set(key, String(body[key] ?? ''));
	}
	return form;
}
