import type { NutritionEntry } from '$lib/app/model';
import { isValidDateKey } from '$lib/trackers/dates';
import type { LocalAppState } from '../state';
import { createNutritionEntry, nutritionDateTime, replaceNutritionEntry } from '../nutrition';

type Fail = (status: number, message: string) => Error;
type Update = (mutator: (state: LocalAppState) => void) => Promise<LocalAppState>;

export type NutritionMutationContext = {
	today: string;
	update: Update;
	updatePlain: Update;
	fail: Fail;
};

export async function createEntry(
	context: NutritionMutationContext,
	body: Record<string, unknown>
) {
	const date = validDate(body.date, context);
	if (!Array.isArray(body.meals)) throw context.fail(400, 'Add at least one meal.');
	let entry: NutritionEntry | undefined;
	await context.update((state) => {
		if (state.nutrition.fastingDates.includes(date))
			throw context.fail(409, 'Cancel the full-day fast first.');
		entry = createNutritionEntry({
			date,
			name: body.name,
			notes: body.notes,
			createdAt: nutritionDateTime(date, String(body.time), Number(body.timeZoneOffset)),
			meals: body.meals as unknown[]
		});
		state.nutrition.entries.push(entry);
	});
	if (!entry) throw new Error('Nutrition entry was not created.');
	return { entry };
}

export async function updateEntry(
	context: NutritionMutationContext,
	entryId: string,
	body: Record<string, unknown>
) {
	validDate(body.date, context);
	let entry: NutritionEntry | undefined;
	await context.update((state) => {
		const existing = state.nutrition.entries.find(({ id }) => id === entryId);
		if (!existing) throw context.fail(404, 'Entry not found.');
		if (state.nutrition.fastingDates.includes(String(body.date)))
			throw context.fail(409, 'Cancel the full-day fast first.');
		entry = replaceNutritionEntry(existing, body);
		state.nutrition.entries = state.nutrition.entries.map((item) =>
			item.id === entryId ? (entry as NutritionEntry) : item
		);
	});
	if (!entry) throw new Error('Nutrition entry was not updated.');
	return { entry };
}

export async function deleteEntry(context: NutritionMutationContext, entryId: string) {
	let date = '';
	await context.updatePlain((state) => {
		const entry = state.nutrition.entries.find(({ id }) => id === entryId);
		if (!entry) throw context.fail(404, 'Entry not found.');
		date = entry.date;
		state.nutrition.entries = state.nutrition.entries.filter(({ id }) => id !== entryId);
	});
	return { date };
}

export async function cancelFasting(context: NutritionMutationContext, date: string) {
	await context.updatePlain((state) => {
		if (!state.nutrition.fastingDates.includes(date))
			throw context.fail(404, 'Fasting day not found.');
		state.nutrition.fastingDates = state.nutrition.fastingDates.filter((value) => value !== date);
	});
	return { date };
}

export async function markFasting(
	context: NutritionMutationContext,
	body: Record<string, unknown>
) {
	const dates = consecutiveDates(body.date, body.days, context);
	await context.update((state) => {
		if (state.nutrition.entries.some((entry) => dates.includes(entry.date)))
			throw context.fail(409, 'A fasting day already has a meal.');
		if (dates.some((date) => state.nutrition.fastingDates.includes(date)))
			throw context.fail(409, 'A day is already marked as fasting.');
		state.nutrition.fastingDates = [...state.nutrition.fastingDates, ...dates].sort();
	});
	return { dates };
}

function validDate(value: unknown, context: NutritionMutationContext) {
	const date = String(value ?? '');
	if (!isValidDateKey(date) || date > context.today)
		throw context.fail(400, 'Choose a valid date.');
	return date;
}
function consecutiveDates(value: unknown, countValue: unknown, context: NutritionMutationContext) {
	const start = validDate(value, context);
	const count = Number(countValue);
	if (!Number.isInteger(count) || count < 1 || count > 30)
		throw context.fail(400, 'Choose between 1 and 30 valid fasting days.');
	const dates = Array.from({ length: count }, (_, offset) => {
		const date = new Date(`${start}T00:00:00Z`);
		date.setUTCDate(date.getUTCDate() + offset);
		return date.toISOString().slice(0, 10);
	});
	if ((dates.at(-1) ?? '') > context.today)
		throw context.fail(400, 'Fasting days cannot be in the future.');
	return dates;
}
