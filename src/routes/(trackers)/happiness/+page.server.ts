import { error, fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { happinessEntry } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { happinessInputFromForm, isValidDate } from './happiness';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const today = todayIso();
	const date = selectedDate(event.url, today);
	const [selectedEntries, history] = await loadEntries(requireDb(event.locals), user.id, date);
	return {
		date,
		today,
		entry: selectedEntries[0] ?? null,
		markedDates: history.map((entry) => entry.localDate),
		recentEntries: history.slice(0, 10)
	};
};

export const actions: Actions = {
	save: async (event) => {
		const user = requireUser(event);
		try {
			const input = happinessInputFromForm(await event.request.formData());
			if (input.localDate > todayIso()) throw new Error('Future dates cannot be tracked.');
			await saveEntry(requireDb(event.locals), user.id, input);
			return { form: 'happiness', message: 'Happiness entry saved.' };
		} catch (cause) {
			return happinessFailure(cause);
		}
	},
	delete: async (event) => {
		const user = requireUser(event);
		const localDate = String((await event.request.formData()).get('localDate') ?? '');
		if (!isValidDate(localDate)) {
			return fail(400, { form: 'happiness', error: 'Choose a valid date.' });
		}
		await deleteEntry(requireDb(event.locals), user.id, localDate);
		return { form: 'happiness', message: 'Happiness entry removed.' };
	}
};

function selectedDate(url: URL, today: string) {
	const date = url.searchParams.get('date') ?? today;
	if (!isValidDate(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}

function loadEntries(db: ReturnType<typeof requireDb>, userId: string, date: string) {
	return db.batch([selectedEntryQuery(db, userId, date), entryHistoryQuery(db, userId)]);
}

function selectedEntryQuery(db: ReturnType<typeof requireDb>, userId: string, date: string) {
	return db
		.select()
		.from(happinessEntry)
		.where(and(eq(happinessEntry.userId, userId), eq(happinessEntry.localDate, date)))
		.limit(1);
}

function entryHistoryQuery(db: ReturnType<typeof requireDb>, userId: string) {
	return db
		.select({ localDate: happinessEntry.localDate, rating: happinessEntry.rating })
		.from(happinessEntry)
		.where(eq(happinessEntry.userId, userId))
		.orderBy(desc(happinessEntry.localDate))
		.limit(400);
}

async function saveEntry(
	db: ReturnType<typeof requireDb>,
	userId: string,
	input: ReturnType<typeof happinessInputFromForm>
) {
	const values = { userId, ...input, updatedAt: new Date() };
	await db
		.insert(happinessEntry)
		.values(values)
		.onConflictDoUpdate({
			target: [happinessEntry.userId, happinessEntry.localDate],
			set: { rating: input.rating, reasons: input.reasons, updatedAt: values.updatedAt }
		});
}

function deleteEntry(db: ReturnType<typeof requireDb>, userId: string, localDate: string) {
	return db
		.delete(happinessEntry)
		.where(and(eq(happinessEntry.userId, userId), eq(happinessEntry.localDate, localDate)));
}

function happinessFailure(cause: unknown) {
	return fail(400, {
		form: 'happiness',
		error: cause instanceof Error ? cause.message : 'Could not save your happiness entry.'
	});
}
