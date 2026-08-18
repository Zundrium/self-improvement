import { eq } from 'drizzle-orm';
import { androidCompanionTimeZoneSchema } from '$lib/android-companion/pairing';
import type { Database } from '$lib/server/db';
import { screenTimeConnection } from '$lib/server/db/trackers/screen-time';
import { sleepConnection } from '$lib/server/db/trackers/sleep';
import { stepConnection } from '$lib/server/db/trackers/steps';
import { hashStepToken } from '../../../routes/(trackers)/steps/server/steps';

export class InvalidCompanionTokenError extends Error {}

export async function updateAndroidCompanionTimeZone(
	db: Database,
	stepToken: string,
	requestedTimeZone: string
) {
	const timeZone = androidCompanionTimeZoneSchema.parse(requestedTimeZone);
	const tokenHash = await hashStepToken(stepToken);
	const userId = companionUserId(db, tokenHash);
	const updatedAt = new Date();
	const [updatedSteps] = await db.batch([
		updateStepTimeZone(db, tokenHash, timeZone, updatedAt),
		updateSleepTimeZone(db, userId, timeZone, updatedAt),
		updateScreenTimeTimeZone(db, userId, timeZone, updatedAt)
	]);
	if (!updatedSteps.length) throw new InvalidCompanionTokenError();
	return timeZone;
}

function companionUserId(db: Database, tokenHash: string) {
	return db
		.select({ userId: stepConnection.userId })
		.from(stepConnection)
		.where(eq(stepConnection.companionTokenHash, tokenHash))
		.limit(1);
}

function updateStepTimeZone(db: Database, tokenHash: string, timeZone: string, updatedAt: Date) {
	return db
		.update(stepConnection)
		.set({ companionTimeZone: timeZone, updatedAt })
		.where(eq(stepConnection.companionTokenHash, tokenHash))
		.returning({ userId: stepConnection.userId });
}

function updateSleepTimeZone(
	db: Database,
	userId: ReturnType<typeof companionUserId>,
	timeZone: string,
	updatedAt: Date
) {
	return db
		.update(sleepConnection)
		.set({ companionTimeZone: timeZone, updatedAt })
		.where(eq(sleepConnection.userId, userId));
}

function updateScreenTimeTimeZone(
	db: Database,
	userId: ReturnType<typeof companionUserId>,
	timeZone: string,
	updatedAt: Date
) {
	return db
		.update(screenTimeConnection)
		.set({ companionTimeZone: timeZone, updatedAt })
		.where(eq(screenTimeConnection.userId, userId));
}
