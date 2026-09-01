<script lang="ts">
	import { Dumbbell } from '@lucide/svelte';
	import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '$lib/components/ui/empty';
	import { getTrackerColors, trackerGradient } from '$lib/trackers/registry';

	const colors = getTrackerColors('fitness');
</script>

<Empty class="py-20">
	<EmptyMedia
		class="dynamic-background text-(--app-on-color) shadow-sm shadow-(--app-shadow-color)/15"
		style={`--dynamic-background: ${trackerGradient(colors)}`}
	>
		<Dumbbell class="size-6" />
	</EmptyMedia>
	<EmptyTitle>Rest day</EmptyTitle>
	<EmptyDescription>The 30-day program has no workout scheduled for this date.</EmptyDescription>
</Empty>
