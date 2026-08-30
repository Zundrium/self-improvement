<script lang="ts">
	import { Bird, Bug, CloudRain, Flame, LoaderCircle, WavesHorizontal, Wind } from '@lucide/svelte';
	import type { AudioManager } from '$lib/audio/audio-manager';
import { Pressable } from '$lib/components/ui/pressable';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { ambientSounds } from '../sounds';

	let { audioManager }: { audioManager?: AudioManager } = $props();
	const colors = getTrackerColors('meditation');
	let activeSoundIds = $state<string[]>([]);
	let loadingSoundId = $state('');
	let audioError = $state('');
	const soundIcons = {
		rain: CloudRain,
		wind: Wind,
		birds: Bird,
		waterstream: WavesHorizontal,
		fire: Flame,
		crickets: Bug
	};

	async function toggleSound(id: (typeof ambientSounds)[number]['id']) {
		if (!audioManager || loadingSoundId) return;
		loadingSoundId = id;
		audioError = '';
		try {
			setSoundActive(id, await audioManager.toggleLoop(id));
		} catch {
			audioError = 'This sound could not be played.';
		} finally {
			loadingSoundId = '';
		}
	}

	function setSoundActive(id: string, active: boolean) {
		activeSoundIds = active
			? [...activeSoundIds.filter((soundId) => soundId !== id), id]
			: activeSoundIds.filter((soundId) => soundId !== id);
	}
</script>

<section class="space-y-4 pb-3" aria-label="Ambient sounds">
	<div class="grid grid-cols-3 gap-2">
		{#each ambientSounds as sound (sound.id)}
			{@const SoundIcon = soundIcons[sound.id]}
			{@const active = activeSoundIds.includes(sound.id)}
			<Pressable
				class="h-auto flex-col items-center justify-center gap-2 bg-transparent px-1 py-2 hover:bg-transparent"
				data-meditation-sound
				aria-label={`${active ? 'Stop' : 'Play'} ${sound.label}`}
				aria-pressed={active}
				disabled={Boolean(loadingSoundId && loadingSoundId !== sound.id)}
				onclick={() => toggleSound(sound.id)}
			>
				<span
					class="flex size-14 items-center justify-center rounded-2xl {active
						? 'text-white shadow-sm shadow-black/15'
						: 'bg-(--text)/6 text-(--text)/56'}"
					style={active
						? `background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
						: undefined}
				>
					{#if loadingSoundId === sound.id}
						<LoaderCircle class="size-6" data-motion-spin />
					{:else}
						<SoundIcon class="size-7" />
					{/if}
				</span>
				<span class="text-xs font-medium">{sound.label}</span>
			</Pressable>
		{/each}
	</div>

	{#if audioError}
		<p class="text-sm text-red-600 dark:text-red-400" role="alert">{audioError}</p>
	{/if}
</section>
