<script lang="ts">
	import {
		Bird,
		Bug,
		CloudRain,
		Flame,
		LoaderCircle,
		Volume2,
		VolumeX,
		WavesHorizontal,
		Wind
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { AudioManager } from '$lib/audio/audio-manager';
	import { ambientSounds } from '../sounds';

	type Props = { audioManager?: AudioManager };
	let { audioManager }: Props = $props();
	let activeSoundIds = $state<string[]>([]);
	let loadingSoundId = $state('');
	let audioError = $state('');
	let volume = $state(0.7);
	let muted = $state(false);

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

	function updateVolume() {
		audioManager?.setVolume(volume);
	}

	function toggleMute() {
		muted = !muted;
		audioManager?.setMuted(muted);
	}
</script>

<section class="space-y-6 py-3" aria-label="Ambient sounds">
	<div class="flex items-center gap-3 py-1">
		<Button
			variant="ghost"
			size="icon"
			aria-label={muted ? 'Unmute ambient sounds' : 'Mute ambient sounds'}
			onclick={toggleMute}
		>
			{#if muted}<VolumeX size={20} />{:else}<Volume2 size={20} />{/if}
		</Button>
		<label class="sr-only" for="ambient-volume">Ambient sound volume</label>
		<input
			id="ambient-volume"
			class="volume-slider h-8 min-w-0 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
			style={`--volume-progress: ${volume * 100}%`}
			type="range"
			min="0"
			max="1"
			step="0.01"
			disabled={muted}
			bind:value={volume}
			oninput={updateVolume}
		/>
	</div>

	<div class="grid grid-cols-3 gap-2">
		{#each ambientSounds as sound (sound.id)}
			{@const SoundIcon = soundIcons[sound.id]}
			{@const active = activeSoundIds.includes(sound.id)}
			<Button
				variant={active ? 'default' : 'ghost'}
				class="h-20 flex-col gap-2 rounded-2xl px-2"
				aria-label={`${active ? 'Stop' : 'Play'} ${sound.label}`}
				aria-pressed={active}
				disabled={Boolean(loadingSoundId && loadingSoundId !== sound.id)}
				onclick={() => toggleSound(sound.id)}
			>
				{#if loadingSoundId === sound.id}
					<LoaderCircle class="animate-spin" size={22} />
				{:else}
					<SoundIcon size={22} />
				{/if}
				<span class="text-xs">{sound.label}</span>
			</Button>
		{/each}
	</div>

	{#if audioError}
		<p class="text-sm text-red-600 dark:text-red-400" role="alert">{audioError}</p>
	{/if}
</section>

<style>
	.volume-slider {
		appearance: none;
		border: 0;
		background: transparent;
		outline: none;
	}

	.volume-slider::-webkit-slider-runnable-track {
		height: 0.25rem;
		border: 0;
		border-radius: 9999px;
		background: linear-gradient(
			to right,
			var(--text) 0 var(--volume-progress),
			color-mix(in srgb, var(--text) 16%, transparent) var(--volume-progress) 100%
		);
	}

	.volume-slider::-webkit-slider-thumb {
		width: 1rem;
		height: 1rem;
		margin-top: -0.375rem;
		appearance: none;
		border: 0;
		border-radius: 9999px;
		background: var(--text);
	}

	.volume-slider::-moz-range-track {
		height: 0.25rem;
		border: 0;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--text) 16%, transparent);
	}

	.volume-slider::-moz-range-progress {
		height: 0.25rem;
		border: 0;
		border-radius: 9999px;
		background: var(--text);
	}

	.volume-slider::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		border: 0;
		border-radius: 9999px;
		background: var(--text);
	}
</style>
