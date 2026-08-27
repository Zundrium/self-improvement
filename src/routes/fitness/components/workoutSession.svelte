<script lang="ts">
import type { AudioManager } from '$lib/audio/audio-manager';
import GuidedRoutineRunner, {
	type GuidedRoutineSounds
} from '$lib/components/guidedRoutineRunner.svelte';
import { apiRequest } from '$lib/api';
import type {
	CadencedRepGuidedRoutineActivity,
	GuidedRoutineActivity
} from '$lib/components/guidedRoutine';
import type { Workout, WorkoutActivity } from '../fitness';

interface Props {
	workout: Workout;
	audioManager: AudioManager;
	setCount: number;
	oncomplete: () => void | Promise<void>;
	oncancel: () => void;
	onspeedchange: (exerciseId: number, speedPercent: number) => void;
}

let { workout, audioManager, setCount, oncomplete, oncancel, onspeedchange }: Props = $props();
const activities = $derived(workout.activities.map(toGuidedRoutineActivity));

const sounds: GuidedRoutineSounds = {
	tick: '/fitness/audio/second_tick.m4a',
	start: '/fitness/audio/activity_start_ping.m4a',
	complete: '/fitness/audio/complete.m4a',
	intro: '/fitness/audio/intro.m4a',
	beep: '/fitness/audio/beep.m4a',
	missionComplete: '/fitness/audio/voice/heart/mission-completed.m4a',
	nextActivity: '/fitness/audio/voice/heart/next-activity-is.m4a',
	number: (value) => `/fitness/audio/voice/heart/${value}.m4a`
};

function toGuidedRoutineActivity(activity: WorkoutActivity): GuidedRoutineActivity {
	return activity.type === 'reps'
		? {
				id: activity.id,
				name: activity.name,
				imageUrl: activity.imageUrl,
				voiceUrl: activityVoiceUrl(activity),
				type: 'cadenced-reps',
				reps: activity.amount,
				cadencePercent: activity.speedPercent,
				cadenceKey: activity.exerciseId
			}
		: {
				id: activity.id,
				name: activity.name,
				imageUrl: activity.imageUrl,
				voiceUrl: activityVoiceUrl(activity),
				type: 'timed',
				durationSeconds: activity.amount
			};
}

function activityVoiceUrl(activity: WorkoutActivity): string {
	return activity.imageUrl
		.replace('/fitness/activities/', '/fitness/audio/voice/heart/')
		.replace(/\.webp$/, '.m4a');
}

function handleCadenceChange(activity: CadencedRepGuidedRoutineActivity, speedPercent: number) {
	const workoutActivity = repActivityFor(activity.id);
	if (workoutActivity) onspeedchange(workoutActivity.exerciseId, speedPercent);
}

async function saveCadence(activity: CadencedRepGuidedRoutineActivity, speedPercent: number) {
	const workoutActivity = repActivityFor(activity.id);
	if (!workoutActivity) return;
	try {
		await apiRequest(`/api/app/fitness/exercises/${workoutActivity.exerciseId}/speed`, {
			method: 'PUT',
			body: JSON.stringify({ speedPercent })
		});
	} catch (error) {
		console.error('Exercise speed save failed:', error);
	}
}

function repActivityFor(activityId: string | number) {
	const activity = workout.activities.find((candidate) => candidate.id === activityId);
	return activity?.type === 'reps' ? activity : undefined;
}
</script>

<GuidedRoutineRunner
	{activities}
	{audioManager}
	{setCount}
	restBetweenActivitiesSeconds={workout.restBetweenExercises}
	restBetweenSetsSeconds={workout.restBetweenSets}
	{sounds}
	activityLabel="Exercise"
	{oncomplete}
	{oncancel}
	oncadencechange={handleCadenceChange}
	oncadencecommit={saveCadence}
/>
