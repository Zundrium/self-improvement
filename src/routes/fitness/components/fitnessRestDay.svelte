<script lang="ts">
	import { Dumbbell } from '@lucide/svelte';
	import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '$lib/components/ui/empty';
	import { getTrackerColors, trackerGradient } from '$lib/trackers/registry';

	const colors = getTrackerColors('fitness');
</script>

<Empty class="py-20">
	<EmptyMedia
		class="text-white shadow-sm shadow-black/15"
		style={`background: ${trackerGradient(colors)}`}
	>
		<Dumbbell class="size-6" />
	</EmptyMedia>
	<EmptyTitle>Rest day</EmptyTitle>
	<EmptyDescription>The 30-day program has no workout scheduled for this date.</EmptyDescription>
</Empty>
