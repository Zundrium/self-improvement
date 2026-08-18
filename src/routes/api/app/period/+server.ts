import { and, desc, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { menstruationEntry } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { cycleSummary, isValidDate, periodInputFromForm } from '../../../(trackers)/period/period';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const today = todayIso();
	const date = selectedDate(event.url.searchParams.get('date'), today);
	const [selected, history] = await db.batch([
		db
			.select()
			.from(menstruationEntry)
			.where(and(eq(menstruationEntry.userId, user.id), eq(menstruationEntry.localDate, date)))
			.limit(1),
		db
			.select({ localDate: menstruationEntry.localDate, flow: menstruationEntry.flow })
			.from(menstruationEntry)
			.where(eq(menstruationEntry.userId, user.id))
			.orderBy(desc(menstruationEntry.localDate))
			.limit(400)
	]);
	const markedDates = history.map((entry) => entry.localDate);
	return json({
		date,
		today,
		entry: selected[0] ?? null,
		markedDates,
		recentEntries: history.slice(0, 10),
		cycle: cycleSummary(markedDates, today)
	});
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	try {
		const input = periodInputFromForm(toFormData(await event.request.json().catch(() => null)));
		if (input.localDate > todayIso()) error(400, 'Future dates cannot be tracked.');
		const values = { userId: user.id, ...input, updatedAt: new Date() };
		await requireDb(event.locals)
			.insert(menstruationEntry)
			.values(values)
			.onConflictDoUpdate({
				target: [menstruationEntry.userId, menstruationEntry.localDate],
				set: { flow: input.flow, notes: input.notes, updatedAt: values.updatedAt }
			});
		return json({ entry: values });
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
		error(400, cause instanceof Error ? cause.message : 'Invalid period entry.');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const localDate = event.url.searchParams.get('date') ?? '';
	if (!isValidDate(localDate)) error(400, 'Choose a valid date.');
	await requireDb(event.locals)
		.delete(menstruationEntry)
		.where(and(eq(menstruationEntry.userId, user.id), eq(menstruationEntry.localDate, localDate)));
	return json({ deleted: true });
};

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidDate(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}

function toFormData(value: unknown) {
	if (!value || typeof value !== 'object') error(400, 'Invalid period entry.');
	const body = value as Record<string, unknown>;
	const form = new FormData();
	form.set('localDate', String(body.localDate ?? ''));
	form.set('flow', String(body.flow ?? ''));
	form.set('notes', String(body.notes ?? ''));
	return form;
}
