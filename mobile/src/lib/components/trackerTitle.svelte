<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Tracker } from '$lib/trackers/registry';

	let { tracker, class: className }: { tracker: Tracker; class?: string } = $props();
</script>

<h1
	class={cn('text-center text-sm font-medium', className)}
	style={`color: ${tracker.colors.primary}`}
>
	{tracker.label}
</h1>
