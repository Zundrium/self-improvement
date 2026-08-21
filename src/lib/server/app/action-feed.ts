import { sortActionFeed, type ActionFeedItem } from '$lib/server/action-feed';
import type { Database } from '$lib/server/db';
import { getEnabledTrackers } from '$lib/server/trackers/preferences';
import type { AppTrackerId } from '$lib/trackers/registry';
import { getBreathingActions } from '../../../routes/(trackers)/breathing/server/actions';
import { getFitnessActions } from '../../../routes/(trackers)/fitness/server/actions';
import { getHappinessActions } from '../../../routes/(trackers)/happiness/server/actions';
import { getMeditationActions } from '../../../routes/(trackers)/meditation/server/actions';
import { getScreenTimeActions } from '../../../routes/(trackers)/screen-time/server/actions';
import { getSleepActions } from '../../../routes/(trackers)/sleep/server/actions';
import { getStepActions } from '../../../routes/(trackers)/steps/server/actions';
import { loadDaySummary } from './day-summary';

type DaySummary = Awaited<ReturnType<typeof loadDaySummary>>;
type ActionProvider = (summary: DaySummary) => ActionFeedItem[];

const actionProviders: Partial<Record<AppTrackerId, ActionProvider>> = {
	steps: (summary) => getStepActions(summary.stepsHaveMeasurements),
	sleep: (summary) => getSleepActions(summary.sleepHasMeasurements),
	'screen-time': (summary) =>
		getScreenTimeActions({
			date: summary.date,
			minutes: summary.screenTimeMinutes,
			limitMinutes: summary.screenTimeLimitMinutes,
			recorded: summary.screenTimeRecorded,
			hasMeasurements: summary.screenTimeHasMeasurements
		}),
	fitness: (summary) =>
		getFitnessActions({
			date: summary.date,
			done: summary.fitnessDone,
			workoutTitle: summary.fitnessWorkoutTitle
		}),
	meditation: (summary) => getMeditationActions(summary.date, summary.meditationDone),
	breathing: (summary) => getBreathingActions(summary.date, summary.breathingDone),
	happiness: (summary) => getHappinessActions(summary.date, summary.happinessRating !== null)
};

export async function loadActionFeed(db: Database, userId: string) {
	const [daySummary, enabledTrackers] = await Promise.all([
		loadDaySummary(db, userId, null),
		getEnabledTrackers(db, userId)
	]);
	const trackerIds = enabledTrackers.map(({ id }) => id);
	return { date: daySummary.date, daySummary, items: buildActionItems(daySummary, trackerIds) };
}

export function buildActionItems(summary: DaySummary, trackerIds: AppTrackerId[]) {
	const items = trackerIds.flatMap((trackerId) => actionProviders[trackerId]?.(summary) ?? []);
	return sortActionFeed(items);
}
