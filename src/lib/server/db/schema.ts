import * as authSchema from './auth.schema';
import * as trackerPreferenceSchema from './tracker-preference';
import * as fitnessSchema from './trackers/fitness';
import * as happinessSchema from './trackers/happiness';
import * as meditationSchema from './trackers/meditation';
import * as nutritionSchema from './trackers/nutrition';
import * as periodSchema from './trackers/period';
import * as stepsSchema from './trackers/steps';

export * from './auth.schema';
export * from './tracker-preference';
export * from './trackers/fitness';
export * from './trackers/happiness';
export * from './trackers/meditation';
export * from './trackers/nutrition';
export * from './trackers/period';
export * from './trackers/steps';

export const schema = {
	...authSchema,
	...trackerPreferenceSchema,
	...fitnessSchema,
	...happinessSchema,
	...meditationSchema,
	...nutritionSchema,
	...periodSchema,
	...stepsSchema
};
