<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { PeriodSettingsData } from '$lib/api-types';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldDescription, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { flowLabel, flowOptions, type MenstruationFlow } from '../period';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('period');
	let defaultFlow = $state<MenstruationFlow>(untrack(() => data.defaultFlow));
	let fallbackCycleDays = $state(untrack(() => data.fallbackCycleDays));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<PeriodSettingsData>('/api/app/period/settings', {
				method: 'PATCH',
				body: JSON.stringify({ defaultFlow, fallbackCycleDays })
			});
			toast.success('Period settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update period settings.');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Period settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<TrackerSection
		title="Cycle defaults"
		description="Set the starting values used when you log a period."
		{colors}
	>
		<form class="space-y-6" onsubmit={saveSettings}>
			<FieldGroup>
				<Field>
					<FieldLabel>Default flow</FieldLabel>
					<Select type="single" bind:value={defaultFlow}>
						<SelectTrigger class="w-full">{flowLabel(defaultFlow)}</SelectTrigger>
						<SelectContent>
							{#each flowOptions as option (option.value)}
								<SelectItem value={option.value}>{option.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</Field>
				<Field>
					<FieldLabel for="fallback-cycle-days">Cycle length estimate (days)</FieldLabel>
					<Input
						id="fallback-cycle-days"
						type="number"
						min={15}
						max={60}
						bind:value={fallbackCycleDays}
						required
					/>
					<FieldDescription>Used until your saved history can calculate an average.</FieldDescription>
				</Field>
			</FieldGroup>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
		</form>
	</TrackerSection>
</TrackerPage>
