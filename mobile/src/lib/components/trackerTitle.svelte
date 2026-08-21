<script lang="ts">
	import { cn } from '$lib/utils';
	import type { TrackerColors } from '$lib/trackers/registry';

	type TitledFeature = { label: string; colors: TrackerColors };
	let { tracker, class: className }: { tracker: TitledFeature; class?: string } = $props();
</script>

<h1
	class={cn('text-center text-sm font-medium', className)}
	style={`color: ${tracker.colors.primary}`}
>
	{tracker.label}
</h1>
