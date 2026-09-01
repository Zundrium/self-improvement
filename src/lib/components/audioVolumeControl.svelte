<script lang="ts">
	import { Volume2, VolumeX } from '@lucide/svelte';
	import { audioVolumeState } from '$lib/audio/audio-volume.svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex items-center gap-3 px-1 py-2">
	<Button
		profile="text"
		size="small" format="icon"
		aria-label={audioVolumeState.muted ? 'Unmute audio' : 'Mute audio'}
		onclick={() => audioVolumeState.toggleMuted()}
	>
		{#if audioVolumeState.muted}<VolumeX class="size-5" />{:else}<Volume2 class="size-5" />{/if}
	</Button>
	<label class="sr-only" for="app-volume">Audio volume</label>
	<input
		id="app-volume"
		class="volume-slider h-5 min-w-0 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
		style={`--volume-progress: ${audioVolumeState.volume * 100}%`}
		type="range"
		min="0"
		max="1"
		step="0.01"
		value={audioVolumeState.volume}
		disabled={audioVolumeState.muted}
		oninput={(event) => audioVolumeState.setVolume(Number(event.currentTarget.value))}
	/>
	<span class="w-9 shrink-0 text-right text-xs text-(--text)/48 tabular-nums">
		{audioVolumeState.muted ? '—' : `${Math.round(audioVolumeState.volume * 100)}%`}
	</span>
</div>
