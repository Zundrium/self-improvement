import * as authSchema from './auth.schema';
import * as gamificationSchema from './gamification';
import * as trackerPreferenceSchema from './tracker-preference';
import * as breathingSchema from './trackers/breathing';
import * as fitnessSchema from './trackers/fitness';
import * as happinessSchema from './trackers/happiness';
import * as meditationSchema from './trackers/meditation';
import * as nutritionSchema from './trackers/nutrition';
import * as periodSchema from './trackers/period';
import * as screenTimeSchema from './trackers/screen-time';
import * as sleepSchema from './trackers/sleep';
import * as stepsSchema from './trackers/steps';

export * from './auth.schema';
export * from './gamification';
export * from './tracker-preference';
export * from './trackers/breathing';
export * from './trackers/fitness';
export * from './trackers/happiness';
export * from './trackers/meditation';
export * from './trackers/nutrition';
export * from './trackers/period';
export * from './trackers/screen-time';
export * from './trackers/sleep';
export * from './trackers/steps';

export const schema = {
	...authSchema,
	...gamificationSchema,
	...trackerPreferenceSchema,
	...breathingSchema,
	...fitnessSchema,
	...happinessSchema,
	...meditationSchema,
	...nutritionSchema,
	...periodSchema,
	...screenTimeSchema,
	...sleepSchema,
	...stepsSchema
};
