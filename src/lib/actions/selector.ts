import type {
	ActionCandidate,
	ActionEnvironment,
	ActionFeedItem,
	ActionPriority,
	ActionProposal,
	ActionSnapshot
} from './contracts';

const priorityOrder: Record<ActionPriority, number> = {
	blocking: 0,
	warning: 1,
	activity: 2
};

export function evaluateCandidate(
	candidate: ActionCandidate,
	snapshot: ActionSnapshot,
	environment: ActionEnvironment
): ActionProposal | null {
	if (!candidate.requiredTrackerIds.every((id) => snapshot.enabledTrackerIds.includes(id)))
		return null;
	if (!candidate.conditions.every((condition) => condition(snapshot, environment))) return null;
	const resolution = candidate.resolve(snapshot, environment);
	if (!resolution || !(resolution.score > 0)) return null;
	return { ...resolution, candidateId: candidate.id, trackerIds: [...candidate.trackerIds] };
}

export function selectActionFeedItems(
	candidates: readonly ActionCandidate[],
	snapshot: ActionSnapshot,
	environment: ActionEnvironment
): ActionFeedItem[] {
	const proposals = candidates
		.map((candidate) => evaluateCandidate(candidate, snapshot, environment))
		.filter(isActionProposal)
		.toSorted(compareProposals);
	return selectProposals(proposals).map(toActionFeedItem);
}

function selectProposals(proposals: ActionProposal[]) {
	const selected: ActionProposal[] = [];
	const goalIds = new Set<string>();
	const conflictKeys = new Set<string>();
	for (const proposal of proposals) {
		if (proposal.goalId !== undefined && goalIds.has(proposal.goalId)) continue;
		if (proposal.conflictKeys?.some((key) => conflictKeys.has(key))) continue;
		selected.push(proposal);
		if (proposal.goalId !== undefined) goalIds.add(proposal.goalId);
		proposal.conflictKeys?.forEach((key) => conflictKeys.add(key));
	}
	return selected;
}

function compareProposals(left: ActionProposal, right: ActionProposal) {
	const priorityDifference = priorityOrder[left.priority] - priorityOrder[right.priority];
	if (priorityDifference) return priorityDifference;
	const scoreDifference = right.score - left.score;
	if (scoreDifference) return scoreDifference;
	return compareIds(left.candidateId, right.candidateId);
}

function compareIds(left: string, right: string) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function toActionFeedItem(proposal: ActionProposal): ActionFeedItem {
	const { candidateId, goalId, conflictKeys, score, ...item } = proposal;
	return item;
}

function isActionProposal(proposal: ActionProposal | null): proposal is ActionProposal {
	return proposal !== null;
}
