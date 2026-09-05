<script lang="ts">
import type { AudioManager } from '$lib/audio/audio-manager';
import GuidedRoutineRunner, {
	type GuidedRoutineSounds
} from '$lib/components/routines/GuidedRoutineRunner.svelte';
import { apiRequest } from '$lib/api';
import { toast } from '$lib/components/ui/toast';
import { Button } from '$lib/components/ui/button';
import type { CadencedRepGuidedRoutineActivity, GuidedRoutineActivity } from '$lib/routines/model';
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
let cadenceFailure = $state<{ activity: CadencedRepGuidedRoutineActivity; speedPercent: number }>();
let savingCadence = $state(false);
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
	const submitted = speedPercent;
	savingCadence = true;
	cadenceFailure = undefined;
	try {
		await apiRequest(`/api/app/fitness/exercises/${workoutActivity.exerciseId}/speed`, {
			method: 'PUT',
			body: JSON.stringify({ speedPercent: submitted })
		});
		toast.success('Exercise speed updated.');
	} catch (error) {
		console.error('Exercise speed save failed:', error);
		cadenceFailure = { activity, speedPercent: submitted };
	} finally {
		savingCadence = false;
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
	sessionIdentity={`workout:${workout.id}:${setCount}:${workout.activities.map((activity) => `${activity.id}:${activity.type === 'reps' ? activity.speedPercent : ''}`).join('|')}`}
	{oncomplete}
	{oncancel}
	oncadencechange={handleCadenceChange}
	oncadencecommit={saveCadence}
/>

{#if cadenceFailure}
	<div class="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-(--app-surface) p-3 text-sm shadow-lg" role="alert">
		<span>Speed was not saved.</span>
		<Button size="small" profile="highlighted" disabled={savingCadence} onclick={() => cadenceFailure && saveCadence(cadenceFailure.activity, cadenceFailure.speedPercent)}>Retry</Button>
	</div>
{/if}
