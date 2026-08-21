import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { trackerPreference } from '$lib/server/db/schema';
import { appTrackers, type AppTrackerId } from '$lib/trackers/registry';

export async function getTrackerPreferences(db: Database, userId: string) {
	const preferences = await db
		.select()
		.from(trackerPreference)
		.where(eq(trackerPreference.userId, userId));
	const enabledById = new Map(preferences.map((item) => [item.trackerId, item.enabled]));
	return appTrackers.map((tracker) => ({
		...tracker,
		enabled: enabledById.get(tracker.id) ?? tracker.defaultEnabled
	}));
}

export async function getEnabledTrackers(db: Database, userId: string) {
	const preferences = await getTrackerPreferences(db, userId);
	return preferences.filter((tracker) => tracker.enabled);
}

export async function saveTrackerPreferences(
	db: Database,
	userId: string,
	enabledIds: Set<AppTrackerId>
) {
	for (const tracker of appTrackers) {
		await savePreference(db, userId, tracker.id, enabledIds.has(tracker.id));
	}
}

async function savePreference(
	db: Database,
	userId: string,
	trackerId: AppTrackerId,
	enabled: boolean
) {
	const values = { userId, trackerId, enabled, updatedAt: new Date() };
	await db
		.insert(trackerPreference)
		.values(values)
		.onConflictDoUpdate({
			target: [trackerPreference.userId, trackerPreference.trackerId],
			set: { enabled, updatedAt: values.updatedAt }
		});
}
