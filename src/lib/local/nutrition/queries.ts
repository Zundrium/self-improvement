import type {
	NutritionEntryData,
	NutritionFastingStatusData,
	NutritionLogData
} from '$lib/app/model';
import { dateKeysEndingAt, isValidDateKey } from '$lib/trackers/dates';
import { trackerProgressDays } from '$lib/trackers/progress';
import type { LocalAppState, LocalAppStore } from '../state';
import { sumEntries } from '../nutrition';

type Fail = (status: number, message: string) => Error;
export type NutritionQueryContext = { store: LocalAppStore; today: string; fail: Fail };

export async function log(
	context: NutritionQueryContext,
	requestedDate: string
): Promise<NutritionLogData> {
	const date = requestedDate === 'today' ? context.today : requestedDate;
	if (!isValidDateKey(date) || date > context.today)
		throw context.fail(400, 'Choose a valid date that is not in the future.');
	const progressDates = dateKeysEndingAt(shiftDate(date, 2), 5);
	const state = await context.store.readNutritionDay(date, progressDates);
	const profile = state.nutrition.profile;
	if (!profile) throw context.fail(409, 'Nutrition setup required.');
	const entries = state.nutrition.entries
		.filter((entry) => entry.date === date)
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	return {
		date,
		today: context.today,
		entries,
		totals: sumEntries(entries),
		calorieGoal: profile.dailyCalorieGoal,
		eatingWindow: profile.eatingWindowEnabled
			? { start: profile.eatingWindowStart, end: profile.eatingWindowEnd }
			: null,
		fasting: state.nutrition.fastingDates.includes(date),
		trackedDates: trackedDates(state, date),
		progressDays: trackerProgressDays(
			date,
			context.today,
			(day) => sumEntries(state.nutrition.entries.filter((entry) => entry.date === day)).calories
		)
	};
}

export async function entry(
	context: NutritionQueryContext,
	entryId: string
): Promise<NutritionEntryData> {
	const value = (await context.store.readNutritionEntry(entryId)).nutrition.entries[0];
	if (!value) throw context.fail(404, 'Entry not found.');
	return { entry: value };
}

export async function fasting(
	context: NutritionQueryContext,
	date: string
): Promise<NutritionFastingStatusData> {
	if (!isValidDateKey(date) || date > context.today)
		throw context.fail(400, 'Choose a valid date.');
	return { date, fasting: await context.store.readNutritionFastingStatus(date) };
}

function trackedDates(state: LocalAppState, date: string) {
	const month = date.slice(0, 7);
	return [
		...new Set([
			...state.nutrition.entries.map((entry) => entry.date),
			...state.nutrition.fastingDates
		])
	].filter((value) => value.startsWith(month));
}
function shiftDate(value: string, days: number) {
	const date = new Date(`${value}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}
