import { error, fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { menstruationEntry } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { cycleSummary, isValidDate, periodInputFromForm } from './period';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const today = todayIso();
	const date = selectedDate(event.url, today);
	const [selectedEntries, history] = await loadEntries(requireDb(event.locals), user.id, date);
	const markedDates = history.map((entry) => entry.localDate);
	return {
		date,
		today,
		entry: selectedEntries[0] ?? null,
		markedDates,
		recentEntries: history.slice(0, 10),
		cycle: cycleSummary(markedDates, today)
	};
};

export const actions: Actions = {
	save: async (event) => {
		const user = requireUser(event);
		try {
			const input = periodInputFromForm(await event.request.formData());
			if (input.localDate > todayIso()) throw new Error('Future dates cannot be tracked.');
			await saveEntry(requireDb(event.locals), user.id, input);
			return { form: 'period', message: 'Period entry saved.' };
		} catch (cause) {
			return periodFailure(cause);
		}
	},
	delete: async (event) => {
		const user = requireUser(event);
		const localDate = String((await event.request.formData()).get('localDate') ?? '');
		if (!isValidDate(localDate))
			return fail(400, { form: 'period', error: 'Choose a valid date.' });
		await deleteEntry(requireDb(event.locals), user.id, localDate);
		return { form: 'period', message: 'Period entry removed.' };
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
		.from(menstruationEntry)
		.where(and(eq(menstruationEntry.userId, userId), eq(menstruationEntry.localDate, date)))
		.limit(1);
}

function entryHistoryQuery(db: ReturnType<typeof requireDb>, userId: string) {
	return db
		.select({ localDate: menstruationEntry.localDate, flow: menstruationEntry.flow })
		.from(menstruationEntry)
		.where(eq(menstruationEntry.userId, userId))
		.orderBy(desc(menstruationEntry.localDate))
		.limit(400);
}

async function saveEntry(
	db: ReturnType<typeof requireDb>,
	userId: string,
	input: ReturnType<typeof periodInputFromForm>
) {
	const values = { userId, ...input, updatedAt: new Date() };
	await db
		.insert(menstruationEntry)
		.values(values)
		.onConflictDoUpdate({
			target: [menstruationEntry.userId, menstruationEntry.localDate],
			set: { flow: input.flow, notes: input.notes, updatedAt: values.updatedAt }
		});
}

function deleteEntry(db: ReturnType<typeof requireDb>, userId: string, localDate: string) {
	return db
		.delete(menstruationEntry)
		.where(and(eq(menstruationEntry.userId, userId), eq(menstruationEntry.localDate, localDate)));
}

function periodFailure(cause: unknown) {
	return fail(400, {
		form: 'period',
		error: cause instanceof Error ? cause.message : 'Could not save your period entry.'
	});
}
