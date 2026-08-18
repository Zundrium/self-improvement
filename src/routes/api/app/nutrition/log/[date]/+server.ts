import { error, json } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import {
	getDailyEntries,
	getTrackedDates,
	sumEntryTotals,
	validDate
} from '../../../../../(trackers)/nutrition/server/nutrition';
import { getProfile } from '../../../../../(trackers)/nutrition/server/profiles';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const today = todayIso();
	const date = event.params.date === 'today' ? today : event.params.date;
	if (!validDate(date) || date > today)
		error(400, 'Choose a valid date that is not in the future.');
	const monthStart = `${date.slice(0, 7)}-01`;
	const [profile, entries, trackedDates] = await Promise.all([
		getProfile(db, user.id),
		getDailyEntries(db, user.id, date),
		getTrackedDates(db, user.id, monthStart, endOfMonth(date))
	]);
	if (!profile) error(409, 'Nutrition setup required.');
	return json({
		date,
		entries,
		totals: sumEntryTotals(entries),
		calorieGoal: profile.dailyCalorieGoal,
		trackedDates,
		today
	});
};

function endOfMonth(date: string) {
	const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
	value.setUTCMonth(value.getUTCMonth() + 1);
	value.setUTCDate(0);
	return value.toISOString().slice(0, 10);
}
