<script lang="ts">
import { Star } from '@lucide/svelte';
import type { HTMLAttributes } from 'svelte/elements';
import { gamificationColors } from '$lib/gamification/theme';
import GameCoinIcon from './gameCoinIcon.svelte';

let { class: className, ...restProps }: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<GameCoinIcon colors={gamificationColors.glimmers} class={className} {...restProps}>
	<Star class="size-1/2 fill-current" aria-hidden="true" />
</GameCoinIcon>
