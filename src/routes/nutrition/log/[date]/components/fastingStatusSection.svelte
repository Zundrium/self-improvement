<script lang="ts">
import { MoonStar } from '@lucide/svelte';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '$lib/components/ui/empty';
import { getTrackerColors } from '$lib/trackers/registry';

const colors = getTrackerColors('nutrition');
</script>

<TrackerSection ariaLabel="Fasting status">
	<Empty class="min-h-80 bg-(--bg-elevated) sm:min-h-96">
		<EmptyMedia class="dynamic-color bg-(--text)/5" style={`--dynamic-color: ${colors.primary}`}>
			<MoonStar />
		</EmptyMedia>
		<EmptyTitle>Full-day fast</EmptyTitle>
		<EmptyDescription>
			Meals are paused for this date. Cancel the fasting day before adding or moving a meal here.
		</EmptyDescription>
	</Empty>
</TrackerSection>
