<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { apiRequest } from '$lib/api';
	import type { HappinessSettingsData } from '$lib/api-types';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { happinessLabel, happinessRatings, type HappinessRating } from '../happiness';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('happiness');
	let defaultRating = $state<HappinessRating>(untrack(() => data.defaultRating));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<HappinessSettingsData>('/api/app/happiness/settings', {
				method: 'PATCH',
				body: JSON.stringify({ defaultRating })
			});
			toast.success('Happiness settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update happiness settings.');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Happiness settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/happiness" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<TrackerSection
		title="Daily check-in"
		description="Choose the happiness level selected for a new entry."
		{colors}
		trailing={actions}
	>
		<form class="space-y-6" onsubmit={saveSettings}>
			<Field>
				<FieldLabel>Default happiness level</FieldLabel>
				<div class="grid grid-cols-5 gap-2">
					{#each happinessRatings as rating (rating)}
						{@const selected = defaultRating === rating}
						<Button
							type="button"
							variant="ghost"
							class="h-12 px-0 text-base tabular-nums {selected ? 'text-white' : ''}"
							style={selected
								? `background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
								: `background: color-mix(in srgb, ${colors.primary} 12%, transparent); color: ${colors.primary}`}
							aria-pressed={selected}
							onclick={() => (defaultRating = rating)}
						>
							{rating}
						</Button>
					{/each}
				</div>
				<FieldDescription class="text-center">{happinessLabel(defaultRating)}</FieldDescription>
			</Field>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
		</form>
	</TrackerSection>
</TrackerPage>
