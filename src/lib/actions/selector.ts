import { appTrackers } from '$lib/trackers/registry';
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
	const baselines = proposals.filter((proposal) => proposal.fallback);
	const terminalTrackers = new Set(
		baselines
			.filter(({ status }) => status === 'complete' || status === 'rest' || status === 'attention')
			.flatMap(({ trackerIds }) => trackerIds)
	);
	const contextual = proposals.filter(
		(proposal) =>
			!proposal.fallback &&
			(proposal.priority !== 'activity' ||
				!proposal.trackerIds.some((id) => terminalTrackers.has(id)))
	);
	const selected = selectProposals(contextual);
	const covered = new Set(selected.flatMap(({ trackerIds }) => trackerIds));
	for (const baseline of baselines) {
		if (baseline.trackerIds.some((id) => covered.has(id))) continue;
		selected.push(
			baseline.status === 'attention' ? { ...baseline, priority: 'warning', score: 80 } : baseline
		);
		baseline.trackerIds.forEach((id) => covered.add(id));
	}
	return selected.toSorted(compareProposals).map((proposal) => {
		const baseline = baselines.find((item) => item.trackerIds[0] === proposal.trackerIds[0]);
		return toActionFeedItem({
			...proposal,
			status:
				proposal.status ??
				(proposal.priority === 'warning' || proposal.priority === 'blocking'
					? 'attention'
					: (baseline?.status ?? 'actionable'))
		});
	});
}

function selectProposals(proposals: ActionProposal[]) {
	const selected: ActionProposal[] = [];
	const trackerIds = new Set<string>();
	const goalIds = new Set<string>();
	const conflictKeys = new Set<string>();
	for (const proposal of proposals) {
		if (proposal.trackerIds.some((id) => trackerIds.has(id))) continue;
		if (proposal.goalId !== undefined && goalIds.has(proposal.goalId)) continue;
		if (proposal.conflictKeys?.some((key) => conflictKeys.has(key))) continue;
		selected.push(proposal);
		proposal.trackerIds.forEach((id) => trackerIds.add(id));
		if (proposal.goalId !== undefined) goalIds.add(proposal.goalId);
		proposal.conflictKeys?.forEach((key) => conflictKeys.add(key));
	}
	return selected;
}

function compareProposals(left: ActionProposal, right: ActionProposal) {
	const priorityDifference = priorityOrder[left.priority] - priorityOrder[right.priority];
	if (priorityDifference) return priorityDifference;
	const settled = (proposal: ActionProposal) =>
		proposal.status === 'complete' || proposal.status === 'rest';
	const statusDifference = Number(settled(left)) - Number(settled(right));
	if (statusDifference) return statusDifference;
	const scoreDifference = right.score - left.score;
	if (scoreDifference) return scoreDifference;
	if (left.fallback && right.fallback) {
		const passive = (proposal: ActionProposal) =>
			appTrackers.find(({ id }) => id === proposal.trackerIds[0])?.kind === 'passive';
		const kindDifference = Number(passive(left)) - Number(passive(right));
		if (kindDifference) return kindDifference;
	}
	return compareIds(left.candidateId, right.candidateId);
}

function compareIds(left: string, right: string) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function toActionFeedItem(proposal: ActionProposal): ActionFeedItem {
	const { candidateId, goalId, conflictKeys, score, fallback, ...item } = proposal;
	return item;
}

function isActionProposal(proposal: ActionProposal | null): proposal is ActionProposal {
	return proposal !== null;
}
