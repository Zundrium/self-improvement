import { error } from '@sveltejs/kit';

import { requireDb, requireUser } from '$lib/server/guards';
import {
	getDailyEntries,
	getTrackedDates,
	sumEntryTotals,
	validDate
} from '../../../server/nutrition';
import { todayIso } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const today = todayIso();
	const date = event.params.date === 'today' ? today : event.params.date;
	if (!validDate(date)) error(400, 'Use a date in YYYY-MM-DD format.');

	const { profile } = await event.parent();
	const db = requireDb(event.locals);
	const monthStart = `${date.slice(0, 7)}-01`;
	const monthEnd = endOfMonth(date);
	const [entries, trackedDates] = await Promise.all([
		getDailyEntries(db, user.id, date),
		getTrackedDates(db, user.id, monthStart, monthEnd)
	]);

	return {
		date,
		entries,
		totals: sumEntryTotals(entries),
		calorieGoal: profile.dailyCalorieGoal,
		trackedDates,
		today
	};
};

function endOfMonth(date: string) {
	const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
	value.setUTCMonth(value.getUTCMonth() + 1);
	value.setUTCDate(0);
	return value.toISOString().slice(0, 10);
}
