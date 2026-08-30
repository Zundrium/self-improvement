<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { HappinessSettingsData } from '$lib/api-types';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { happinessRatings, type HappinessRating } from '../happiness';
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

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-5">
	<Card>
		<CardHeader><CardTitle>Daily check-in</CardTitle></CardHeader>
		<CardContent>
			<Form id="happiness-settings" class="space-y-0" onsubmit={saveSettings}>
				<Field class="gap-4 sm:flex-row sm:items-center sm:justify-between">
					<FieldLabel>Default happiness level</FieldLabel>
					<div class="grid grid-cols-5 gap-2">
						{#each happinessRatings as rating (rating)}
							{@const selected = defaultRating === rating}
							<Button
								type="button"
								variant="ghost"
								size="large"
								class="tabular-nums {selected ? 'text-white' : ''}"
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
				</Field>
			</Form>
		</CardContent>
	</Card>
</TrackerPage>

<SettingsSaveBar form="happiness-settings" {saving} backHref="/happiness" />
