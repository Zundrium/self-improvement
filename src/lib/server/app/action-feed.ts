import { sortActionFeed, type ActionFeedItem } from '$lib/server/action-feed';
import type { Database } from '$lib/server/db';
import { getEnabledTrackers } from '$lib/server/trackers/preferences';
import type { AppTrackerId } from '$lib/trackers/registry';
import { getBreathingActions } from '../../../routes/(trackers)/breathing/server/actions';
import { getFitnessActions } from '../../../routes/(trackers)/fitness/server/actions';
import { getHappinessActions } from '../../../routes/(trackers)/happiness/server/actions';
import { getMeditationActions } from '../../../routes/(trackers)/meditation/server/actions';
import { getNutritionActions } from '../../../routes/(trackers)/nutrition/server/actions';
import { getScreenTimeActions } from '../../../routes/(trackers)/screen-time/server/actions';
import { getSleepActions } from '../../../routes/(trackers)/sleep/server/actions';
import { getStepActions } from '../../../routes/(trackers)/steps/server/actions';
import { loadDaySummary } from './day-summary';

type DaySummary = Awaited<ReturnType<typeof loadDaySummary>>;
type ActionContext = { now: Date; timeZone: string };
type ActionProvider = (summary: DaySummary, context: ActionContext) => ActionFeedItem[];

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
	nutrition: (summary, context) =>
		getNutritionActions({
			date: summary.date,
			today: summary.today,
			fasting: summary.nutritionFasting,
			eatingWindow: summary.nutritionEatingWindow,
			now: context.now,
			timeZone: context.timeZone
		}),
	meditation: (summary) => getMeditationActions(summary.date, summary.meditationDone),
	breathing: (summary) => getBreathingActions(summary.date, summary.breathingDone),
	happiness: (summary) => getHappinessActions(summary.date, summary.happinessRating !== null)
};

export async function loadActionFeed(
	db: Database,
	userId: string,
	requestedDate: string | null,
	requestedTimeZone?: string,
	now = new Date()
) {
	const [daySummary, enabledTrackers] = await Promise.all([
		loadDaySummary(db, userId, requestedDate, requestedTimeZone, now),
		getEnabledTrackers(db, userId)
	]);
	const trackerIds = enabledTrackers.map(({ id }) => id);
	const context = { now, timeZone: daySummary.timeZone };
	const items = dateActionItems(buildActionItems(daySummary, trackerIds, context), daySummary);
	return { date: daySummary.date, daySummary, items };
}

export function dateActionItems(
	items: ActionFeedItem[],
	summary: Pick<DaySummary, 'date' | 'today'>
) {
	if (summary.date === summary.today) return items;
	return items.map((item) => withSelectedDate(item, summary.date));
}

function withSelectedDate(item: ActionFeedItem, date: string): ActionFeedItem {
	if (
		item.action.type !== 'navigate' ||
		item.action.href.startsWith('/android-data-help') ||
		item.action.href.includes(date)
	) {
		return item;
	}
	const separator = item.action.href.includes('?') ? '&' : '?';
	return {
		...item,
		action: { ...item.action, href: `${item.action.href}${separator}date=${date}` }
	};
}

export function buildActionItems(
	summary: DaySummary,
	trackerIds: AppTrackerId[],
	context: ActionContext = { now: new Date(), timeZone: summary.timeZone ?? 'UTC' }
) {
	const items = trackerIds.flatMap(
		(trackerId) => actionProviders[trackerId]?.(summary, context) ?? []
	);
	return sortActionFeed(items);
}
