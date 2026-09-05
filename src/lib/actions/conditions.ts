import type { AppTrackerId } from '$lib/trackers/registry';
import type {
	ActionCondition,
	ActionEnvironment,
	ActionSnapshot,
	TrackerActionStates
} from './contracts';

export function trackerStateCondition<TrackerId extends AppTrackerId>(
	trackerId: TrackerId,
	condition: (
		state: TrackerActionStates[TrackerId],
		environment: ActionEnvironment,
		snapshot: ActionSnapshot
	) => boolean
): ActionCondition {
	return (snapshot, environment) => condition(snapshot.trackers[trackerId], environment, snapshot);
}

export function trackerDateIsLocalDate(trackerId: AppTrackerId): ActionCondition {
	return trackerStateCondition(
		trackerId,
		(state, environment) => state.date === environment.localDate
	);
}

export function localMinuteIsAtLeast(minute: number): ActionCondition {
	return (_snapshot, environment) => environment.localMinuteOfDay >= minute;
}

export function localMinuteIsBefore(minute: number): ActionCondition {
	return (_snapshot, environment) => environment.localMinuteOfDay < minute;
}
