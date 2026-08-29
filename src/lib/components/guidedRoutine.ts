export type GuidedRoutineActivityId = string | number;

export type GuidedRoutineImageVariant = {
	id: string;
	label: string;
	imageUrl: string;
};

interface GuidedRoutineActivityBase {
	id: GuidedRoutineActivityId;
	name: string;
	imageUrl: string;
	imageVariants?: GuidedRoutineImageVariant[];
	selectedImageVariantId?: string;
	detail?: string;
	instruction?: string;
	voiceUrl?: string;
	repeats?: number;
}

export interface TimedGuidedRoutineActivity extends GuidedRoutineActivityBase {
	type: 'timed';
	durationSeconds: number;
}

export interface CadencedRepGuidedRoutineActivity extends GuidedRoutineActivityBase {
	type: 'cadenced-reps';
	reps: number;
	cadencePercent: number;
	cadenceKey?: GuidedRoutineActivityId;
}

export interface ManualRepGuidedRoutineActivity extends GuidedRoutineActivityBase {
	type: 'manual-reps';
	reps: number;
}

export type GuidedRoutineActivity =
	| TimedGuidedRoutineActivity
	| CadencedRepGuidedRoutineActivity
	| ManualRepGuidedRoutineActivity;

export interface GuidedRoutinePosition {
	setIndex: number;
	activityIndex: number;
	activityRepeatIndex: number;
}

export function activityRepeatCount(activity: GuidedRoutineActivity): number {
	return Math.max(1, Math.floor(activity.repeats ?? 1));
}

export function repDurationMs(cadencePercent: number): number {
	return 2000 / (cadencePercent / 100);
}

export function activityDurationMs(
	activity: GuidedRoutineActivity,
	cadencePercent = activity.type === 'cadenced-reps' ? activity.cadencePercent : undefined
): number | null {
	if (activity.type === 'manual-reps') return null;
	if (activity.type === 'timed') return activity.durationSeconds * 1000;
	return activity.reps * repDurationMs(cadencePercent ?? activity.cadencePercent);
}

export function initialRoutinePosition(): GuidedRoutinePosition {
	return { setIndex: 0, activityIndex: 0, activityRepeatIndex: 0 };
}

export function nextRoutinePosition(
	activities: GuidedRoutineActivity[],
	setCount: number,
	position: GuidedRoutinePosition
): GuidedRoutinePosition | null {
	const activity = activities[position.activityIndex];
	if (!activity) return null;
	if (position.activityRepeatIndex + 1 < activityRepeatCount(activity)) {
		return { ...position, activityRepeatIndex: position.activityRepeatIndex + 1 };
	}
	if (position.activityIndex + 1 < activities.length) {
		return {
			setIndex: position.setIndex,
			activityIndex: position.activityIndex + 1,
			activityRepeatIndex: 0
		};
	}
	if (position.setIndex + 1 < Math.max(1, Math.floor(setCount))) {
		return { setIndex: position.setIndex + 1, activityIndex: 0, activityRepeatIndex: 0 };
	}
	return null;
}
