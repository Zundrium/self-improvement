import { breathingActionCandidates } from '../../routes/breathing/actions';
import { choresActionCandidates } from '../../routes/chores/actions';
import { fitnessActionCandidates } from '../../routes/fitness/actions';
import { happinessActionCandidates } from '../../routes/happiness/actions';
import { meditationActionCandidates } from '../../routes/meditation/actions';
import { nutritionActionCandidates } from '../../routes/nutrition/actions';
import { periodActionCandidates } from '../../routes/period/actions';
import { screenTimeActionCandidates } from '../../routes/screen-time/actions';
import { sleepActionCandidates } from '../../routes/sleep/actions';
import { stepActionCandidates } from '../../routes/steps/actions';
import { stretchActionCandidates } from '../../routes/stretch/actions';
import type { ActionCandidate } from '$lib/actions/contracts';
import { appTrackers, type AppTrackerId } from '$lib/trackers/registry';

export const trackerActionCandidates = {
	steps: stepActionCandidates,
	sleep: sleepActionCandidates,
	'screen-time': screenTimeActionCandidates,
	fitness: fitnessActionCandidates,
	nutrition: nutritionActionCandidates,
	meditation: meditationActionCandidates,
	breathing: breathingActionCandidates,
	stretch: stretchActionCandidates,
	chores: choresActionCandidates,
	happiness: happinessActionCandidates,
	period: periodActionCandidates
} satisfies Record<AppTrackerId, readonly ActionCandidate[]>;

export const appActionCandidates = appTrackers.flatMap(({ id }) => trackerActionCandidates[id]);
