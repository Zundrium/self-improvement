<script lang="ts">
import type { AudioManager } from '$lib/audio/audio-manager';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import type { MeditationCompletion, SaveState } from '../meditation';
import { meditationEnter } from '../meditationMotion';
import AmbientSounds from './ambientSounds.svelte';
import MeditationTimer from './meditationTimer.svelte';

type Props = {
	audioManager?: AudioManager;
	initialDurationSeconds: number;
	saveState: SaveState;
	oncomplete: (completion: MeditationCompletion) => void;
	onretry: () => void;
};

let { audioManager, initialDurationSeconds, saveState, oncomplete, onretry }: Props = $props();
</script>

<TrackerSection ariaLabel="Meditation practice">
	<div class="space-y-1" data-motion-page-enter="custom" use:meditationEnter>
		<MeditationTimer
			{audioManager}
			{initialDurationSeconds}
			{saveState}
			{oncomplete}
			{onretry}
		/>
		<AmbientSounds {audioManager} />
	</div>
</TrackerSection>
