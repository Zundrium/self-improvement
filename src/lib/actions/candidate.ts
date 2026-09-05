import type { AppTrackerId } from '$lib/trackers/registry';
import type {
	ActionCandidate,
	ActionCandidateResult,
	ActionCondition,
	ActionEnvironment,
	ActionSnapshot
} from './contracts';

export type ActionCandidateDefinition = {
	id: string;
	trackerIds: readonly AppTrackerId[];
	requires?: readonly AppTrackerId[];
	conditions?: readonly ActionCondition[];
	resolve(snapshot: ActionSnapshot, environment: ActionEnvironment): ActionCandidateResult | null;
};

export function defineActionCandidate(definition: ActionCandidateDefinition): ActionCandidate {
	return {
		id: definition.id,
		trackerIds: definition.trackerIds,
		requiredTrackerIds: requiredTrackerIds(definition),
		conditions: definition.conditions ?? [],
		resolve(snapshot, environment) {
			const result = definition.resolve(snapshot, environment);
			if (!result) return null;
			const { instanceId, icon = 'tracker', ...resolution } = result;
			return {
				...resolution,
				id: instanceId ? `${definition.id}:${instanceId}` : definition.id,
				icon
			};
		}
	};
}

function requiredTrackerIds(definition: ActionCandidateDefinition) {
	return [...new Set([...definition.trackerIds, ...(definition.requires ?? [])])];
}
