<script lang="ts" module>
export type { GuidedRoutineSounds } from '$lib/routines/controller.svelte';
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { AudioManager } from '$lib/audio/audio-manager';
	import GuidedRoutineView from './GuidedRoutineView.svelte';
	import {
		createRoutineController,
		type GuidedRoutineSounds
	} from '$lib/routines/controller.svelte';
	import type {
		CadencedRepGuidedRoutineActivity,
		GuidedRoutineActivity
	} from '$lib/routines/model';

	interface Props {
		activities: GuidedRoutineActivity[];
		audioManager: AudioManager;
		setCount: number;
		restBetweenActivitiesSeconds: number;
		restBetweenSetsSeconds: number;
		restCountdownSeconds?: number;
		restCountdownSound?: string;
		restPeriodicTickSeconds?: number;
		sounds: GuidedRoutineSounds;
		activityLabel?: string;
		oncomplete: () => void | Promise<void>;
		oncancel: () => void;
		oncadencechange?: (
			activity: CadencedRepGuidedRoutineActivity,
			cadencePercent: number
		) => void;
		oncadencecommit?: (
			activity: CadencedRepGuidedRoutineActivity,
			cadencePercent: number
		) => void;
		onimagevariantcommit?: (activity: GuidedRoutineActivity, variantId: string) => void;
		sessionIdentity?: string;
	}

	let {
		activities,
		audioManager,
		setCount,
		restBetweenActivitiesSeconds,
		restBetweenSetsSeconds,
		restCountdownSeconds = 3,
		sounds,
		restCountdownSound = sounds.tick,
		restPeriodicTickSeconds = 10,
		activityLabel = 'Activity',
		oncomplete,
		oncancel,
		oncadencechange,
		oncadencecommit,
		onimagevariantcommit,
		sessionIdentity
	}: Props = $props();

	const controller = createRoutineController(() => ({
		activities,
		audioManager,
		setCount,
		restBetweenActivitiesSeconds,
		restBetweenSetsSeconds,
		restCountdownSeconds,
		restCountdownSound,
		restPeriodicTickSeconds,
		sounds,
		oncomplete,
		oncancel,
		oncadencechange,
		oncadencecommit,
		onimagevariantcommit,
		sessionIdentity
	}));

	onMount(controller.mount);
	onDestroy(controller.destroy);
</script>

<GuidedRoutineView {controller} activityCount={activities.length} {activityLabel} />
