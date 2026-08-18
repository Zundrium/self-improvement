import { and, desc, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { happinessEntry } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { happinessInputFromForm, isValidDate } from '../../../(trackers)/happiness/happiness';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const today = todayIso();
	const date = selectedDate(event.url.searchParams.get('date'), today);
	const [selected, history] = await db.batch([
		db
			.select()
			.from(happinessEntry)
			.where(and(eq(happinessEntry.userId, user.id), eq(happinessEntry.localDate, date)))
			.limit(1),
		db
			.select({ localDate: happinessEntry.localDate, rating: happinessEntry.rating })
			.from(happinessEntry)
			.where(eq(happinessEntry.userId, user.id))
			.orderBy(desc(happinessEntry.localDate))
			.limit(400)
	]);
	return json({
		date,
		today,
		entry: selected[0] ?? null,
		markedDates: history.map((entry) => entry.localDate),
		recentEntries: history.slice(0, 10)
	});
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	try {
		const input = happinessInputFromForm(toFormData(await event.request.json().catch(() => null)));
		if (input.localDate > todayIso()) error(400, 'Future dates cannot be tracked.');
		const values = { userId: user.id, ...input, updatedAt: new Date() };
		await requireDb(event.locals)
			.insert(happinessEntry)
			.values(values)
			.onConflictDoUpdate({
				target: [happinessEntry.userId, happinessEntry.localDate],
				set: { rating: input.rating, reasons: input.reasons, updatedAt: values.updatedAt }
			});
		return json({ entry: values });
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
		error(400, cause instanceof Error ? cause.message : 'Invalid happiness entry.');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const localDate = event.url.searchParams.get('date') ?? '';
	if (!isValidDate(localDate)) error(400, 'Choose a valid date.');
	await requireDb(event.locals)
		.delete(happinessEntry)
		.where(and(eq(happinessEntry.userId, user.id), eq(happinessEntry.localDate, localDate)));
	return json({ deleted: true });
};

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidDate(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}

function toFormData(value: unknown) {
	if (!value || typeof value !== 'object') error(400, 'Invalid happiness entry.');
	const body = value as Record<string, unknown>;
	const form = new FormData();
	form.set('localDate', String(body.localDate ?? ''));
	form.set('rating', String(body.rating ?? ''));
	if (Array.isArray(body.reasons))
		for (const reason of body.reasons) form.append('reasons', String(reason));
	return form;
}
