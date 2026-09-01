import { breathingActionCandidates } from '../../routes/breathing/actions';
import { choresActionCandidates } from '../../routes/chores/actions';
import { fitnessActionCandidates } from '../../routes/fitness/actions';
import { happinessActionCandidates } from '../../routes/happiness/actions';
import { meditationActionCandidates } from '../../routes/meditation/actions';
import { nutritionActionCandidates } from '../../routes/nutrition/actions';
import { screenTimeActionCandidates } from '../../routes/screen-time/actions';
import { sleepActionCandidates } from '../../routes/sleep/actions';
import { stepActionCandidates } from '../../routes/steps/actions';
import { stretchActionCandidates } from '../../routes/stretch/actions';
import type { ActionCandidate } from './contracts';

export const actionCandidates: ActionCandidate[] = [
	...stepActionCandidates,
	...sleepActionCandidates,
	...screenTimeActionCandidates,
	...fitnessActionCandidates,
	...nutritionActionCandidates,
	...meditationActionCandidates,
	...breathingActionCandidates,
	...stretchActionCandidates,
	...choresActionCandidates,
	...happinessActionCandidates
];
